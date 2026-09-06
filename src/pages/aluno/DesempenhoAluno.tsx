import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import SemTurma from '../../components/SemTurma'
import { usePossuiTurma } from '../../lib/usePossuiTurma'

type Periodo = 'hoje' | 'semana' | 'mes' | 'personalizado'

interface DesempenhoMateria { nome: string; acertos: number; total: number; pct: number }
interface PontoDia { dia: string; pct: number; total: number }

const CORES = { boa: '#2F6B4F', media: '#C9973E', ruim: '#B23A34' }
function corPorPct(pct: number) {
  if (pct >= 70) return CORES.boa
  if (pct >= 50) return CORES.media
  return CORES.ruim
}

function isoHoje() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function somarDias(iso: string, dias: number) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DesempenhoAluno() {
  const { profile } = useAuth()
  const possuiTurma = usePossuiTurma()

  const [periodo, setPeriodo] = useState<Periodo>('semana')
  const [dataInicio, setDataInicio] = useState(somarDias(isoHoje(), -6))
  const [dataFim, setDataFim] = useState(isoHoje())
  const [respostas, setRespostas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const { inicio, fim } = useMemo(() => {
    const hoje = isoHoje()
    if (periodo === 'hoje') return { inicio: hoje, fim: hoje }
    if (periodo === 'semana') return { inicio: somarDias(hoje, -6), fim: hoje }
    if (periodo === 'mes') return { inicio: somarDias(hoje, -29), fim: hoje }
    return { inicio: dataInicio, fim: dataFim }
  }, [periodo, dataInicio, dataFim])

  useEffect(() => {
    if (!profile || possuiTurma === false) return
    setLoading(true)
    setErro(null)
    supabase
      .from('respostas')
      .select('correta, created_at, questoes(materia_id, materias(nome))')
      .eq('aluno_id', profile.id)
      .gte('created_at', inicio + 'T00:00:00')
      .lte('created_at', fim + 'T23:59:59')
      .then(({ data, error }) => {
        if (error) {
          console.error('Erro ao carregar desempenho:', error)
          setErro('Não foi possível carregar seu desempenho agora. Tente recarregar a página.')
          setRespostas([])
        } else {
          setRespostas(data || [])
        }
        setLoading(false)
      })
  }, [profile, inicio, fim, possuiTurma])

  if (possuiTurma === false) return <SemTurma />

  const total = respostas.length
  const acertos = respostas.filter((r) => r.correta).length
  const erros = total - acertos
  const taxa = total > 0 ? Math.round((acertos / total) * 100) : 0

  const porMateria = new Map<string, DesempenhoMateria>()
  for (const r of respostas) {
    const nome = r.questoes?.materias?.nome || 'Sem matéria'
    if (!porMateria.has(nome)) porMateria.set(nome, { nome, acertos: 0, total: 0, pct: 0 })
    const item = porMateria.get(nome)!
    item.total += 1
    if (r.correta) item.acertos += 1
  }
  const desempenhoMaterias = Array.from(porMateria.values())
    .map((m) => ({ ...m, pct: Math.round((m.acertos / m.total) * 100) }))
    .sort((a, b) => a.pct - b.pct)

  // evolução diária dentro do período
  const dias: PontoDia[] = []
  let cursor = inicio
  let guard = 0
  while (cursor <= fim && guard < 62) {
    const doDia = respostas.filter((r) => r.created_at.slice(0, 10) === cursor)
    const acertosDia = doDia.filter((r) => r.correta).length
    dias.push({
      dia: new Date(cursor + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      pct: doDia.length > 0 ? Math.round((acertosDia / doDia.length) * 100) : 0,
      total: doDia.length,
    })
    cursor = somarDias(cursor, 1)
    guard += 1
  }

  return (
    <div>
      <h1 className="font-serif text-2xl text-ink mb-1">Desempenho</h1>
      <p className="text-ink/60 text-sm mb-6">Veja como você está indo em cada matéria.</p>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {(['hoje', 'semana', 'mes', 'personalizado'] as Periodo[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              periodo === p ? 'bg-ink text-white border-ink' : 'border-ink/20 text-ink/70 hover:bg-ink/5'
            }`}
          >
            {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Últimos 7 dias' : p === 'mes' ? 'Últimos 30 dias' : 'Período personalizado'}
          </button>
        ))}
        {periodo === 'personalizado' && (
          <div className="flex items-center gap-2 ml-2">
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="border border-ink/20 rounded px-2 py-1.5 text-sm" />
            <span className="text-ink/40 text-sm">até</span>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="border border-ink/20 rounded px-2 py-1.5 text-sm" />
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-ink/50 text-sm">Carregando…</p>
      ) : erro ? (
        <div className="bg-erro/5 border border-erro/20 rounded-lg p-8 text-center">
          <p className="text-erro text-sm">{erro}</p>
        </div>
      ) : total === 0 ? (
        <div className="bg-white border border-ink/10 rounded-lg p-8 text-center">
          <p className="text-ink/60 text-sm">Nenhuma questão respondida neste período. Responda algumas questões para ver seu desempenho aqui.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Questões respondidas" value={total} />
            <MetricCard label="Acertos" value={acertos} cor="text-acerto" />
            <MetricCard label="Erros" value={erros} cor="text-erro" />
            <MetricCard label="Taxa de acerto" value={`${taxa}%`} cor={taxa >= 70 ? 'text-acerto' : taxa >= 50 ? 'text-gold' : 'text-erro'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-ink/10 rounded-lg p-6 shadow-sm">
              <h2 className="font-serif text-lg text-ink mb-4">Por matéria</h2>
              <ResponsiveContainer width="100%" height={Math.max(200, desempenhoMaterias.length * 42)}>
                <BarChart data={desempenhoMaterias} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1B2A4A0D" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#1B2A4A99' }} unit="%" />
                  <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 12, fill: '#1B2A4A' }} />
                  <Tooltip formatter={(value: any, _n, props: any) => [`${value}% (${props.payload.acertos}/${props.payload.total})`, 'Acerto']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #1B2A4A1A', fontSize: 13 }} />
                  <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={20}>
                    {desempenhoMaterias.map((d) => <Cell key={d.nome} fill={corPorPct(d.pct)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-ink/10 rounded-lg p-6 shadow-sm">
              <h2 className="font-serif text-lg text-ink mb-4">Evolução no período</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dias} margin={{ left: -20, right: 12, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1B2A4A0D" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#1B2A4A99' }} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#1B2A4A99' }} unit="%" />
                  <Tooltip formatter={(value: any, _n, props: any) => [`${value}% (${props.payload.total} questões)`, 'Acerto']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #1B2A4A1A', fontSize: 13 }} />
                  <Line type="monotone" dataKey="pct" stroke="#C9973E" strokeWidth={2.5} dot={{ r: 3, fill: '#C9973E' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MetricCard({ label, value, cor }: { label: string; value: number | string; cor?: string }) {
  return (
    <div className="bg-white border border-ink/10 rounded-lg p-5 shadow-sm">
      <p className="text-ink/60 text-sm mb-1">{label}</p>
      <p className={`font-serif text-3xl ${cor || 'text-ink'}`}>{value}</p>
    </div>
  )
}
