import { useState, FormEvent } from 'react'
import { QuestaoTipo, Alternativa } from '../lib/types'

const LETRAS = ['A', 'B', 'C', 'D', 'E']

export interface QuestaoFormValues {
  tipo: QuestaoTipo
  enunciado: string
  alternativas: Alternativa[] | null
  resposta_correta: string
  explicacao: string | null
  nivel_dificuldade: 1 | 2 | 3
}

interface QuestaoFormProps {
  initial?: Partial<QuestaoFormValues>
  onSubmit: (values: QuestaoFormValues) => Promise<void> | void
  onCancel?: () => void
  submitLabel?: string
  resetAfterSubmit?: boolean
}

function alternativasIniciais(initial?: Partial<QuestaoFormValues>): Alternativa[] {
  if (initial?.alternativas && initial.alternativas.length > 0) return initial.alternativas
  return LETRAS.slice(0, 4).map((id) => ({ id, texto: '' }))
}

export default function QuestaoForm({ initial, onSubmit, onCancel, submitLabel, resetAfterSubmit }: QuestaoFormProps) {
  const [tipo, setTipo] = useState<QuestaoTipo>(initial?.tipo || 'multipla_escolha')
  const [enunciado, setEnunciado] = useState(initial?.enunciado || '')
  const [alternativas, setAlternativas] = useState<Alternativa[]>(alternativasIniciais(initial))
  const [respostaCorreta, setRespostaCorreta] = useState(initial?.resposta_correta || (initial?.tipo === 'verdadeiro_falso' ? 'V' : 'A'))
  const [explicacao, setExplicacao] = useState(initial?.explicacao || '')
  const [dificuldade, setDificuldade] = useState<1 | 2 | 3>(initial?.nivel_dificuldade || 2)
  const [salvando, setSalvando] = useState(false)

  function resetar() {
    setEnunciado(''); setAlternativas(LETRAS.slice(0, 4).map((id) => ({ id, texto: '' })))
    setRespostaCorreta(tipo === 'verdadeiro_falso' ? 'V' : 'A'); setExplicacao(''); setDificuldade(2)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!enunciado.trim()) return
    setSalvando(true)
    await onSubmit({
      tipo,
      enunciado: enunciado.trim(),
      alternativas: tipo === 'multipla_escolha' ? alternativas.filter((a) => a.texto.trim()) : null,
      resposta_correta: respostaCorreta,
      explicacao: explicacao.trim() || null,
      nivel_dificuldade: dificuldade,
    })
    setSalvando(false)
    if (resetAfterSubmit) resetar()
  }

  function updateAlternativaTexto(id: string, texto: string) {
    setAlternativas((prev) => prev.map((a) => (a.id === id ? { ...a, texto } : a)))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-4 items-center">
        <label className="text-sm text-ink/70">Tipo:</label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" checked={tipo === 'multipla_escolha'} onChange={() => { setTipo('multipla_escolha'); setRespostaCorreta('A') }} /> Múltipla escolha (A-E)
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" checked={tipo === 'verdadeiro_falso'} onChange={() => { setTipo('verdadeiro_falso'); setRespostaCorreta('V') }} /> Verdadeiro ou Falso
        </label>
      </div>

      <textarea required value={enunciado} onChange={(e) => setEnunciado(e.target.value)} rows={3} placeholder="Enunciado da questão"
        className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm focus:border-gold" />

      {tipo === 'multipla_escolha' ? (
        <div className="space-y-2">
          {alternativas.map((alt) => (
            <div key={alt.id} className="flex items-center gap-2">
              <input type="radio" name="correta" checked={respostaCorreta === alt.id} onChange={() => setRespostaCorreta(alt.id)} />
              <span className="w-5 text-sm text-ink/60">{alt.id}</span>
              <input value={alt.texto} onChange={(e) => updateAlternativaTexto(alt.id, e.target.value)}
                placeholder={`Alternativa ${alt.id}`}
                className="flex-1 border border-ink/15 rounded-lg px-3 py-1.5 text-sm focus:border-gold" />
            </div>
          ))}
          {alternativas.length < 5 && (
            <button type="button" onClick={() => setAlternativas((prev) => [...prev, { id: LETRAS[prev.length], texto: '' }])}
              className="text-sm text-gold hover:underline">+ adicionar alternativa {LETRAS[alternativas.length]}</button>
          )}
        </div>
      ) : (
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm"><input type="radio" checked={respostaCorreta === 'V'} onChange={() => setRespostaCorreta('V')} /> Verdadeiro</label>
          <label className="flex items-center gap-1.5 text-sm"><input type="radio" checked={respostaCorreta === 'F'} onChange={() => setRespostaCorreta('F')} /> Falso</label>
        </div>
      )}

      <textarea value={explicacao} onChange={(e) => setExplicacao(e.target.value)} rows={2} placeholder="Explicação da resposta (opcional, aparece depois que o aluno responde)"
        className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm focus:border-gold" />

      <div className="flex items-center gap-2">
        <label className="text-sm text-ink/70">Dificuldade:</label>
        <select value={dificuldade} onChange={(e) => setDificuldade(Number(e.target.value) as 1 | 2 | 3)} className="border border-ink/15 rounded-lg px-2 py-1 text-sm bg-white">
          <option value={1}>Fácil</option>
          <option value={2}>Média</option>
          <option value={3}>Difícil</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button disabled={salvando} className="bg-ink text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-ink-light transition-colors shadow-soft disabled:opacity-50">
          {salvando ? 'Salvando…' : (submitLabel || 'Salvar questão')}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="text-ink/60 text-sm hover:underline">Cancelar</button>}
      </div>
    </form>
  )
}
