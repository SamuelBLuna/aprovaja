import { useState, FormEvent } from 'react'
import { CheckCircle2, Circle, Plus } from 'lucide-react'
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

const dificuldades: { valor: 1 | 2 | 3; label: string; cor: string }[] = [
 { valor: 1, label: 'Fácil', cor: 'acerto' },
 { valor: 2, label: 'Média', cor: 'gold' },
 { valor: 3, label: 'Difícil', cor: 'erro' },
]

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
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="flex gap-2">
 {(['multipla_escolha', 'verdadeiro_falso'] as QuestaoTipo[]).map((t) => (
 <button
 key={t}
 type="button"
 onClick={() => { setTipo(t); setRespostaCorreta(t === 'verdadeiro_falso' ? 'V' : 'A') }}
 className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
 tipo === t ? 'bg-ink text-white border-ink' : 'border-slate-200 text-slate-500 hover:bg-slate-100'
 }`}
 >
 {t === 'multipla_escolha' ? 'Múltipla escolha' : 'Verdadeiro ou Falso'}
 </button>
 ))}
 </div>

 <textarea required value={enunciado} onChange={(e) => setEnunciado(e.target.value)} rows={3} placeholder="Enunciado da questão"
 className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-colors" />

 {tipo === 'multipla_escolha' ? (
 <div className="space-y-2">
 {alternativas.map((alt) => (
 <div key={alt.id} className="flex items-center gap-2.5">
 <button type="button" onClick={() => setRespostaCorreta(alt.id)} className="shrink-0">
 {respostaCorreta === alt.id
 ? <CheckCircle2 className="w-5 h-5 text-acerto" />
 : <Circle className="w-5 h-5 text-slate-300" />}
 </button>
 <span className="w-5 text-sm text-slate-500 font-medium shrink-0">{alt.id}</span>
 <input value={alt.texto} onChange={(e) => updateAlternativaTexto(alt.id, e.target.value)}
 placeholder={`Alternativa ${alt.id}`}
 className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-colors" />
 </div>
 ))}
 {alternativas.length < 5 && (
 <button type="button" onClick={() => setAlternativas((prev) => [...prev, { id: LETRAS[prev.length], texto: '' }])}
 className="flex items-center gap-1 text-sm text-gold hover:text-gold-dark ml-8"><Plus className="w-3.5 h-3.5" /> Alternativa {LETRAS[alternativas.length]}</button>
 )}
 </div>
 ) : (
 <div className="flex gap-2">
 {['V', 'F'].map((v) => (
 <button key={v} type="button" onClick={() => setRespostaCorreta(v)}
 className={`flex-1 flex items-center justify-center gap-2 border rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
 respostaCorreta === v ? 'border-acerto bg-acerto-light text-acerto' : 'border-slate-200 text-slate-500 hover:bg-slate-100'
 }`}>
 {respostaCorreta === v ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 text-slate-300" />}
 {v === 'V' ? 'Verdadeiro' : 'Falso'}
 </button>
 ))}
 </div>
 )}

 <textarea value={explicacao} onChange={(e) => setExplicacao(e.target.value)} rows={2} placeholder="Explicação da resposta (opcional, aparece depois que o aluno responde)"
 className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-colors" />

 <div className="flex items-center gap-2">
 <span className="text-xs text-slate-500 mr-1">Dificuldade</span>
 {dificuldades.map((d) => (
 <button key={d.valor} type="button" onClick={() => setDificuldade(d.valor)}
 className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
 dificuldade === d.valor
 ? d.cor === 'acerto' ? 'bg-acerto-light text-acerto border-acerto/30'
 : d.cor === 'gold' ? 'bg-gold/15 text-gold-dark border-gold/30'
 : 'bg-erro-light text-erro border-erro/30'
 : 'border-slate-200 text-slate-400 hover:bg-slate-100'
 }`}>
 {d.label}
 </button>
 ))}
 </div>

 <div className="flex gap-3 pt-1">
 <button disabled={salvando} className="bg-ink text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-ink-light transition-colors disabled:opacity-50">
 {salvando ? 'Salvando…' : (submitLabel || 'Salvar questão')}
 </button>
 {onCancel && <button type="button" onClick={onCancel} className="text-slate-500 text-sm hover:text-ink transition-colors">Cancelar</button>}
 </div>
 </form>
 )
}
