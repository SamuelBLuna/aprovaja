import { useEffect, useState } from 'react'
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
  // true = banco livre (pode responder de novo à vontade)
  // false (padrão) = "teste" (cronograma/simulado): trava depois da 1ª resposta
  // e restaura o resultado se o aluno sair e voltar
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

  if (verificando) {
    return <div className="bg-white border border-ink/10 rounded p-4 text-sm text-ink/40">Carregando…</div>
  }

  return (
    <div className="bg-white border border-ink/10 rounded p-4">
      {(materiaNome || topicoNome) && (
        <div className="flex items-center gap-2 mb-2 text-xs">
          {materiaNome && <span className="bg-ink/5 text-ink/70 px-2 py-0.5 rounded">{materiaNome}</span>}
          {topicoNome && <span className="bg-ink/5 text-ink/70 px-2 py-0.5 rounded">{topicoNome}</span>}
        </div>
      )}
      {textoBase && (
        <div className="bg-paper/60 border border-ink/10 rounded p-3 mb-3 text-sm text-ink/70 whitespace-pre-wrap">
          {textoBase}
        </div>
      )}
      <p className="text-sm text-ink mb-3">{questao.enunciado}</p>

      {questao.tipo === 'multipla_escolha' ? (
        <div className="space-y-1.5">
          {(questao.alternativas || []).map((alt) => {
            const isEscolha = escolha === alt.id
            const isCorreta = alt.id === questao.resposta_correta
            let estilo = 'border-ink/15 hover:bg-ink/5'
            if (respondida && isCorreta) estilo = 'border-acerto bg-acerto/10'
            else if (respondida && isEscolha && !isCorreta) estilo = 'border-erro bg-erro/10'
            return (
              <button
                key={alt.id}
                disabled={respondida}
                onClick={() => responder(alt.id)}
                className={`w-full text-left border rounded px-3 py-2 text-sm flex gap-2 ${estilo} disabled:cursor-default`}
              >
                <span className="font-medium text-ink/60">{alt.id})</span>
                <span className="text-ink">{alt.texto}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="flex gap-2">
          {['V', 'F'].map((v) => {
            const isEscolha = escolha === v
            const isCorreta = v === questao.resposta_correta
            let estilo = 'border-ink/15 hover:bg-ink/5'
            if (respondida && isCorreta) estilo = 'border-acerto bg-acerto/10'
            else if (respondida && isEscolha && !isCorreta) estilo = 'border-erro bg-erro/10'
            return (
              <button key={v} disabled={respondida} onClick={() => responder(v)}
                className={`flex-1 border rounded px-3 py-2 text-sm ${estilo} disabled:cursor-default`}>
                {v === 'V' ? 'Verdadeiro' : 'Falso'}
              </button>
            )
          })}
        </div>
      )}

      {respondida && (
        <div className={`mt-3 text-sm rounded px-3 py-2 ${correta ? 'bg-acerto/10 text-acerto' : 'bg-erro/10 text-erro'}`}>
          {correta ? 'Você acertou.' : `Você errou. A resposta correta é ${questao.resposta_correta}.`}
          {questao.explicacao && <p className="text-ink/70 mt-1">{questao.explicacao}</p>}
        </div>
      )}
    </div>
  )
}
