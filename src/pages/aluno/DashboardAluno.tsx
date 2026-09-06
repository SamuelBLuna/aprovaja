import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Turma, CronogramaItem, Questao } from '../../lib/types'
import { isoHoje, somarDias, enumerarDatas } from '../../lib/dates'
import MonthCalendar from '../../components/MonthCalendar'
import QuestionCard from '../../components/QuestionCard'
import SemTurma from '../../components/SemTurma'
import { ListChecks, Target, Flame, AlertTriangle } from 'lucide-react'
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

  // conclusão manual (itens SEM questão vinculada) — por dia, não por item inteiro
  const [concluidos, setConcluidos] = useState<Set<string>>(new Set())

  // itens COM questão vinculada: conclusão é automática (responder todas)
  const [questaoIdsPorItem, setQuestaoIdsPorItem] = useState<Record<string, string[]>>({})
  const [respondidasPorItem, setRespondidasPorItem] = useState<Record<string, Set<string>>>({})
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

  useEffect(() => { if (turmaId && profile) carregarItens() }, [turmaId, profile])

  async function carregarItens() {
    if (!profile) return
    const { data } = await supabase.from('cronograma_itens').select('*, materias(nome, cor), topicos(nome)').eq('turma_id', turmaId)
    const itens = (data as ItemComMateria[]) || []
    setTodosItens(itens)
    const datas = new Set<string>()
    itens.forEach((i) => enumerarDatas(i.data_inicio, i.data_fim).forEach((d) => datas.add(d)))
    setDatasComItens(datas)

    // conclusão manual por dia (itens sem questão)
    const { data: conclusoes } = await supabase.from('cronograma_conclusoes').select('cronograma_id, data').eq('aluno_id', profile.id)
    setConcluidos(new Set((conclusoes || []).map((c: any) => `${c.cronograma_id}_${c.data}`)))

    // questões vinculadas a cada item, de uma vez só
    const { data: vinculos } = await supabase.from('cronograma_questoes').select('cronograma_id, questao_id').in('cronograma_id', itens.map((i) => i.id))
    const idsPorItem: Record<string, string[]> = {}
    for (const v of (vinculos as any[]) || []) {
      if (!idsPorItem[v.cronograma_id]) idsPorItem[v.cronograma_id] = []
      idsPorItem[v.cronograma_id].push(v.questao_id)
    }
    setQuestaoIdsPorItem(idsPorItem)

    const todosOsIds = Array.from(new Set(Object.values(idsPorItem).flat()))
    if (todosOsIds.length > 0) {
      const { data: respostas } = await supabase.from('respostas').select('questao_id').eq('aluno_id', profile.id).in('questao_id', todosOsIds)
      const respondidosSet = new Set((respostas || []).map((r: any) => r.questao_id))
      const porItem: Record<string, Set<string>> = {}
      for (const [itemId, ids] of Object.entries(idsPorItem)) {
        porItem[itemId] = new Set(ids.filter((id) => respondidosSet.has(id)))
      }
      setRespondidasPorItem(porItem)

      // backfill silencioso: se um item já está 100% respondido, registra a
      // conclusão automática pro professor conseguir ver isso no relatório dele
      for (const item of itens) {
        const ids = idsPorItem[item.id] || []
        if (ids.length > 0 && (porItem[item.id]?.size || 0) === ids.length) {
          marcarConclusaoAutomatica(item.id, item.data_inicio, false)
        }
      }
    } else {
      setRespondidasPorItem({})
    }
  }

  async function carregarIndicadores() {
    if (!profile) return
    const { data: respostas } = await supabase.from('respostas').select('correta, questao_id, created_at').eq('aluno_id', profile.id).order('created_at', { ascending: false })
    const lista = respostas || []
    const total = lista.length
    const acertos = lista.filter((r: any) => r.correta).length

    const diasComRespostaSet = new Set(lista.map((r: any) => r.created_at.slice(0, 10)))
    let streak = 0
    let cursor = isoHoje()
    if (!diasComRespostaSet.has(cursor)) cursor = somarDias(cursor, -1)
    while (diasComRespostaSet.has(cursor)) {
      streak += 1
      cursor = somarDias(cursor, -1)
    }

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

  // conclusão manual, só pra itens SEM questão — vale só pro dia selecionado
  async function marcarConcluidoManual(itemId: string, jaFeito: boolean) {
    if (!profile) return
    const chave = `${itemId}_${selectedDate}`
    if (jaFeito) {
      setConcluidos((prev) => { const next = new Set(prev); next.delete(chave); return next })
      await supabase.from('cronograma_conclusoes').delete().eq('cronograma_id', itemId).eq('aluno_id', profile.id).eq('data', selectedDate)
    } else {
      setConcluidos((prev) => new Set(prev).add(chave))
      await supabase.from('cronograma_conclusoes').insert({ cronograma_id: itemId, aluno_id: profile.id, data: selectedDate })
    }
  }

  // conclusão automática, pra itens COM questão — dispara quando a última é respondida
  async function marcarConclusaoAutomatica(itemId: string, dataReferencia: string, atualizarEstado = true) {
    if (!profile) return
    if (atualizarEstado) setConcluidos((prev) => new Set(prev).add(`${itemId}_${dataReferencia}`))
    await supabase.from('cronograma_conclusoes').upsert(
      { cronograma_id: itemId, aluno_id: profile.id, data: dataReferencia },
      { onConflict: 'cronograma_id,aluno_id,data', ignoreDuplicates: true }
    )
  }

  function handleQuestaoRespondida(item: ItemComMateria, questaoId: string) {
    setRespondidasPorItem((prev) => {
      const atual = new Set(prev[item.id] || [])
      atual.add(questaoId)
      const proximo = { ...prev, [item.id]: atual }
      const total = questaoIdsPorItem[item.id]?.length || 0
      if (total > 0 && atual.size === total) marcarConclusaoAutomatica(item.id, item.data_inicio)
      return proximo
    })
    carregarIndicadores()
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
  const itensComQuestoes = itensDoDia.filter((i) => (questaoIdsPorItem[i.id]?.length ?? 0) > 0)
  const itensSemQuestao = itensDoDia.filter((i) => (questaoIdsPorItem[i.id]?.length ?? 0) === 0)
  const totalQuestoesDoDia = itensComQuestoes.reduce((soma, i) => soma + (questaoIdsPorItem[i.id]?.length ?? 0), 0)

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

        <div className="bg-white border border-ink/10 rounded-lg shadow-sm p-5 flex flex-col min-w-0">
          <h2 className="font-serif text-lg text-ink mb-1">
            Cronograma de {selectedDate === isoHoje() ? 'hoje' : new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
          </h2>
          <p className="text-ink/40 text-xs mb-4">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
          </p>

          <div className="space-y-2 flex-1">
            {itensSemQuestao.map((item) => {
              const feito = concluidos.has(`${item.id}_${selectedDate}`)
              return (
                <div key={item.id} className={`border rounded-lg px-4 py-3 transition-colors ${feito ? 'border-ink/10 bg-paper/40' : 'border-ink/10'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={feito} onChange={() => marcarConcluidoManual(item.id, feito)} className="mt-1 w-4 h-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.materias?.cor || '#1B2A4A' }} />
                        <p className={`text-sm font-medium ${feito ? 'text-ink/40 line-through' : 'text-ink'}`}>
                          {item.materias?.nome || 'Estudo'}{item.topicos?.nome ? ` — ${item.topicos.nome}` : ''}
                        </p>
                      </div>
                      {item.descricao && <p className="text-ink/50 text-sm mt-0.5 ml-4">{item.descricao}</p>}
                    </div>
                  </label>
                </div>
              )
            })}

            {itensComQuestoes.map((item) => {
              const total = questaoIdsPorItem[item.id]?.length || 0
              const feitas = respondidasPorItem[item.id]?.size || 0
              const completo = total > 0 && feitas === total
              return (
                <div key={item.id} className={`border rounded-lg px-4 py-3 ${completo ? 'border-acerto/30 bg-acerto/5' : 'border-ink/10'}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[10px] ${completo ? 'bg-acerto text-white' : 'border border-ink/30'}`}>
                      {completo ? '✓' : ''}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.materias?.cor || '#1B2A4A' }} />
                        <p className={`text-sm font-medium ${completo ? 'text-ink/50' : 'text-ink'}`}>
                          {item.materias?.nome || 'Estudo'}{item.topicos?.nome ? ` — ${item.topicos.nome}` : ''}
                        </p>
                      </div>
                      {item.descricao && <p className="text-ink/50 text-sm mt-0.5 ml-4">{item.descricao}</p>}
                      <p className="text-ink/40 text-xs mt-0.5 ml-4">
                        {completo ? 'Concluído — todas as questões respondidas' : `${feitas}/${total} questões respondidas`}
                      </p>
                    </div>
                  </div>
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
                      <QuestionCard
                        key={q.id}
                        questao={q}
                        turmaId={turmaId}
                        onRespondida={() => handleQuestaoRespondida(item, q.id)}
                        textoBase={q.grupos_questoes?.texto_base}
                      />
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
        <IndicadorCard icon={ListChecks} label="Questões respondidas" value={indicadores.questoesRespondidas} />
        <IndicadorCard icon={Target} label="Taxa de acertos" value={`${indicadores.taxaAcerto}%`} cor={indicadores.taxaAcerto >= 70 ? 'text-acerto' : indicadores.taxaAcerto >= 50 ? 'text-gold' : 'text-erro'} />
        <IndicadorCard icon={Flame} label="Dias consecutivos" value={indicadores.diasConsecutivos} cor="text-gold" />
        <Link to="/aluno/desempenho" className="bg-white border border-ink/10 rounded-lg p-4 shadow-sm hover:border-gold/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-1">
            <p className="text-ink/60 text-xs">Questões p/ revisão</p>
            <AlertTriangle className={`w-4 h-4 ${indicadores.questoesParaRevisao > 0 ? 'text-erro' : 'text-ink/20'}`} />
          </div>
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

function IndicadorCard({ label, value, cor, icon: Icon }: { label: string; value: number | string; cor?: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-white border border-ink/10 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1">
        <p className="text-ink/60 text-xs">{label}</p>
        <Icon className="w-4 h-4 text-ink/25" />
      </div>
      <p className={`font-serif text-2xl ${cor || 'text-ink'}`}>{value}</p>
    </div>
  )
}
