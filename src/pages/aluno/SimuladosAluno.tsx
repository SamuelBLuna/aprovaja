import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Simulado, SimuladoTentativa, Questao } from '../../lib/types'
import QuestionCard from '../../components/QuestionCard'
import SemTurma from '../../components/SemTurma'
import { usePossuiTurma } from '../../lib/usePossuiTurma'

type SimuladoComTurma = Simulado & { turmas?: { nome: string } }

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
  const [emAndamento, setEmAndamento] = useState<{ simulado: SimuladoComTurma; tentativa: SimuladoTentativa; questoes: (Questao & { grupos_questoes?: { texto_base: string } | null })[] } | null>(null)
  const [tempoRestante, setTempoRestante] = useState(0)
  const intervalRef = useRef<number | null>(null)

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
    if (!tentativa) {
      const { data, error } = await supabase.from('simulado_tentativas').insert({ simulado_id: sim.id, aluno_id: profile.id }).select().single()
      if (error || !data) return
      tentativa = data as SimuladoTentativa
      setTentativas((prev) => ({ ...prev, [sim.id]: tentativa }))
    }
    if (tentativa.finalizado_em) return // já finalizado, não reabre

    const { data: sq } = await supabase.from('simulado_questoes').select('ordem, questoes(*, grupos_questoes(texto_base))').eq('simulado_id', sim.id).order('ordem')
    const questoes = (sq || []).map((r: any) => r.questoes).filter(Boolean)

    const decorrido = (Date.now() - new Date(tentativa.iniciado_em).getTime()) / 1000
    const restante = sim.tempo_limite_minutos * 60 - decorrido
    setTempoRestante(Math.max(0, restante))
    setEmAndamento({ simulado: sim, tentativa, questoes })
  }

  useEffect(() => {
    if (!emAndamento) return
    intervalRef.current = window.setInterval(() => {
      setTempoRestante((t) => {
        if (t <= 1) {
          finalizar()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emAndamento?.tentativa.id])

  async function finalizar() {
    if (!emAndamento) return
    if (intervalRef.current) window.clearInterval(intervalRef.current)
    const { tentativa } = emAndamento
    const { data: respostas } = await supabase.from('respostas').select('correta').eq('tentativa_id', tentativa.id)
    const acertos = respostas?.filter((r: any) => r.correta).length || 0
    const erros = (respostas?.length || 0) - acertos
    const tempoTotal = Math.round((Date.now() - new Date(tentativa.iniciado_em).getTime()) / 1000)

    await supabase.from('simulado_tentativas').update({
      finalizado_em: new Date().toISOString(), tempo_total_segundos: tempoTotal, acertos, erros,
    }).eq('id', tentativa.id)

    setEmAndamento(null)
    carregar()
  }

  if (possuiTurma === false) return <SemTurma />

  if (emAndamento) {
    const { simulado, questoes } = emAndamento
    return (
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-paper py-2 z-10">
          <h1 className="font-serif text-xl text-ink">{simulado.titulo}</h1>
          <div className={`font-mono text-lg px-3 py-1 rounded ${tempoRestante < 60 ? 'bg-erro/10 text-erro' : 'bg-ink/5 text-ink'}`}>
            {formatarTempo(tempoRestante)}
          </div>
        </div>
        <div className="space-y-4">
          {questoes.map((q, i) => (
            <div key={q.id}>
              <p className="text-xs text-ink/40 mb-1">Questão {i + 1} de {questoes.length}</p>
              <QuestionCard questao={q} turmaId={simulado.turma_id} tentativaId={emAndamento.tentativa.id} textoBase={q.grupos_questoes?.texto_base} />
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
          return (
            <div key={s.id} className="bg-white border border-ink/10 rounded px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-ink font-medium text-sm">{s.titulo} <span className="text-ink/40 font-normal">— {s.turmas?.nome}</span></p>
                <p className="text-ink/50 text-xs">{s.tempo_limite_minutos} minutos</p>
                {finalizado && (
                  <p className="text-xs mt-1">
                    <span className="text-acerto">{tentativa.acertos} acertos</span> · <span className="text-erro">{tentativa.erros} erros</span> · tempo: {formatarTempo(tentativa.tempo_total_segundos || 0)}
                  </p>
                )}
              </div>
              {finalizado ? (
                <span className="text-ink/40 text-sm">Concluído</span>
              ) : (
                <button onClick={() => iniciarOuContinuar(s)} className="bg-ink text-white px-4 py-2 rounded text-sm hover:bg-ink-light">
                  {tentativa ? 'Continuar' : 'Iniciar'}
                </button>
              )}
            </div>
          )
        })}
        {simulados.length === 0 && <p className="text-ink/50 text-sm">Nenhum simulado disponível ainda.</p>}
      </div>
    </div>
  )
}
