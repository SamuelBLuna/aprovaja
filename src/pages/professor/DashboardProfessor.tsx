import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts'
import { supabase } from '../../lib/supabase'
import { Turma } from '../../lib/types'

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

const CORES = { boa: '#2F6B4F', media: '#C9973E', ruim: '#B23A34' }

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

    // evolução das últimas 8 semanas
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
        <h1 className="font-serif text-2xl text-ink mb-2">Painel</h1>
        <p className="text-ink/60">
          Você ainda não tem nenhuma turma. Crie uma na página de Cronograma para começar a acompanhar seus alunos.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="font-serif text-2xl text-ink">Painel</h1>
        <select
          value={turmaId}
          onChange={(e) => setTurmaId(e.target.value)}
          className="border border-ink/20 rounded px-3 py-1.5 text-sm bg-white"
        >
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>{t.nome}{t.status === 'encerrada' ? ' (encerrada)' : ''}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-ink/50">Carregando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <MetricCard label="Alunos na turma" value={totalAlunos} />
            <MetricCard label="Questões respondidas" value={totalRespondidas} />
            <MetricCard label="Taxa de acerto geral" value={`${taxaGeral}%`} accent={taxaGeral >= 70} />
            <Link to="/professor/questoes?revisao=1" className="bg-white border border-ink/10 rounded-lg p-5 shadow-sm hover:border-gold/40 transition-colors">
              <p className="text-ink/60 text-sm mb-1">Questões p/ revisão</p>
              <p className={`font-serif text-3xl ${questoesRevisao > 0 ? 'text-erro' : 'text-ink'}`}>{questoesRevisao}</p>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-ink/10 rounded-lg p-6 shadow-sm">
              <h2 className="font-serif text-lg text-ink mb-1">Desempenho por matéria</h2>
              <p className="text-xs text-ink/40 mb-4">Menor aproveitamento primeiro — priorize a revisão dessas matérias.</p>
              {desempenho.length === 0 ? (
                <p className="text-ink/50 text-sm py-12 text-center">Nenhuma questão respondida ainda nesta turma.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, desempenho.length * 42)}>
                  <BarChart data={desempenho} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1B2A4A0D" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#1B2A4A99' }} unit="%" />
                    <YAxis type="category" dataKey="nome" width={130} tick={{ fontSize: 12, fill: '#1B2A4A' }} />
                    <Tooltip
                      formatter={(value: any, _name, props: any) => [`${value}% (${props.payload.acertos}/${props.payload.total})`, 'Acerto']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #1B2A4A1A', fontSize: 13 }}
                    />
                    <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={22}>
                      {desempenho.map((d) => <Cell key={d.materiaId} fill={corPorPct(d.pct)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white border border-ink/10 rounded-lg p-6 shadow-sm">
              <h2 className="font-serif text-lg text-ink mb-1">Evolução do aproveitamento</h2>
              <p className="text-xs text-ink/40 mb-4">Taxa de acerto da turma, últimas 8 semanas.</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={evolucao} margin={{ left: -20, right: 12, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1B2A4A0D" vertical={false} />
                  <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#1B2A4A99' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#1B2A4A99' }} unit="%" />
                  <Tooltip
                    formatter={(value: any, _name, props: any) => [`${value}% (${props.payload.total} questões)`, 'Acerto']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #1B2A4A1A', fontSize: 13 }}
                  />
                  <Line type="monotone" dataKey="pct" stroke="#C9973E" strokeWidth={2.5} dot={{ r: 4, fill: '#C9973E' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MetricCard({ label, value, accent, alerta }: { label: string; value: number | string; accent?: boolean; alerta?: boolean }) {
  return (
    <div className="bg-white border border-ink/10 rounded-lg p-5 shadow-sm">
      <p className="text-ink/60 text-sm mb-1">{label}</p>
      <p className={`font-serif text-3xl ${alerta ? 'text-erro' : accent ? 'text-acerto' : 'text-ink'}`}>{value}</p>
    </div>
  )
}
