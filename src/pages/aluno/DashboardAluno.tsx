import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Turma, CronogramaItem, Questao } from '../../lib/types'
import { isoHoje, somarDias, enumerarDatas } from '../../lib/dates'
import MonthCalendar from '../../components/MonthCalendar'
import QuestionCard from '../../components/QuestionCard'
import SemTurma from '../../components/SemTurma'
import { usePossuiTurma } from '../../lib/usePossuiTurma'

type ItemComMateria = CronogramaItem & { materias?: { nome: string; cor: string } | null; topicos?: { nome: string } | null }
type QuestaoComGrupo = Questao & { grupos_questoes?: { texto_base: string } | null }

interface Indicadores {
  questoesRespondidas: number
  taxaAcerto: number
  diasConsecutivos: number
  questoesParaRevisao: number
}

interface UltimoSimulado {
  titulo: string
  pct: number
  finalizadoEm: string
}

export default function DashboardAluno() {
  const { profile } = useAuth()
  const possuiTurma = usePossuiTurma()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [selectedDate, setSelectedDate] = useState(isoHoje())
  const [todosItens, setTodosItens] = useState<ItemComMateria[]>([])
  const [datasComItens, setDatasComItens] = useState<Set<string>>(new Set())
  const [concluidos, setConcluidos] = useState<Set<string>>(new Set())
  const [contagemQuestoesPorItem, setContagemQuestoesPorItem] = useState<Record<string, number>>({})
  const [questoesPorItem, setQuestoesPorItem] = useState<Record<string, QuestaoComGrupo[]>>({})
  const [mostrarQuestoesDoDia, setMostrarQuestoesDoDia] = useState(false)
  const [carregandoQuestoesDoDia, setCarregandoQuestoesDoDia] = useState(false)

  const [indicadores, setIndicadores] = useState<Indicadores>({ questoesRespondidas: 0, taxaAcerto: 0, diasConsecutivos: 0, questoesParaRevisao: 0 })
  const [ultimoSimulado, setUltimoSimulado] = useState<UltimoSimulado | null>(null)

  useEffect(() => {
    if (!profile) return
    supabase.from('turma_alunos').select('turmas(*)').eq('aluno_id', profile.id).then(({ data }) => {
      const lista = (data || []).map((d: any) => d.turmas).filter(Boolean) as Turma[]
      setTurmas(lista)
      if (lista.length > 0) setTurmaId(lista[0].id)
    })
    carregarIndicadores()
    carregarUltimoSimulado()
  }, [profile])

  useEffect(() => { if (turmaId) carregarItens() }, [turmaId])

  async function carregarItens() {
    const { data } = await supabase.from('cronograma_itens').select('*, materias(nome, cor), topicos(nome)').eq('turma_id', turmaId)
    const itens = (data as ItemComMateria[]) || []
    setTodosItens(itens)
    const datas = new Set<string>()
    itens.forEach((i) => enumerarDatas(i.data_inicio, i.data_fim).forEach((d) => datas.add(d)))
    setDatasComItens(datas)

    if (profile) {
      const { data: conclusoes } = await supabase.from('cronograma_conclusoes').select('cronograma_id').eq('aluno_id', profile.id)
      setConcluidos(new Set((conclusoes || []).map((c: any) => c.cronograma_id)))
    }

    const contagens: Record<string, number> = {}
    await Promise.all(itens.map(async (item) => {
      const { count } = await supabase.from('cronograma_questoes').select('*', { count: 'exact', head: true }).eq('cronograma_id', item.id)
      contagens[item.id] = count || 0
    }))
    setContagemQuestoesPorItem(contagens)
  }

  async function carregarIndicadores() {
    if (!profile) return
    const { data: respostas } = await supabase.from('respostas').select('correta, questao_id, created_at').eq('aluno_id', profile.id).order('created_at', { ascending: false })
    const lista = respostas || []
    const total = lista.length
    const acertos = lista.filter((r: any) => r.correta).length

    // dias consecutivos com pelo menos 1 questão respondida
    const diasComRespostaSet = new Set(lista.map((r: any) => r.created_at.slice(0, 10)))
    let streak = 0
    let cursor = isoHoje()
    if (!diasComRespostaSet.has(cursor)) cursor = somarDias(cursor, -1) // permite não ter respondido hoje ainda
    while (diasComRespostaSet.has(cursor)) {
      streak += 1
      cursor = somarDias(cursor, -1)
    }

    // questões cuja resposta mais recente foi errada
    const ultimaPorQuestao = new Map<string, boolean>()
    for (const r of lista) {
      if (!ultimaPorQuestao.has(r.questao_id)) ultimaPorQuestao.set(r.questao_id, r.correta)
    }
    const paraRevisao = Array.from(ultimaPorQuestao.values()).filter((correta) => !correta).length

    setIndicadores({
      questoesRespondidas: total,
      taxaAcerto: total > 0 ? Math.round((acertos / total) * 100) : 0,
      diasConsecutivos: streak,
      questoesParaRevisao: paraRevisao,
    })
  }

  async function carregarUltimoSimulado() {
    if (!profile) return
    const { data } = await supabase
      .from('simulado_tentativas')
      .select('acertos, erros, finalizado_em, simulados(titulo)')
      .eq('aluno_id', profile.id)
      .not('finalizado_em', 'is', null)
      .order('finalizado_em', { ascending: false })
      .limit(1)
    const t: any = data?.[0]
    if (t) {
      const totalT = t.acertos + t.erros
      setUltimoSimulado({
        titulo: t.simulados?.titulo || 'Simulado',
        pct: totalT > 0 ? Math.round((t.acertos / totalT) * 100) : 0,
        finalizadoEm: new Date(t.finalizado_em).toLocaleDateString('pt-BR'),
      })
    }
  }

  async function marcarConcluido(itemId: string, concluido: boolean) {
    if (!profile) return
    if (concluido) {
      await supabase.from('cronograma_conclusoes').delete().eq('cronograma_id', itemId).eq('aluno_id', profile.id)
    } else {
      await supabase.from('cronograma_conclusoes').insert({ cronograma_id: itemId, aluno_id: profile.id })
    }
    carregarItens()
  }

  useEffect(() => { setMostrarQuestoesDoDia(false) }, [selectedDate, turmaId])

  async function abrirQuestoesDoItem(itemId: string) {
    if (!questoesPorItem[itemId]) {
      const { data } = await supabase.from('cronograma_questoes').select('questoes(*, grupos_questoes(texto_base))').eq('cronograma_id', itemId)
      const questoes = (data || []).map((d: any) => d.questoes).filter(Boolean)
      setQuestoesPorItem((prev) => ({ ...prev, [itemId]: questoes }))
    }
  }

  async function abrirQuestoesDoDia() {
    if (mostrarQuestoesDoDia) { setMostrarQuestoesDoDia(false); return }
    setCarregandoQuestoesDoDia(true)
    await Promise.all(itensComQuestoes.map((item) => abrirQuestoesDoItem(item.id)))
    setCarregandoQuestoesDoDia(false)
    setMostrarQuestoesDoDia(true)
  }

  if (possuiTurma === false) return <SemTurma />

  const itensDoDia = todosItens.filter((i) => selectedDate >= i.data_inicio && selectedDate <= i.data_fim)
  const itensComQuestoes = itensDoDia.filter((i) => (contagemQuestoesPorItem[i.id] ?? 0) > 0)
  const totalQuestoesDoDia = itensComQuestoes.reduce((soma, i) => soma + (contagemQuestoesPorItem[i.id] ?? 0), 0)

  if (turmas.length === 0) {
    return <p className="text-ink/50 text-sm">Carregando…</p>
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="font-serif text-2xl text-ink">Olá, {profile?.nome.split(' ')[0]}</h1>
        {turmas.length > 1 && (
          <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="border border-ink/20 rounded px-3 py-1.5 text-sm bg-white">
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 mb-6">
        <MonthCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} markedDates={datasComItens} />

        <div className="bg-white border border-ink/10 rounded-lg shadow-sm p-5 flex flex-col">
          <h2 className="font-serif text-lg text-ink mb-1">
            Cronograma de {selectedDate === isoHoje() ? 'hoje' : new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
          </h2>
          <p className="text-ink/40 text-xs mb-4">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
          </p>

          <div className="space-y-2 flex-1">
            {itensDoDia.map((item) => {
              const feito = concluidos.has(item.id)
              const qtd = contagemQuestoesPorItem[item.id] ?? 0
              return (
                <div key={item.id} className={`border rounded-lg px-4 py-3 transition-colors ${feito ? 'border-ink/10 bg-paper/40' : 'border-ink/10'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={feito} onChange={() => marcarConcluido(item.id, feito)} className="mt-1 w-4 h-4" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.materias?.cor || '#1B2A4A' }} />
                        <p className={`text-sm font-medium ${feito ? 'text-ink/40 line-through' : 'text-ink'}`}>
                          {item.materias?.nome || 'Estudo'}{item.topicos?.nome ? ` — ${item.topicos.nome}` : ''}
                        </p>
                      </div>
                      {item.descricao && <p className="text-ink/50 text-sm mt-0.5 ml-4">{item.descricao}</p>}
                      {qtd > 0 && <p className="text-ink/40 text-xs mt-0.5 ml-4">{qtd} questão(ões) preparada(s) pelo professor</p>}
                    </div>
                  </label>
                </div>
              )
            })}
            {itensDoDia.length === 0 && <p className="text-ink/40 text-sm">Nada planejado para este dia.</p>}
          </div>

          {mostrarQuestoesDoDia && (
            <div className="mt-4 space-y-5 border-t border-ink/10 pt-4">
              {itensComQuestoes.map((item) => (
                <div key={item.id}>
                  <p className="text-xs font-medium text-ink/50 mb-2">
                    {item.materias?.nome || 'Estudo'}{item.topicos?.nome ? ` — ${item.topicos.nome}` : ''}
                  </p>
                  <div className="space-y-3">
                    {(questoesPorItem[item.id] || []).map((q) => (
                      <QuestionCard key={q.id} questao={q} turmaId={turmaId} onRespondida={carregarIndicadores} textoBase={q.grupos_questoes?.texto_base} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalQuestoesDoDia > 0 ? (
            <button
              onClick={abrirQuestoesDoDia}
              disabled={carregandoQuestoesDoDia}
              className="mt-5 flex items-center justify-between bg-ink text-white rounded-lg px-4 py-3 hover:bg-ink-light transition-colors disabled:opacity-60"
            >
              <div className="text-left">
                <p className="text-sm font-medium">{mostrarQuestoesDoDia ? 'Fechar questões do dia' : 'Ir para Questões'}</p>
                <p className="text-xs text-white/60">
                  {carregandoQuestoesDoDia ? 'Carregando…' : `${totalQuestoesDoDia} questão(ões) preparada(s) pra hoje`}
                </p>
              </div>
              <span className="text-lg">{mostrarQuestoesDoDia ? '×' : '→'}</span>
            </button>
          ) : (
            <p className="mt-5 text-ink/40 text-xs text-center">Seu professor ainda não vinculou questões para este dia.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <IndicadorCard label="Questões respondidas" value={indicadores.questoesRespondidas} />
        <IndicadorCard label="Taxa de acertos" value={`${indicadores.taxaAcerto}%`} cor={indicadores.taxaAcerto >= 70 ? 'text-acerto' : indicadores.taxaAcerto >= 50 ? 'text-gold' : 'text-erro'} />
        <IndicadorCard label="Dias consecutivos" value={indicadores.diasConsecutivos} cor="text-gold" />
        <Link to="/aluno/desempenho" className="bg-white border border-ink/10 rounded-lg p-4 shadow-sm hover:border-gold/40 transition-colors">
          <p className="text-ink/60 text-xs mb-1">Questões p/ revisão</p>
          <p className={`font-serif text-2xl ${indicadores.questoesParaRevisao > 0 ? 'text-erro' : 'text-ink'}`}>{indicadores.questoesParaRevisao}</p>
        </Link>
      </div>

      {ultimoSimulado && (
        <Link to="/aluno/simulados" className="mt-4 flex items-center justify-between bg-white border border-ink/10 rounded-lg p-4 shadow-sm hover:border-gold/40 transition-colors">
          <div>
            <p className="text-ink/50 text-xs">Último simulado</p>
            <p className="text-ink font-medium text-sm">{ultimoSimulado.titulo} — {ultimoSimulado.pct}% de acerto</p>
            <p className="text-ink/40 text-xs">Realizado em {ultimoSimulado.finalizadoEm}</p>
          </div>
          <span className="text-gold text-sm">Ver detalhes →</span>
        </Link>
      )}
    </div>
  )
}

function IndicadorCard({ label, value, cor }: { label: string; value: number | string; cor?: string }) {
  return (
    <div className="bg-white border border-ink/10 rounded-lg p-4 shadow-sm">
      <p className="text-ink/60 text-xs mb-1">{label}</p>
      <p className={`font-serif text-2xl ${cor || 'text-ink'}`}>{value}</p>
    </div>
  )
}
