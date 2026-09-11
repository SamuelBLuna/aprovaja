import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Users, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Turma } from '../../lib/types'
import PageHeader from '../../components/ui/PageHeader'

interface AlunoResumo {
 aluno_id: string
 nome: string
 email: string
 total: number
 acertos: number
 taxa: number
 ultimaAtividade: string | null
}

interface DesempenhoItem { nome: string; acertos: number; total: number; pct: number }

const CORES = { boa: '#16A34A', media: '#F59E0B', ruim: '#DC2626' }
function corPorPct(pct: number) {
 if (pct >= 70) return CORES.boa
 if (pct >= 50) return CORES.media
 return CORES.ruim
}

function iniciais(nome: string) {
 const partes = nome.trim().split(' ')
 return ((partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
}

export default function Alunos() {
 const [turmas, setTurmas] = useState<Turma[]>([])
 const [turmaId, setTurmaId] = useState('')
 const [loading, setLoading] = useState(true)
 const [alunos, setAlunos] = useState<AlunoResumo[]>([])

 const [expandido, setExpandido] = useState<string | null>(null)
 const [respostasPorAluno, setRespostasPorAluno] = useState<Record<string, any[]>>({})
 const [materiaSelecionadaPorAluno, setMateriaSelecionadaPorAluno] = useState<Record<string, string | null>>({})
 const [cronogramaPorAluno, setCronogramaPorAluno] = useState<Record<string, { total: number; concluidos: number }>>({})
 const [carregandoDetalhe, setCarregandoDetalhe] = useState<string | null>(null)

 useEffect(() => {
 supabase.from('turmas').select('*').order('created_at', { ascending: false }).then(({ data }) => {
 setTurmas((data as Turma[]) || [])
 if (data && data.length > 0) setTurmaId(data[0].id)
 else setLoading(false)
 })
 }, [])

 useEffect(() => { if (turmaId) carregarAlunos(turmaId) }, [turmaId])

 async function carregarAlunos(tId: string) {
 setLoading(true)
 setExpandido(null)
 const [{ data: matriculas }, { data: respostas }] = await Promise.all([
 supabase.from('turma_alunos').select('aluno_id, profiles(nome, email)').eq('turma_id', tId),
 supabase.from('respostas').select('aluno_id, correta, created_at').eq('turma_id', tId),
 ])

 const resumo = new Map<string, AlunoResumo>()
 for (const m of (matriculas as any[]) || []) {
 resumo.set(m.aluno_id, {
 aluno_id: m.aluno_id,
 nome: m.profiles?.nome || '(sem nome)',
 email: m.profiles?.email || '',
 total: 0, acertos: 0, taxa: 0, ultimaAtividade: null,
 })
 }
 for (const r of (respostas as any[]) || []) {
 const item = resumo.get(r.aluno_id)
 if (!item) continue
 item.total += 1
 if (r.correta) item.acertos += 1
 if (!item.ultimaAtividade || r.created_at > item.ultimaAtividade) item.ultimaAtividade = r.created_at
 }
 const lista = Array.from(resumo.values()).map((a) => ({ ...a, taxa: a.total > 0 ? Math.round((a.acertos / a.total) * 100) : 0 }))
 lista.sort((a, b) => a.nome.localeCompare(b.nome))
 setAlunos(lista)
 setLoading(false)
 }

 async function abrirDetalhe(alunoId: string) {
 if (expandido === alunoId) { setExpandido(null); return }
 setExpandido(alunoId)
 setMateriaSelecionadaPorAluno((prev) => ({ ...prev, [alunoId]: null }))
 if (respostasPorAluno[alunoId]) return

 setCarregandoDetalhe(alunoId)
 const [{ data: respostas }, { data: itensCronograma }, { data: conclusoes }] = await Promise.all([
 supabase.from('respostas').select('correta, questoes(materia_id, topico_id, materias(nome), topicos(nome))').eq('aluno_id', alunoId).eq('turma_id', turmaId),
 supabase.from('cronograma_itens').select('id, data_inicio').eq('turma_id', turmaId),
 supabase.from('cronograma_conclusoes').select('cronograma_id').eq('aluno_id', alunoId),
 ])

 setRespostasPorAluno((prev) => ({ ...prev, [alunoId]: respostas || [] }))

 const hoje = new Date().toISOString().slice(0, 10)
 const itensJaDevidos = (itensCronograma || []).filter((i: any) => i.data_inicio <= hoje)
 const concluidosSet = new Set((conclusoes || []).map((c: any) => c.cronograma_id))
 const concluidosCount = itensJaDevidos.filter((i: any) => concluidosSet.has(i.id)).length
 setCronogramaPorAluno((prev) => ({ ...prev, [alunoId]: { total: itensJaDevidos.length, concluidos: concluidosCount } }))

 setCarregandoDetalhe(null)
 }

 function desempenhoPorMateria(alunoId: string): DesempenhoItem[] {
 const respostas = respostasPorAluno[alunoId] || []
 const porMateria = new Map<string, DesempenhoItem>()
 for (const r of respostas) {
 const nome = r.questoes?.materias?.nome || 'Sem matéria'
 if (!porMateria.has(nome)) porMateria.set(nome, { nome, acertos: 0, total: 0, pct: 0 })
 const item = porMateria.get(nome)!
 item.total += 1
 if (r.correta) item.acertos += 1
 }
 return Array.from(porMateria.values()).map((m) => ({ ...m, pct: Math.round((m.acertos / m.total) * 100) })).sort((a, b) => a.pct - b.pct)
 }

 function desempenhoPorTopico(alunoId: string, materiaNome: string): DesempenhoItem[] {
 const respostas = respostasPorAluno[alunoId] || []
 const porTopico = new Map<string, DesempenhoItem>()
 for (const r of respostas) {
 const nomeMateria = r.questoes?.materias?.nome || 'Sem matéria'
 if (nomeMateria !== materiaNome) continue
 const nomeTopico = r.questoes?.topicos?.nome || 'Sem tópico'
 if (!porTopico.has(nomeTopico)) porTopico.set(nomeTopico, { nome: nomeTopico, acertos: 0, total: 0, pct: 0 })
 const item = porTopico.get(nomeTopico)!
 item.total += 1
 if (r.correta) item.acertos += 1
 }
 return Array.from(porTopico.values()).map((t) => ({ ...t, pct: Math.round((t.acertos / t.total) * 100) })).sort((a, b) => a.pct - b.pct)
 }

 if (turmas.length === 0 && !loading) {
 return (
 <div>
 <PageHeader title="Alunos" />
 <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
 <p className="text-slate-500 text-sm">Você ainda não tem nenhuma turma.</p>
 </div>
 </div>
 )
 }

 return (
 <div>
 <PageHeader
 title="Alunos"
 subtitle="Acompanhe o desempenho de cada aluno individualmente."
 actions={
 <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white ">
 {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}{t.status === 'encerrada' ? ' (encerrada)' : ''}</option>)}
 </select>
 }
 />

 {loading ? (
 <p className="text-slate-500 text-sm">Carregando…</p>
 ) : alunos.length === 0 ? (
 <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
 <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
 <p className="text-slate-500 text-sm">Nenhum aluno matriculado nessa turma ainda.</p>
 </div>
 ) : (
 <div className="space-y-2">
 {alunos.map((a) => {
 const aberto = expandido === a.aluno_id
 const materiaSelecionada = materiaSelecionadaPorAluno[a.aluno_id]
 const materias = desempenhoPorMateria(a.aluno_id)
 const topicos = materiaSelecionada ? desempenhoPorTopico(a.aluno_id, materiaSelecionada) : []
 const cronograma = cronogramaPorAluno[a.aluno_id]
 return (
 <div key={a.aluno_id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
 <div className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer hover:bg-ink/[0.015] transition-colors" onClick={() => abrirDetalhe(a.aluno_id)}>
 <div className="flex items-center gap-3 min-w-0">
 <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-semibold shrink-0">
 {iniciais(a.nome)}
 </div>
 <div className="min-w-0">
 <p className="text-ink font-medium text-sm truncate">{a.nome}</p>
 <p className="text-slate-400 text-xs truncate">{a.email}</p>
 </div>
 </div>
 <div className="flex items-center gap-6 shrink-0">
 <div className="text-right hidden sm:block">
 <p className="text-slate-400 text-[11px] uppercase tracking-wide">Questões</p>
 <p className="text-ink text-sm font-medium">{a.total}</p>
 </div>
 <div className="text-right hidden sm:block">
 <p className="text-slate-400 text-[11px] uppercase tracking-wide">Acerto</p>
 <p className={`text-sm font-medium ${a.taxa >= 70 ? 'text-acerto' : a.taxa >= 50 ? 'text-gold-dark' : a.total > 0 ? 'text-erro' : 'text-slate-400'}`}>
 {a.total > 0 ? `${a.taxa}%` : '—'}
 </p>
 </div>
 <div className="text-right hidden md:block">
 <p className="text-slate-400 text-[11px] uppercase tracking-wide">Última atividade</p>
 <p className="text-ink text-sm">{a.ultimaAtividade ? new Date(a.ultimaAtividade).toLocaleDateString('pt-BR') : 'Nenhuma'}</p>
 </div>
 {aberto ? <ChevronDown className="w-4 h-4 text-slate-300" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
 </div>
 </div>

 {aberto && (
 <div className="border-t border-slate-200 px-4 py-4 bg-paper/60">
 {carregandoDetalhe === a.aluno_id ? (
 <p className="text-slate-500 text-sm">Carregando detalhes…</p>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="bg-white border border-slate-200 rounded-xl p-4">
 {materiaSelecionada ? (
 <>
 <button
 onClick={() => setMateriaSelecionadaPorAluno((prev) => ({ ...prev, [a.aluno_id]: null }))}
 className="flex items-center gap-1 text-gold text-xs hover:underline mb-2"
 >
 <ArrowLeft className="w-3 h-3" /> Voltar
 </button>
 <p className="text-sm font-medium text-ink mb-3">{materiaSelecionada} — por tópico</p>
 {topicos.length === 0 ? (
 <p className="text-slate-400 text-sm">Nenhum tópico registrado.</p>
 ) : (
 <ResponsiveContainer width="100%" height={Math.max(160, topicos.length * 40)}>
 <BarChart data={topicos} layout="vertical" margin={{ left: 8, right: 20 }}>
 <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
 <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} unit="%" />
 <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 11, fill: '#334155' }} />
 <Tooltip formatter={(value: any, _n, props: any) => [`${value}% (${props.payload.acertos}/${props.payload.total})`, 'Acerto']}
 contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
 <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={16}>
 {topicos.map((t) => <Cell key={t.nome} fill={corPorPct(t.pct)} />)}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 )}
 </>
 ) : (
 <>
 <p className="text-sm font-medium text-ink mb-1">Desempenho por matéria</p>
 <p className="text-xs text-slate-400 mb-3">Clique numa barra pra ver por tópico.</p>
 {materias.length === 0 ? (
 <p className="text-slate-400 text-sm">Nenhuma questão respondida ainda.</p>
 ) : (
 <ResponsiveContainer width="100%" height={Math.max(160, materias.length * 40)}>
 <BarChart data={materias} layout="vertical" margin={{ left: 8, right: 20 }} onClick={(e: any) => {
 const nome = e?.activePayload?.[0]?.payload?.nome
 if (nome) setMateriaSelecionadaPorAluno((prev) => ({ ...prev, [a.aluno_id]: nome }))
 }}>
 <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
 <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} unit="%" />
 <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 11, fill: '#334155' }} />
 <Tooltip formatter={(value: any, _n, props: any) => [`${value}% (${props.payload.acertos}/${props.payload.total})`, 'Acerto']}
 contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
 <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={16} cursor="pointer">
 {materias.map((m) => <Cell key={m.nome} fill={corPorPct(m.pct)} />)}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 )}
 </>
 )}
 </div>

 <div className="bg-white border border-slate-200 rounded-xl p-4">
 <p className="text-sm font-medium text-ink mb-3">Cronograma</p>
 {cronograma && cronograma.total > 0 ? (
 <>
 <p className="text-3xl font-serif text-ink mb-1">{cronograma.concluidos}/{cronograma.total}</p>
 <p className="text-slate-500 text-xs mb-3">itens já devidos, marcados como concluídos</p>
 <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
 <div className="h-full bg-gold rounded-full" style={{ width: `${Math.round((cronograma.concluidos / cronograma.total) * 100)}%` }} />
 </div>
 </>
 ) : (
 <p className="text-slate-400 text-sm">Nenhum item de cronograma pendente ainda.</p>
 )}
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 )
 })}
 </div>
 )}
 </div>
 )
}
