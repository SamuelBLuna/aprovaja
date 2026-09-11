import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Circle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Questao } from '../lib/types'

interface QuestionCardProps {
 questao: Questao
 turmaId?: string | null
 tentativaId?: string | null
 onRespondida?: (correta: boolean) => void
 textoBase?: string | null
 materiaNome?: string | null
 topicoNome?: string | null
 permitirRepetir?: boolean
}

export default function QuestionCard({
 questao, turmaId, tentativaId, onRespondida, textoBase, materiaNome, topicoNome, permitirRepetir,
}: QuestionCardProps) {
 const { profile } = useAuth()
 const [respondida, setRespondida] = useState(false)
 const [escolha, setEscolha] = useState<string | null>(null)
 const [correta, setCorreta] = useState(false)
 const [verificando, setVerificando] = useState(!permitirRepetir)
 const [inicio] = useState(Date.now())

 useEffect(() => {
 if (permitirRepetir || !profile) { setVerificando(false); return }
 let cancelado = false

 async function verificarRespostaAnterior() {
 let query = supabase.from('respostas').select('resposta_dada, correta').eq('aluno_id', profile!.id).eq('questao_id', questao.id)
 if (tentativaId) query = query.eq('tentativa_id', tentativaId)
 const { data } = await query.order('created_at', { ascending: false }).limit(1)
 if (cancelado) return
 const anterior = data?.[0]
 if (anterior) {
 setEscolha(anterior.resposta_dada)
 setCorreta(anterior.correta)
 setRespondida(true)
 }
 setVerificando(false)
 }

 verificarRespostaAnterior()
 return () => { cancelado = true }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [questao.id, tentativaId])

 async function responder(valor: string) {
 if (respondida || !profile) return
 setEscolha(valor)
 const acertou = valor === questao.resposta_correta
 setCorreta(acertou)
 setRespondida(true)
 const tempoGasto = Math.round((Date.now() - inicio) / 1000)

 await supabase.from('respostas').insert({
 aluno_id: profile.id,
 questao_id: questao.id,
 turma_id: turmaId || null,
 tentativa_id: tentativaId || null,
 resposta_dada: valor,
 correta: acertou,
 tempo_gasto_segundos: tempoGasto,
 })

 onRespondida?.(acertou)
 }

 const difColor = questao.nivel_dificuldade === 3 ? 'text-erro' : questao.nivel_dificuldade === 2 ? 'text-gold-dark' : 'text-acerto'
 const difLabel = questao.nivel_dificuldade === 3 ? 'Difícil' : questao.nivel_dificuldade === 2 ? 'Média' : 'Fácil'

 if (verificando) {
 return (
 <div className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
 <div className="h-3 w-24 bg-slate-100 rounded mb-4" />
 <div className="h-4 w-full bg-slate-100 rounded mb-2" />
 <div className="h-4 w-4/5 bg-slate-100 rounded" />
 </div>
 )
 }

 return (
 <div className={`bg-white border rounded-xl p-5 transition-colors ${
 respondida ? (correta ? 'border-acerto/25' : 'border-erro/25') : 'border-slate-200'
 }`}>
 {(materiaNome || topicoNome) && (
 <div className="flex items-center flex-wrap gap-1.5 mb-3">
 {materiaNome && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[11px] font-medium">{materiaNome}</span>}
 {topicoNome && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[11px] font-medium">{topicoNome}</span>}
 <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${difColor} bg-current/10`}>{difLabel}</span>
 </div>
 )}
 {textoBase && (
 <div className="bg-paper border border-slate-200 rounded-lg p-4 mb-4 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
 {textoBase}
 </div>
 )}
 <p className="text-[15px] text-slate-800 mb-4 leading-relaxed">{questao.enunciado}</p>

 {questao.tipo === 'multipla_escolha' ? (
 <div className="space-y-2">
 {(questao.alternativas || []).map((alt) => {
 const isEscolha = escolha === alt.id
 const isCorreta = alt.id === questao.resposta_correta
 let estilo = 'border-slate-200 hover:border-ink-light/40 hover:bg-slate-50'
 if (respondida && isCorreta) estilo = 'border-acerto bg-acerto-light'
 else if (respondida && isEscolha && !isCorreta) estilo = 'border-erro bg-erro-light'
 return (
 <button
 key={alt.id}
 disabled={respondida}
 onClick={() => responder(alt.id)}
 className={`w-full text-left border rounded-lg px-3.5 py-3 text-sm flex items-center gap-3 transition-colors ${estilo} disabled:cursor-default`}
 >
 {respondida && isCorreta ? <CheckCircle2 className="w-4 h-4 text-acerto shrink-0" /> :
 respondida && isEscolha ? <XCircle className="w-4 h-4 text-erro shrink-0" /> :
 <Circle className="w-4 h-4 text-slate-300 shrink-0" />}
 <span className="font-medium text-slate-400 shrink-0">{alt.id}</span>
 <span className="text-slate-700">{alt.texto}</span>
 </button>
 )
 })}
 </div>
 ) : (
 <div className="flex gap-2">
 {['V', 'F'].map((v) => {
 const isEscolha = escolha === v
 const isCorreta = v === questao.resposta_correta
 let estilo = 'border-slate-200 hover:border-ink-light/40 hover:bg-slate-50'
 if (respondida && isCorreta) estilo = 'border-acerto bg-acerto-light'
 else if (respondida && isEscolha && !isCorreta) estilo = 'border-erro bg-erro-light'
 return (
 <button key={v} disabled={respondida} onClick={() => responder(v)}
 className={`flex-1 border rounded-lg px-3 py-3 text-sm font-medium transition-colors ${estilo} disabled:cursor-default`}>
 {v === 'V' ? 'Verdadeiro' : 'Falso'}
 </button>
 )
 })}
 </div>
 )}

 {respondida && (
 <div className={`mt-4 text-sm rounded-lg px-4 py-3 ${correta ? 'bg-acerto-light text-acerto' : 'bg-erro-light text-erro'}`}>
 <p className="font-medium">{correta ? '✓ Você acertou.' : `✕ Você errou. A resposta correta é ${questao.resposta_correta}.`}</p>
 {questao.explicacao && <p className="text-slate-600 mt-1.5 font-normal">{questao.explicacao}</p>}
 </div>
 )}
 </div>
 )
}
