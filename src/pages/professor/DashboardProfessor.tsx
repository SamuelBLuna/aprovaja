import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts'
import { Users, ListChecks, Target, AlertTriangle, LucideIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Turma } from '../../lib/types'
import PageHeader from '../../components/ui/PageHeader'

interface DesempenhoMateria {
  materiaId: string
  nome: string
  acertos: number
  total: number
  pct: number
}

interface PontoSemana {
  semana: string
  pct: number
  total: number
}

const CORES = { boa: '#16A34A', media: '#F59E0B', ruim: '#DC2626' }

function corPorPct(pct: number) {
  if (pct >= 70) return CORES.boa
  if (pct >= 50) return CORES.media
  return CORES.ruim
}

function inicioSemana(d: Date) {
  const copia = new Date(d)
  copia.setDate(copia.getDate() - copia.getDay())
  copia.setHours(0, 0, 0, 0)
  return copia
}

export default function DashboardProfessor() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaId, setTurmaId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const [totalAlunos, setTotalAlunos] = useState(0)
  const [totalRespondidas, setTotalRespondidas] = useState(0)
  const [questoesRevisao, setQuestoesRevisao] = useState(0)
  const [taxaGeral, setTaxaGeral] = useState(0)
  const [desempenho, setDesempenho] = useState<DesempenhoMateria[]>([])
  const [evolucao, setEvolucao] = useState<PontoSemana[]>([])

  useEffect(() => {
    supabase.from('turmas').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setTurmas((data as Turma[]) || [])
      if (data && data.length > 0) setTurmaId(data[0].id)
      else setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!turmaId) return
    setLoading(true)
    carregarDados(turmaId).finally(() => setLoading(false))
  }, [turmaId])

  async function carregarDados(tId: string) {
    const [{ count: alunosCount }, { data: respostas }, { count: revisaoCount }] = await Promise.all([
      supabase.from('turma_alunos').select('*', { count: 'exact', head: true }).eq('turma_id', tId),
      supabase.from('respostas').select('correta, created_at, questoes(materia_id, materias(nome))').eq('turma_id', tId),
      supabase.from('questoes').select('*', { count: 'exact', head: true }).eq('precisa_revisao', true),
    ])

    setTotalAlunos(alunosCount || 0)
    setTotalRespondidas(respostas?.length || 0)
    setQuestoesRevisao(revisaoCount || 0)

    const porMateria = new Map<string, DesempenhoMateria>()
    let totalAcertos = 0
    for (const r of respostas || []) {
      const q: any = r.questoes
      if (r.correta) totalAcertos += 1
      if (!q) continue
      const mId = q.materia_id
      const nome = q.materias?.nome || 'Sem matéria'
      if (!porMateria.has(mId)) porMateria.set(mId, { materiaId: mId, nome, acertos: 0, total: 0, pct: 0 })
      const item = porMateria.get(mId)!
      item.total += 1
      if (r.correta) item.acertos += 1
    }
    const listaMaterias = Array.from(porMateria.values()).map((m) => ({ ...m, pct: Math.round((m.acertos / m.total) * 100) }))
    listaMaterias.sort((a, b) => a.pct - b.pct)
    setDesempenho(listaMaterias)
    setTaxaGeral(respostas && respostas.length > 0 ? Math.round((totalAcertos / respostas.length) * 100) : 0)

    const hoje = new Date()
    const semanas: PontoSemana[] = []
    for (let i = 7; i >= 0; i--) {
      const inicio = inicioSemana(new Date(hoje.getTime() - i * 7 * 24 * 60 * 60 * 1000))
      const fim = new Date(inicio.getTime() + 7 * 24 * 60 * 60 * 1000)
      const doPeriodo = (respostas || []).filter((r: any) => {
        const d = new Date(r.created_at)
        return d >= inicio && d < fim
      })
      const acertosSemana = doPeriodo.filter((r: any) => r.correta).length
      semanas.push({
        semana: inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        pct: doPeriodo.length > 0 ? Math.round((acertosSemana / doPeriodo.length) * 100) : 0,
        total: doPeriodo.length,
      })
    }
    setEvolucao(semanas)
  }

  if (turmas.length === 0 && !loading) {
    return (
      <div>
        <PageHeader title="Painel" />
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-slate-500 text-sm">Você ainda não tem nenhuma turma. Crie uma na página de Cronograma para começar a acompanhar seus alunos.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Painel"
        subtitle="O retrato do desempenho da sua turma, agora."
        actions={
          <select
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700"
          >
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}{t.status === 'encerrada' ? ' (encerrada)' : ''}</option>
            ))}
          </select>
        }
      />

      {loading ? (
        <p className="text-slate-400">Carregando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <MetricCard icon={Users} label="Alunos na turma" value={totalAlunos} iconBg="bg-info-light" iconColor="text-info" />
            <MetricCard icon={ListChecks} label="Questões respondidas" value={totalRespondidas} iconBg="bg-ink-50" iconColor="text-ink" />
            <MetricCard icon={Target} label="Taxa de acerto geral" value={`${taxaGeral}%`} iconBg="bg-acerto-light" iconColor="text-acerto" />
            <Link to="/professor/questoes?revisao=1" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-erro/30 transition-colors">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${questoesRevisao > 0 ? 'bg-erro-light' : 'bg-slate-100'}`}>
                <AlertTriangle className={`w-4 h-4 ${questoesRevisao > 0 ? 'text-erro' : 'text-slate-400'}`} />
              </div>
              <p className="text-slate-500 text-xs mb-0.5">Questões p/ revisão</p>
              <p className={`text-2xl font-bold ${questoesRevisao > 0 ? 'text-erro' : 'text-slate-900'}`}>{questoesRevisao}</p>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Desempenho por matéria</h2>
              <p className="text-xs text-slate-400 mb-4">Menor aproveitamento primeiro — priorize a revisão dessas matérias.</p>
              {desempenho.length === 0 ? (
                <p className="text-slate-400 text-sm py-12 text-center">Nenhuma questão respondida ainda nesta turma.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, desempenho.length * 42)}>
                  <BarChart data={desempenho} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} unit="%" />
                    <YAxis type="category" dataKey="nome" width={130} tick={{ fontSize: 12, fill: '#334155' }} />
                    <Tooltip
                      formatter={(value: any, _name, props: any) => [`${value}% (${props.payload.acertos}/${props.payload.total})`, 'Acerto']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
                    />
                    <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={20}>
                      {desempenho.map((d) => <Cell key={d.materiaId} fill={corPorPct(d.pct)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Evolução do aproveitamento</h2>
              <p className="text-xs text-slate-400 mb-4">Taxa de acerto da turma, últimas 8 semanas.</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={evolucao} margin={{ left: -20, right: 12, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} unit="%" />
                  <Tooltip
                    formatter={(value: any, _name, props: any) => [`${value}% (${props.payload.total} questões)`, 'Acerto']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
                  />
                  <Line type="monotone" dataKey="pct" stroke="#1E3A8A" strokeWidth={2} dot={{ r: 3, fill: '#1E3A8A' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MetricCard({ label, value, icon: Icon, iconBg, iconColor }: { label: string; value: number | string; icon: LucideIcon; iconBg: string; iconColor: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${iconBg}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className="text-slate-500 text-xs mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}
