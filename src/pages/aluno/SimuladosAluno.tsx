import { useEffect, useState, useRef } from 'react'
import { ClipboardList } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Simulado, SimuladoTentativa, Questao } from '../../lib/types'
import QuestionCard from '../../components/QuestionCard'
import SemTurma from '../../components/SemTurma'
import { usePossuiTurma } from '../../lib/usePossuiTurma'

type SimuladoComTurma = Simulado & { turmas?: { nome: string } }
type QuestaoComExtra = Questao & { grupos_questoes?: { texto_base: string } | null; materias?: { nome: string } | null }

interface RespostaDetalhe {
 questao_id: string
 resposta_dada: string
 correta: boolean
 questoes: QuestaoComExtra
}

function formatarTempo(segundos: number) {
 const s = Math.max(0, Math.floor(segundos))
 const m = Math.floor(s / 60)
 const r = s % 60
 return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export default function SimuladosAluno() {
 const { profile } = useAuth()
 const possuiTurma = usePossuiTurma()
 const [simulados, setSimulados] = useState<SimuladoComTurma[]>([])
 const [tentativas, setTentativas] = useState<Record<string, SimuladoTentativa>>({})
 const [emAndamento, setEmAndamento] = useState<{ simulado: SimuladoComTurma; tentativa: SimuladoTentativa; questoes: QuestaoComExtra[] } | null>(null)
 const [tempoRestante, setTempoRestante] = useState(0)
 const [respondidas, setRespondidas] = useState<Set<string>>(new Set())

 const [verDetalhesId, setVerDetalhesId] = useState<string | null>(null)
 const [detalhes, setDetalhes] = useState<Record<string, RespostaDetalhe[]>>({})

 // referências pro controle do cronômetro pausável
 const acumuladoRef = useRef(0) // segundos já usados ANTES desta sessão de visualização
 const sessaoInicioRef = useRef(0) // "agora" (corrigido pelo servidor) quando esta sessão começou
 const offsetServidorRef = useRef(0)
 const tentativaIdRef = useRef<string | null>(null)
 const duracaoSegundosRef = useRef(0)
 const flushandoRef = useRef(false)

 useEffect(() => { carregar() }, [profile])

 async function carregar() {
 if (!profile) return
 const { data } = await supabase.from('simulados').select('*, turmas(nome)').order('created_at', { ascending: false })
 setSimulados((data as any) || [])
 const { data: tents } = await supabase.from('simulado_tentativas').select('*').eq('aluno_id', profile.id)
 const map: Record<string, SimuladoTentativa> = {}
 for (const t of (tents as SimuladoTentativa[]) || []) map[t.simulado_id] = t
 setTentativas(map)
 }

 async function iniciarOuContinuar(sim: SimuladoComTurma) {
 if (!profile) return
 let tentativa = tentativas[sim.id]

 if (!tentativa && sim.data_limite && new Date(sim.data_limite) < new Date()) {
 alert('O prazo para fazer este simulado já passou.')
 return
 }

 if (!tentativa) {
 const { data, error } = await supabase.from('simulado_tentativas').insert({ simulado_id: sim.id, aluno_id: profile.id }).select().single()
 if (error || !data) return
 tentativa = data as SimuladoTentativa
 setTentativas((prev) => ({ ...prev, [sim.id]: tentativa }))
 }
 if (tentativa.finalizado_em) return // já finalizado, não reabre

 const { data: sq } = await supabase.from('simulado_questoes').select('ordem, questoes(*, grupos_questoes(texto_base), materias(nome))').eq('simulado_id', sim.id).order('ordem')
 const questoes = (sq || []).map((r: any) => r.questoes).filter(Boolean)

 const { data: jaRespondidas } = await supabase.from('respostas').select('questao_id').eq('tentativa_id', tentativa.id)
 setRespondidas(new Set((jaRespondidas || []).map((r: any) => r.questao_id)))

 setEmAndamento({ simulado: sim, tentativa, questoes })
 }

 // Cronômetro que PAUSA quando o aluno sai da tela: só o tempo em que ele
 // está ativamente vendo o simulado conta pro limite. O relógio do
 // servidor (não o do computador do aluno) é usado como referência.
 useEffect(() => {
 if (!emAndamento) return
 let cancelado = false
 let intervalId: number | undefined
 let flushIntervalId: number | undefined

 async function persistirTempoUsado(segundosNestaSessao: number) {
 const novoTotal = Math.min(duracaoSegundosRef.current, acumuladoRef.current + segundosNestaSessao)
 await supabase.from('simulado_tentativas').update({ tempo_usado_segundos: novoTotal }).eq('id', tentativaIdRef.current)
 }

 async function configurar() {
 const clienteAntes = Date.now()
 const { data: horaServidor } = await supabase.rpc('hora_atual')
 const clienteDepois = Date.now()
 const offsetMs = horaServidor ? new Date(horaServidor).getTime() - (clienteAntes + clienteDepois) / 2 : 0
 if (cancelado || !emAndamento) return

 offsetServidorRef.current = offsetMs
 acumuladoRef.current = emAndamento.tentativa.tempo_usado_segundos || 0
 duracaoSegundosRef.current = emAndamento.simulado.tempo_limite_minutos * 60
 tentativaIdRef.current = emAndamento.tentativa.id
 sessaoInicioRef.current = Date.now() + offsetMs

 function atualizar() {
 const agora = Date.now() + offsetServidorRef.current
 const decorridoNestaSessao = Math.max(0, Math.round((agora - sessaoInicioRef.current) / 1000))
 const restante = Math.max(0, duracaoSegundosRef.current - acumuladoRef.current - decorridoNestaSessao)
 setTempoRestante(restante)
 if (restante <= 0) {
 if (intervalId) window.clearInterval(intervalId)
 if (flushIntervalId) window.clearInterval(flushIntervalId)
 persistirTempoUsado(decorridoNestaSessao).then(() => finalizar())
 }
 }

 atualizar()
 intervalId = window.setInterval(atualizar, 1000)

 // salva o progresso a cada 10s, pra não perder tudo se o navegador fechar de repente
 flushIntervalId = window.setInterval(() => {
 const decorrido = Math.max(0, Math.round((Date.now() + offsetServidorRef.current - sessaoInicioRef.current) / 1000))
 persistirTempoUsado(decorrido)
 }, 10000)
 }

 configurar()

 // ao sair da tela do simulado (navegar pra outro lugar, fechar, etc),
 // salva o tempo usado até aqui — é isso que "pausa" o cronômetro
 return () => {
 cancelado = true
 if (intervalId) window.clearInterval(intervalId)
 if (flushIntervalId) window.clearInterval(flushIntervalId)
 if (tentativaIdRef.current && !flushandoRef.current) {
 const decorrido = Math.max(0, Math.round((Date.now() + offsetServidorRef.current - sessaoInicioRef.current) / 1000))
 persistirTempoUsado(decorrido)
 }
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [emAndamento?.tentativa.id])

 async function finalizar() {
 if (!emAndamento || flushandoRef.current) return
 flushandoRef.current = true
 const { tentativa } = emAndamento
 const { data: respostas } = await supabase.from('respostas').select('correta').eq('tentativa_id', tentativa.id)
 const acertos = respostas?.filter((r: any) => r.correta).length || 0
 const erros = (respostas?.length || 0) - acertos

 const decorrido = Math.max(0, Math.round((Date.now() + offsetServidorRef.current - sessaoInicioRef.current) / 1000))
 const tempoTotal = Math.min(duracaoSegundosRef.current, acumuladoRef.current + decorrido)

 await supabase.from('simulado_tentativas').update({
 finalizado_em: new Date().toISOString(), tempo_total_segundos: tempoTotal, tempo_usado_segundos: tempoTotal, acertos, erros,
 }).eq('id', tentativa.id)

 setEmAndamento(null)
 flushandoRef.current = false
 carregar()
 }

 async function abrirDetalhes(tentativaId: string) {
 if (verDetalhesId === tentativaId) { setVerDetalhesId(null); return }
 setVerDetalhesId(tentativaId)
 if (!detalhes[tentativaId]) {
 const { data } = await supabase.from('respostas').select('questao_id, resposta_dada, correta, questoes(*, materias(nome))').eq('tentativa_id', tentativaId)
 setDetalhes((prev) => ({ ...prev, [tentativaId]: (data as any) || [] }))
 }
 }

 function handleRespondida(questaoId: string) {
 setRespondidas((prev) => new Set(prev).add(questaoId))
 }

 if (possuiTurma === false) return <SemTurma />

 if (emAndamento) {
 const { simulado, questoes } = emAndamento

 const blocos: { materiaNome: string; itens: { questao: QuestaoComExtra; indiceGlobal: number }[] }[] = []
 questoes.forEach((q, i) => {
 const nome = q.materias?.nome || 'Geral'
 const ultimoBloco = blocos[blocos.length - 1]
 if (!ultimoBloco || ultimoBloco.materiaNome !== nome) {
 blocos.push({ materiaNome: nome, itens: [{ questao: q, indiceGlobal: i }] })
 } else {
 ultimoBloco.itens.push({ questao: q, indiceGlobal: i })
 }
 })

 return (
 <div className="max-w-2xl">
 <div className="sticky top-0 bg-paper py-2 z-10 space-y-3">
 <div className="flex items-center justify-between">
 <h1 className="text-lg font-bold text-slate-900">{simulado.titulo}</h1>
 <div className={`font-mono text-lg px-3 py-1 rounded ${tempoRestante < 60 ? 'bg-erro/10 text-erro' : 'bg-slate-100 text-ink'}`}>
 {formatarTempo(tempoRestante)}
 </div>
 </div>
 <div className="flex flex-wrap gap-1.5 bg-white border border-slate-200 rounded-lg p-3">
 {questoes.map((q, i) => (
 <a
 key={q.id}
 href={`#questao-${i}`}
 className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-colors ${
 respondidas.has(q.id) ? 'bg-acerto text-white' : 'bg-slate-100 text-slate-500'
 }`}
 >
 {i + 1}
 </a>
 ))}
 </div>
 <p className="text-xs text-slate-400 text-right">{respondidas.size} de {questoes.length} respondidas · o cronômetro pausa se você sair desta tela</p>
 </div>

 <div className="space-y-6 mt-4">
 {blocos.map((bloco, bi) => (
 <div key={bi}>
 <h2 className="text-center font-serif text-sm tracking-widest uppercase text-slate-500 border-y border-slate-200 py-2 mb-4">
 {bloco.materiaNome}
 </h2>
 <div className="space-y-4">
 {bloco.itens.map(({ questao: q, indiceGlobal: i }) => (
 <div key={q.id} id={`questao-${i}`} className="scroll-mt-40">
 <p className="text-xs text-slate-400 mb-1">Questão {i + 1} de {questoes.length}</p>
 <QuestionCard
 questao={q}
 turmaId={simulado.turma_id}
 tentativaId={emAndamento.tentativa.id}
 textoBase={q.grupos_questoes?.texto_base}
 onRespondida={() => handleRespondida(q.id)}
 />
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 <button onClick={finalizar} className="mt-6 w-full bg-ink text-white py-2.5 rounded text-sm font-medium hover:bg-ink-light">
 Finalizar simulado
 </button>
 </div>
 )
 }

 return (
 <div>
 <h1 className="font-serif text-2xl text-ink mb-6">Simulados</h1>
 <div className="space-y-2">
 {simulados.map((s) => {
 const tentativa = tentativas[s.id]
 const finalizado = tentativa?.finalizado_em
 const detalheAberto = verDetalhesId === tentativa?.id
 return (
 <div key={s.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
 <div className="px-4 py-3 flex items-center justify-between gap-3">
 <div className="min-w-0">
 <p className="text-ink font-medium text-sm truncate">{s.titulo} <span className="text-slate-400 font-normal">— {s.turmas?.nome}</span></p>
 <p className="text-slate-500 text-xs">{s.tempo_limite_minutos} minutos</p>
 {finalizado && (
 <p className="text-xs mt-1">
 <span className="text-acerto">{tentativa.acertos} acertos</span> · <span className="text-erro">{tentativa.erros} erros</span> · tempo: {formatarTempo(tentativa.tempo_total_segundos || 0)}
 </p>
 )}
 {!finalizado && tentativa && tentativa.tempo_usado_segundos > 0 && (
 <p className="text-gold text-xs mt-1">Pausado — {formatarTempo(s.tempo_limite_minutos * 60 - tentativa.tempo_usado_segundos)} restantes</p>
 )}
 </div>
 {finalizado ? (
 <button onClick={() => abrirDetalhes(tentativa.id)} className="text-gold text-sm hover:underline shrink-0">
 {detalheAberto ? 'Fechar' : 'Ver detalhes'}
 </button>
 ) : (
 <button onClick={() => iniciarOuContinuar(s)} className="bg-ink text-white px-4 py-2.5 rounded-lg text-sm hover:bg-ink-light transition-colors shrink-0">
 {tentativa ? 'Continuar' : 'Iniciar'}
 </button>
 )}
 </div>

 {detalheAberto && (
 <div className="border-t border-slate-200 bg-paper/50 px-4 py-4 space-y-2">
 {(detalhes[tentativa.id] || []).map((r) => (
 <div key={r.questao_id} className={`rounded px-3 py-2 text-sm border ${r.correta ? 'border-acerto/30 bg-acerto/5' : 'border-erro/30 bg-erro/5'}`}>
 <div className="flex items-center gap-2 mb-1 text-xs">
 <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{r.questoes.materias?.nome}</span>
 <span className={r.correta ? 'text-acerto font-medium' : 'text-erro font-medium'}>{r.correta ? 'Acertou' : 'Errou'}</span>
 </div>
 <p className="text-ink">{r.questoes.enunciado}</p>
 <p className="text-slate-500 text-xs mt-1">
 Sua resposta: <strong>{r.resposta_dada}</strong>
 {!r.correta && <> · Correta: <strong>{r.questoes.resposta_correta}</strong></>}
 </p>
 </div>
 ))}
 {!detalhes[tentativa.id] && <p className="text-slate-400 text-sm">Carregando…</p>}
 </div>
 )}
 </div>
 )
 })}
 {simulados.length === 0 && (
 <div className="bg-slate-50 border border-slate-200 rounded-xl py-14 text-center">
 <div className="w-14 h-14 rounded-full bg-ink flex items-center justify-center mx-auto mb-4">
 <ClipboardList className="w-6 h-6 text-white" />
 </div>
 <p className="text-slate-900 font-semibold mb-1">Nenhum simulado disponível ainda</p>
 <p className="text-slate-500 text-sm">Assim que seu professor criar um simulado pra sua turma, ele aparece aqui.</p>
 </div>
)}
 </div>
 </div>
 )
}
