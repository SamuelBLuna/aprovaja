import { useEffect, useState } from 'react'
import { X, RotateCcw, Users, ShieldAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Turma } from '../lib/types'

interface AlunoDaTurma {
 aluno_id: string
 joined_at: string
 profiles: { nome: string; email: string } | null
}

interface GerenciarTurmaProps {
 turma: Turma
 onFechar: () => void
 onAtualizada: (turma: Turma) => void
 onExcluida: () => void
}

export default function GerenciarTurma({ turma, onFechar, onAtualizada, onExcluida }: GerenciarTurmaProps) {
 const [nome, setNome] = useState(turma.nome)
 const [salvandoNome, setSalvandoNome] = useState(false)
 const [msgNome, setMsgNome] = useState<string | null>(null)

 const [alunos, setAlunos] = useState<AlunoDaTurma[]>([])
 const [carregandoAlunos, setCarregandoAlunos] = useState(true)

 const [confirmacaoExclusao, setConfirmacaoExclusao] = useState('')
 const [excluindo, setExcluindo] = useState(false)

 useEffect(() => { carregarAlunos() }, [turma.id])

 async function carregarAlunos() {
 setCarregandoAlunos(true)
 const { data } = await supabase.from('turma_alunos').select('aluno_id, joined_at, profiles(nome, email)').eq('turma_id', turma.id).order('joined_at')
 setAlunos((data as any) || [])
 setCarregandoAlunos(false)
 }

 async function salvarNome() {
 if (!nome.trim() || nome.trim() === turma.nome) { setMsgNome(null); return }
 setSalvandoNome(true)
 const { error } = await supabase.from('turmas').update({ nome: nome.trim() }).eq('id', turma.id)
 setSalvandoNome(false)
 if (error) {
 setMsgNome('Erro ao salvar.')
 } else {
 setMsgNome('Nome atualizado.')
 onAtualizada({ ...turma, nome: nome.trim() })
 }
 }

 async function removerAluno(alunoId: string, nomeAluno: string) {
 if (!confirm(`Remover ${nomeAluno} desta turma? Ele(a) perde o acesso ao conteúdo da turma, mas o histórico de respostas é mantido.`)) return
 await supabase.from('turma_alunos').delete().eq('turma_id', turma.id).eq('aluno_id', alunoId)
 carregarAlunos()
 }

 async function excluirTurma() {
 setExcluindo(true)
 const { error } = await supabase.from('turmas').delete().eq('id', turma.id)
 setExcluindo(false)
 if (error) {
 alert('Erro ao excluir: ' + error.message)
 } else {
 onExcluida()
 }
 }

 async function reativarTurma() {
 if (!confirm('Reativar esta turma? Os alunos removidos ao encerrar não voltam automaticamente — eles vão precisar usar o código de novo pra entrar.')) return
 const { error } = await supabase.rpc('reativar_turma', { p_turma_id: turma.id })
 if (!error) onAtualizada({ ...turma, status: 'ativa' })
 else alert('Erro ao reativar: ' + error.message)
 }

 const nomeConfere = confirmacaoExclusao.trim().toLowerCase() === turma.nome.trim().toLowerCase()

 return (
 <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 space-y-6">
 <div className="flex items-center justify-between">
 <h2 className="text-base font-semibold text-slate-900">Gerenciar turma</h2>
 <div className="flex items-center gap-4">
 {turma.status === 'encerrada' && (
 <button onClick={reativarTurma} className="flex items-center gap-1 text-gold hover:text-gold-dark text-sm transition-colors"><RotateCcw className="w-3.5 h-3.5" /> Reativar turma</button>
 )}
 <button onClick={onFechar} className="text-slate-400 hover:text-ink transition-colors"><X className="w-4 h-4" /></button>
 </div>
 </div>

 {/* nome */}
 <div>
 <label className="block text-xs text-slate-500 mb-1.5">Nome da turma</label>
 <div className="flex gap-2">
 <input value={nome} onChange={(e) => setNome(e.target.value)} onBlur={salvarNome}
 className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-gold outline-none transition-colors" />
 <button onClick={salvarNome} disabled={salvandoNome} className="bg-ink text-white px-4 py-2.5 rounded-lg text-sm hover:bg-ink-light transition-colors disabled:opacity-50">
 {salvandoNome ? 'Salvando…' : 'Salvar'}
 </button>
 </div>
 {msgNome && <p className={`text-xs mt-1.5 ${msgNome.includes('Erro') ? 'text-erro' : 'text-acerto'}`}>{msgNome}</p>}
 </div>

 {/* alunos */}
 <div>
 <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Alunos matriculados ({alunos.length})</p>
 {carregandoAlunos ? (
 <p className="text-slate-400 text-sm">Carregando…</p>
 ) : alunos.length === 0 ? (
 <p className="text-slate-400 text-sm">Nenhum aluno usou o código <strong className="font-mono">{turma.codigo_turma}</strong> ainda.</p>
 ) : (
 <div className="border border-slate-200 rounded-lg divide-y divide-ink/[0.06] max-h-64 overflow-y-auto">
 {alunos.map((a) => (
 <div key={a.aluno_id} className="flex items-center justify-between gap-2 px-3 py-2.5">
 <div className="min-w-0">
 <p className="text-sm text-slate-700 truncate">{a.profiles?.nome || '(sem nome)'}</p>
 <p className="text-xs text-slate-400 truncate">{a.profiles?.email}</p>
 </div>
 <button onClick={() => removerAluno(a.aluno_id, a.profiles?.nome || 'este aluno')} className="text-erro/70 hover:text-erro text-xs font-medium shrink-0 transition-colors">
 Remover
 </button>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* zona de perigo */}
 <div className="border border-erro/15 rounded-lg p-4 bg-erro-light/40">
 <p className="text-sm font-medium text-erro mb-1 flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> Excluir turma</p>
 <p className="text-xs text-slate-500 mb-3 leading-relaxed">
 Apaga a turma, o cronograma, os simulados e as tentativas de simulado dela
 permanentemente — use só se criou por engano. Respostas do banco de questões
 livre não se perdem (ficam sem turma vinculada), mas o restante do histórico
 dessa turma some. Se ela já teve alunos de verdade estudando, prefira
 <strong> Encerrar</strong> em vez de excluir.
 </p>
 <div className="flex items-center gap-2">
 <input
 value={confirmacaoExclusao}
 onChange={(e) => setConfirmacaoExclusao(e.target.value)}
 placeholder={`Digite "${turma.nome}" para confirmar`}
 className="flex-1 border border-erro/25 rounded-lg px-3 py-2 text-sm focus:border-erro outline-none transition-colors bg-white"
 />
 <button
 onClick={excluirTurma}
 disabled={!nomeConfere || excluindo}
 className="bg-erro text-white px-4 py-2 rounded-lg text-sm hover:bg-erro/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
 >
 {excluindo ? 'Excluindo…' : 'Excluir turma'}
 </button>
 </div>
 </div>
 </div>
 )
}
