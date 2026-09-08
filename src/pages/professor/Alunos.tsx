import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase } from '../../lib/supabase'
import { Turma } from '../../lib/types'

interface AlunoResumo {
  aluno_id: string
  nome: string
  email: string
  total: number
  acertos: number
  taxa: number
  ultimaAtividade: string | null
}

interface DesempenhoMateria { nome: string; acertos: number; total: number; pct: number }

const CORES = { boa: '#2F6B4F', media: '#C9973E', ruim: '#B23A34' }
function corPorPct(pct: number) {
  if (pct >= 70) return CORES.boa
  if (pct >= 50) return CORES.media
  return CORES.ruim
}

export default function Alunos() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [loading, setLoading] = useState(true)
  const [alunos, setAlunos] = useState<AlunoResumo[]>([])

  const [expandido, setExpandido] = useState<string | null>(null)
  const [desempenhoPorAluno, setDesempenhoPorAluno] = useState<Record<string, DesempenhoMateria[]>>({})
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
    if (desempenhoPorAluno[alunoId]) return

    setCarregandoDetalhe(alunoId)
    const [{ data: respostas }, { data: itensCronograma }, { data: conclusoes }] = await Promise.all([
      supabase.from('respostas').select('correta, questoes(materia_id, materias(nome))').eq('aluno_id', alunoId).eq('turma_id', turmaId),
      supabase.from('cronograma_itens').select('id, data_inicio').eq('turma_id', turmaId),
      supabase.from('cronograma_conclusoes').select('cronograma_id').eq('aluno_id', alunoId),
    ])

    const porMateria = new Map<string, DesempenhoMateria>()
    for (const r of (respostas as any[]) || []) {
      const nome = r.questoes?.materias?.nome || 'Sem matéria'
      if (!porMateria.has(nome)) porMateria.set(nome, { nome, acertos: 0, total: 0, pct: 0 })
      const item = porMateria.get(nome)!
      item.total += 1
      if (r.correta) item.acertos += 1
    }
    const lista = Array.from(porMateria.values()).map((m) => ({ ...m, pct: Math.round((m.acertos / m.total) * 100) })).sort((a, b) => a.pct - b.pct)
    setDesempenhoPorAluno((prev) => ({ ...prev, [alunoId]: lista }))

    const hoje = new Date().toISOString().slice(0, 10)
    const itensJaDevidos = (itensCronograma || []).filter((i: any) => i.data_inicio <= hoje)
    const concluidosSet = new Set((conclusoes || []).map((c: any) => c.cronograma_id))
    const concluidosCount = itensJaDevidos.filter((i: any) => concluidosSet.has(i.id)).length
    setCronogramaPorAluno((prev) => ({ ...prev, [alunoId]: { total: itensJaDevidos.length, concluidos: concluidosCount } }))

    setCarregandoDetalhe(null)
  }

  if (turmas.length === 0 && !loading) {
    return (
      <div>
        <h1 className="font-serif text-2xl text-ink mb-2">Alunos</h1>
        <p className="text-ink/60">Você ainda não tem nenhuma turma.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="font-serif text-[26px] text-ink">Alunos</h1>
        <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="border border-ink/15 rounded-lg px-3 py-1.5 text-sm bg-white">
          {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}{t.status === 'encerrada' ? ' (encerrada)' : ''}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-ink/50 text-sm">Carregando…</p>
      ) : alunos.length === 0 ? (
        <p className="text-ink/60 text-sm">Nenhum aluno matriculado nessa turma ainda.</p>
      ) : (
        <div className="space-y-2">
          {alunos.map((a) => {
            const aberto = expandido === a.aluno_id
            const materias = desempenhoPorAluno[a.aluno_id] || []
            const cronograma = cronogramaPorAluno[a.aluno_id]
            return (
              <div key={a.aluno_id} className="bg-white border border-ink/[0.07] rounded-xl shadow-soft overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer" onClick={() => abrirDetalhe(a.aluno_id)}>
                  <div className="min-w-0">
                    <p className="text-ink font-medium text-sm truncate">{a.nome}</p>
                    <p className="text-ink/40 text-xs truncate">{a.email}</p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-ink/40 text-xs">Questões</p>
                      <p className="text-ink text-sm">{a.total}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-ink/40 text-xs">Acerto</p>
                      <p className={`text-sm font-medium ${a.taxa >= 70 ? 'text-acerto' : a.taxa >= 50 ? 'text-gold' : a.total > 0 ? 'text-erro' : 'text-ink/40'}`}>
                        {a.total > 0 ? `${a.taxa}%` : '—'}
                      </p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-ink/40 text-xs">Última atividade</p>
                      <p className="text-ink text-sm">{a.ultimaAtividade ? new Date(a.ultimaAtividade).toLocaleDateString('pt-BR') : 'Nenhuma'}</p>
                    </div>
                    <span className="text-ink/40">{aberto ? '▾' : '▸'}</span>
                  </div>
                </div>

                {aberto && (
                  <div className="border-t border-ink/10 px-4 py-4 bg-paper/50">
                    {carregandoDetalhe === a.aluno_id ? (
                      <p className="text-ink/50 text-sm">Carregando detalhes…</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-ink/[0.07] rounded-xl shadow-soft p-4">
                          <p className="text-sm font-medium text-ink mb-3">Desempenho por matéria</p>
                          {materias.length === 0 ? (
                            <p className="text-ink/40 text-sm">Nenhuma questão respondida ainda.</p>
                          ) : (
                            <ResponsiveContainer width="100%" height={Math.max(160, materias.length * 40)}>
                              <BarChart data={materias} layout="vertical" margin={{ left: 8, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1B2A4A0D" horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#1B2A4A99' }} unit="%" />
                                <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 11, fill: '#1B2A4A' }} />
                                <Tooltip formatter={(value: any, _n, props: any) => [`${value}% (${props.payload.acertos}/${props.payload.total})`, 'Acerto']}
                                  contentStyle={{ borderRadius: 8, border: '1px solid #1B2A4A1A', fontSize: 12 }} />
                                <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={16}>
                                  {materias.map((m) => <Cell key={m.nome} fill={corPorPct(m.pct)} />)}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>

                        <div className="bg-white border border-ink/[0.07] rounded-xl shadow-soft p-4">
                          <p className="text-sm font-medium text-ink mb-3">Cronograma</p>
                          {cronograma && cronograma.total > 0 ? (
                            <>
                              <p className="text-3xl font-serif text-ink mb-1">{cronograma.concluidos}/{cronograma.total}</p>
                              <p className="text-ink/50 text-xs mb-3">itens já devidos, marcados como concluídos</p>
                              <div className="h-2 bg-ink/10 rounded overflow-hidden">
                                <div className="h-full bg-gold" style={{ width: `${Math.round((cronograma.concluidos / cronograma.total) * 100)}%` }} />
                              </div>
                            </>
                          ) : (
                            <p className="text-ink/40 text-sm">Nenhum item de cronograma pendente ainda.</p>
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
