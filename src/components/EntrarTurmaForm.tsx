import { useState, FormEvent } from 'react'
import { supabase } from '../lib/supabase'

interface EntrarTurmaFormProps {
  onSuccess?: () => void
  titulo?: string
}

export default function EntrarTurmaForm({ onSuccess, titulo }: EntrarTurmaFormProps) {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!codigo.trim()) return
    setLoading(true)
    setErro(null)
    const { error } = await supabase.rpc('entrar_na_turma', { p_codigo: codigo.trim() })
    setLoading(false)
    if (error) {
      setErro(error.message.includes('inválido') || error.message.includes('encerrada') ? error.message : 'Código de turma inválido ou turma encerrada.')
    } else {
      setSucesso(true)
      setCodigo('')
      onSuccess?.()
    }
  }

  if (sucesso) {
    return (
      <div className="bg-acerto/10 border border-acerto/30 rounded-lg p-4 text-center">
        <p className="text-acerto text-sm font-medium">Você entrou na turma! 🎉</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {titulo && <p className="text-sm text-ink/60">{titulo}</p>}
      <div className="flex gap-2">
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Código da turma (ex: TRT2024)"
          className="flex-1 border border-ink/15 rounded-lg px-3 py-2 text-sm uppercase focus:border-gold"
        />
        <button disabled={loading} className="bg-ink text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-ink-light transition-colors shadow-soft disabled:opacity-50 shrink-0">
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </div>
      {erro && <p className="text-erro text-sm">{erro}</p>}
    </form>
  )
}
