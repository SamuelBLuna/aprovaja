import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Turma, Materia, Topico, CronogramaItem, Questao } from '../../lib/types'
import MonthCalendar from '../../components/MonthCalendar'
import { isoHoje } from '../../lib/dates'
import GerenciarTurma from '../../components/GerenciarTurma'

type ItemComMateria = CronogramaItem & { materias?: { nome: string; cor: string } | null; topicos?: { nome: string } | null }

function hoje() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function gerarCodigo(nome: string) {
  const base = nome.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'TURMA'
  const numero = Math.floor(1000 + Math.random() * 9000)
  return `${base}${numero}`
}

function enumerarDatas(inicio: string, fim: string): string[] {
  const datas: string[] = []
  let cursor = new Date(inicio + 'T00:00:00')
  const fimDate = new Date(fim + 'T00:00:00')
  while (cursor <= fimDate) {
    const y = cursor.getFullYear(), m = cursor.getMonth() + 1, d = cursor.getDate()
    datas.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return datas
}

function embaralhar<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Cronograma() {
  const { profile } = useAuth()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [showNovaTurma, setShowNovaTurma] = useState(false)
  const [nomeTurma, setNomeTurma] = useState('')
  const [dataInicioTurma, setDataInicioTurma] = useState(hoje())
  const [dataFimTurma, setDataFimTurma] = useState('')

  const [materias, setMaterias] = useState<Materia[]>([])
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [questoesDisponiveis, setQuestoesDisponiveis] = useState<Questao[]>([])

  const [selectedDate, setSelectedDate] = useState(hoje())
  const [todosItens, setTodosItens] = useState<ItemComMateria[]>([])
  const [datasComItens, setDatasComItens] = useState<Set<string>>(new Set())

  const [showForm, setShowForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [dataInicioForm, setDataInicioForm] = useState(hoje())
  const [dataFimForm, setDataFimForm] = useState(hoje())
  const [descricao, setDescricao] = useState('')
  const [materiaId, setMateriaId] = useState('')
  const [topicoId, setTopicoId] = useState('')
  const [showGerenciar, setShowGerenciar] = useState(false)

  // seleção de questões (manual ou sorteio) — igual ao padrão usado em Simulados
  const [modoSelecao, setModoSelecao] = useState<'manual' | 'aleatorio'>('manual')
  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<Map<string, Questao>>(new Map())
  const [topicoAleatorio, setTopicoAleatorio] = useState('')
  const [quantidadeAleatoria, setQuantidadeAleatoria] = useState(5)

  useEffect(() => {
    supabase.from('turmas').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setTurmas((data as Turma[]) || [])
      if (data && data.length > 0) setTurmaId(data[0].id)
    })
    supabase.from('materias').select('*').order('nome').then(({ data }) => setMaterias((data as Materia[]) || []))
  }, [])

  useEffect(() => { if (turmaId) carregarItens() }, [turmaId])

  useEffect(() => {
    if (!materiaId) { setTopicos([]); setQuestoesDisponiveis([]); return }
    supabase.from('topicos').select('*').eq('materia_id', materiaId).order('ordem').then(({ data }) => setTopicos((data as Topico[]) || []))
    supabase.from('questoes').select('*').eq('materia_id', materiaId).then(({ data }) => setQuestoesDisponiveis((data as Questao[]) || []))
  }, [materiaId])

  async function carregarItens() {
    const { data } = await supabase.from('cronograma_itens').select('*, materias(nome, cor), topicos(nome)').eq('turma_id', turmaId)
    const itens = (data as ItemComMateria[]) || []
    setTodosItens(itens)
    const datas = new Set<string>()
    itens.forEach((i) => enumerarDatas(i.data_inicio, i.data_fim).forEach((d) => datas.add(d)))
    setDatasComItens(datas)
  }

  const itensDoDia = todosItens.filter((i) => selectedDate >= i.data_inicio && selectedDate <= i.data_fim)

  async function criarTurma(e: FormEvent) {
    e.preventDefault()
    if (!profile || !nomeTurma.trim() || !dataFimTurma) return
    const codigo = gerarCodigo(nomeTurma)
    const { data, error } = await supabase.from('turmas').insert({
      nome: nomeTurma.trim(), codigo_turma: codigo, data_inicio: dataInicioTurma, data_fim: dataFimTurma, created_by: profile.id,
    }).select().single()
    if (!error && data) {
      setNomeTurma(''); setDataFimTurma(''); setShowNovaTurma(false)
      setTurmas((prev) => [data as Turma, ...prev])
      setTurmaId((data as Turma).id)
    } else if (error) {
      alert('Erro ao criar turma: ' + error.message)
    }
  }

  async function encerrarTurma() {
    if (!confirm('Encerrar esta turma? Os alunos perderão o acesso e nenhuma nova atividade poderá ser criada. O histórico é mantido.')) return
    const { error } = await supabase.rpc('encerrar_turma', { p_turma_id: turmaId })
    if (!error) setTurmas((prev) => prev.map((t) => (t.id === turmaId ? { ...t, status: 'encerrada' } : t)))
  }

  function resetForm() {
    setDataInicioForm(selectedDate); setDataFimForm(selectedDate)
    setDescricao(''); setMateriaId(''); setTopicoId(''); setQuestoesSelecionadas(new Map())
    setModoSelecao('manual'); setTopicoAleatorio(''); setQuantidadeAleatoria(5)
    setEditandoId(null)
  }

  async function abrirEdicao(item: ItemComMateria) {
    setEditandoId(item.id)
    setDataInicioForm(item.data_inicio)
    setDataFimForm(item.data_fim)
    setDescricao(item.descricao || '')
    setMateriaId(item.materia_id || '')
    setTopicoId(item.topico_id || '')
    setModoSelecao('manual'); setTopicoAleatorio(''); setQuantidadeAleatoria(5)

    const { data } = await supabase.from('cronograma_questoes').select('questoes(*)').eq('cronograma_id', item.id)
    const atuais = (data || []).map((r: any) => r.questoes).filter(Boolean) as Questao[]
    setQuestoesSelecionadas(new Map(atuais.map((q) => [q.id, q])))

    setShowForm(true)
  }

  function abrirNovo() {
    resetForm()
    setShowForm(true)
  }

  async function salvarItem(e: FormEvent) {
    e.preventDefault()
    if (!profile || !turmaId || !materiaId || !dataInicioForm || !dataFimForm) return
    if (dataFimForm < dataInicioForm) { alert('A data final não pode ser antes da data inicial.'); return }

    if (editandoId) {
      const { error } = await supabase.from('cronograma_itens').update({
        data_inicio: dataInicioForm, data_fim: dataFimForm, descricao: descricao.trim() || null,
        materia_id: materiaId, topico_id: topicoId || null,
      }).eq('id', editandoId)
      if (error) { alert('Erro ao salvar: ' + error.message); return }

      await supabase.from('cronograma_questoes').delete().eq('cronograma_id', editandoId)
      if (questoesSelecionadas.size > 0) {
        const rows = Array.from(questoesSelecionadas.keys()).map((qId) => ({ cronograma_id: editandoId, questao_id: qId }))
        await supabase.from('cronograma_questoes').insert(rows)
      }
      resetForm(); setShowForm(false); carregarItens()
      return
    }

    const { data, error } = await supabase.from('cronograma_itens').insert({
      turma_id: turmaId, data_inicio: dataInicioForm, data_fim: dataFimForm, descricao: descricao.trim() || null,
      materia_id: materiaId, topico_id: topicoId || null, created_by: profile.id,
    }).select().single()

    if (!error && data) {
      const cronogramaId = (data as CronogramaItem).id
      if (questoesSelecionadas.size > 0) {
        const rows = Array.from(questoesSelecionadas.keys()).map((qId) => ({ cronograma_id: cronogramaId, questao_id: qId }))
        await supabase.from('cronograma_questoes').insert(rows)
      }
      resetForm()
      setShowForm(false)
      carregarItens()
    }
  }

  async function excluirItem(id: string) {
    if (!confirm('Remover este item do cronograma?')) return
    await supabase.from('cronograma_itens').delete().eq('id', id)
    carregarItens()
  }

  function toggleQuestaoManual(q: Questao) {
    setQuestoesSelecionadas((prev) => {
      const next = new Map(prev)
      if (next.has(q.id)) next.delete(q.id); else next.set(q.id, q)
      return next
    })
  }

  function removerSelecionada(id: string) {
    setQuestoesSelecionadas((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }

  async function sortear() {
    let query = supabase.from('questoes').select('*').eq('materia_id', materiaId)
    if (topicoAleatorio) query = query.eq('topico_id', topicoAleatorio)
    const { data } = await query
    const pool = embaralhar((data as Questao[]) || []).slice(0, quantidadeAleatoria)
    setQuestoesSelecionadas((prev) => {
      const next = new Map(prev)
      pool.forEach((q) => next.set(q.id, q))
      return next
    })
  }

  useEffect(() => { setShowGerenciar(false) }, [turmaId])

  const turmaAtual = turmas.find((t) => t.id === turmaId)

  function handleTurmaAtualizada(atualizada: Turma) {
    setTurmas((prev) => prev.map((t) => (t.id === atualizada.id ? atualizada : t)))
  }

  function handleTurmaExcluida() {
    setTurmas((prev) => {
      const restantes = prev.filter((t) => t.id !== turmaId)
      setTurmaId(restantes.length > 0 ? restantes[0].id : '')
      return restantes
    })
    setShowGerenciar(false)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="font-serif text-[26px] text-ink">Cronograma</h1>
        <button onClick={() => setShowNovaTurma((v) => !v)} className="border border-ink/15 text-ink px-3 py-2 rounded-lg text-sm hover:bg-ink/5 transition-colors bg-white">
          {showNovaTurma ? 'Cancelar' : '+ Nova turma'}
        </button>
      </div>

      {showNovaTurma && (
        <form onSubmit={criarTurma} className="bg-white border border-ink/[0.07] rounded-xl shadow-soft p-5 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs text-ink/60 mb-1">Nome da turma</label>
            <input required value={nomeTurma} onChange={(e) => setNomeTurma(e.target.value)} placeholder="Ex: TRT 2ª Região 2026"
              className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm focus:border-gold" />
          </div>
          <div>
            <label className="block text-xs text-ink/60 mb-1">Início</label>
            <input required type="date" value={dataInicioTurma} onChange={(e) => setDataInicioTurma(e.target.value)}
              className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-ink/60 mb-1">Fim (data da prova)</label>
            <input required type="date" value={dataFimTurma} onChange={(e) => setDataFimTurma(e.target.value)}
              className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button className="sm:col-span-4 bg-ink text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-ink-light transition-colors shadow-soft">Criar turma</button>
        </form>
      )}

      {turmas.length === 0 ? (
        <p className="text-ink/60 text-sm">Crie sua primeira turma para montar o cronograma.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-3 bg-white border border-ink/[0.07] rounded-xl shadow-soft px-4 py-3">
            <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="border border-ink/15 rounded-lg px-3 py-1.5 text-sm bg-white">
              {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}{t.status === 'encerrada' ? ' (encerrada)' : ''}</option>)}
            </select>
            {turmaAtual && (
              <>
                <span className="text-sm text-ink/60">Código: <strong className="text-ink">{turmaAtual.codigo_turma}</strong></span>
                <span className="text-sm text-ink/60 hidden sm:inline">{turmaAtual.data_inicio} até {turmaAtual.data_fim}</span>
                <button onClick={() => setShowGerenciar((v) => !v)} className="text-gold text-sm hover:underline">
                  {showGerenciar ? 'Fechar gerenciamento' : 'Gerenciar turma'}
                </button>
                {turmaAtual.status === 'ativa' && (
                  <button onClick={encerrarTurma} className="sm:ml-auto text-erro text-sm hover:underline">Encerrar turma</button>
                )}
              </>
            )}
          </div>

          {turmaAtual && turmaAtual.status === 'ativa' && turmaAtual.data_fim < isoHoje() && (
            <div className="bg-gold/10 border border-gold/30 rounded px-4 py-3 mb-6 text-sm text-ink flex items-center justify-between gap-3">
              <span>Essa turma passou da data final ({turmaAtual.data_fim}) mas ainda não foi encerrada. Novas atividades já ficam bloqueadas automaticamente — mas os alunos continuam com acesso até você encerrar de vez.</span>
              <button onClick={encerrarTurma} className="text-erro font-medium hover:underline shrink-0">Encerrar agora</button>
            </div>
          )}

          {showGerenciar && turmaAtual && (
            <GerenciarTurma
              turma={turmaAtual}
              onFechar={() => setShowGerenciar(false)}
              onAtualizada={handleTurmaAtualizada}
              onExcluida={handleTurmaExcluida}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
            <MonthCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} markedDates={datasComItens} />

            <div className="min-w-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-lg text-ink">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </h2>
                {turmaAtual?.status === 'ativa' ? (
                  <button onClick={abrirNovo} className="bg-ink text-white px-3 py-1.5 rounded text-sm hover:bg-ink-light">
                    + Adicionar atividade
                  </button>
                ) : (
                  <span className="text-xs text-ink/40 italic">Turma encerrada — sem novas atividades</span>
                )}
              </div>

              {showForm && (
                <form onSubmit={salvarItem} className="bg-white border border-ink/[0.07] rounded-xl shadow-soft p-4 mb-4 space-y-3">
                  <p className="text-sm text-ink/60">
                    {editandoId ? 'Editando atividade' : 'Defina o período em que os alunos vão estudar isso — pode ser um único dia ou várias semanas.'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-ink/60 mb-1">De</label>
                      <input required type="date" value={dataInicioForm} onChange={(e) => setDataInicioForm(e.target.value)}
                        className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-ink/60 mb-1">Até</label>
                      <input required type="date" value={dataFimForm} onChange={(e) => setDataFimForm(e.target.value)}
                        className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select required value={materiaId} onChange={(e) => setMateriaId(e.target.value)} className="border border-ink/15 rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="">Matéria *</option>
                      {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                    <select value={topicoId} onChange={(e) => setTopicoId(e.target.value)} disabled={!materiaId} className="border border-ink/15 rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="">Tópico (opcional)</option>
                      {topicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                  <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} placeholder="Descrição / observações (opcional)"
                    className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm focus:border-gold" />

                  {materiaId && (
                    <div className="border-t border-ink/10 pt-3">
                      <p className="text-xs text-ink/60 mb-2">Questões vinculadas a esta atividade (opcional):</p>

                      {questoesSelecionadas.size > 0 && (
                        <div className="bg-paper/60 border border-ink/10 rounded p-2 mb-2 max-h-32 overflow-y-auto space-y-1">
                          {Array.from(questoesSelecionadas.values()).map((q) => (
                            <div key={q.id} className="flex items-start justify-between gap-2 text-xs bg-white border border-ink/10 rounded px-2 py-1.5">
                              <span className="text-ink/80">{q.enunciado.slice(0, 90)}{q.enunciado.length > 90 ? '…' : ''}</span>
                              <button type="button" onClick={() => removerSelecionada(q.id)} className="text-erro shrink-0 hover:underline">remover</button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-3 text-xs mb-2">
                        <button type="button" onClick={() => setModoSelecao('manual')} className={modoSelecao === 'manual' ? 'text-ink font-medium underline' : 'text-ink/50'}>Escolher manualmente</button>
                        <button type="button" onClick={() => setModoSelecao('aleatorio')} className={modoSelecao === 'aleatorio' ? 'text-ink font-medium underline' : 'text-ink/50'}>Sortear questões</button>
                      </div>

                      {modoSelecao === 'manual' ? (
                        <div className="max-h-32 overflow-y-auto border border-ink/10 rounded p-2 space-y-1">
                          {questoesDisponiveis.map((q) => (
                            <label key={q.id} className="flex items-start gap-2 text-xs">
                              <input type="checkbox" checked={questoesSelecionadas.has(q.id)} onChange={() => toggleQuestaoManual(q)} className="mt-0.5" />
                              <span className="text-ink/80">{q.enunciado.slice(0, 90)}{q.enunciado.length > 90 ? '…' : ''}</span>
                            </label>
                          ))}
                          {questoesDisponiveis.length === 0 && <p className="text-ink/40 text-xs">Nenhuma questão nesta matéria ainda.</p>}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-end gap-2">
                          <select value={topicoAleatorio} onChange={(e) => setTopicoAleatorio(e.target.value)} className="border border-ink/15 rounded-lg px-2 py-1.5 text-xs bg-white">
                            <option value="">Qualquer tópico</option>
                            {topicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                          </select>
                          <input type="number" min={1} value={quantidadeAleatoria} onChange={(e) => setQuantidadeAleatoria(Number(e.target.value))}
                            className="w-16 border border-ink/15 rounded-lg px-2 py-1.5 text-xs" />
                          <button type="button" onClick={sortear} className="border border-ink/15 rounded-lg px-3 py-1.5 text-xs hover:bg-ink/5">Sortear</button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button className="bg-ink text-white px-4 py-2.5 rounded-lg text-sm hover:bg-ink-light transition-colors shadow-soft">{editandoId ? 'Salvar alterações' : 'Salvar no cronograma'}</button>
                    <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="text-ink/60 text-sm hover:underline">Cancelar</button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {itensDoDia.map((item) => (
                  <div key={item.id} className="bg-white border border-ink/[0.07] rounded-xl shadow-soft px-4 py-3 flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.materias?.cor || '#1B2A4A' }} />
                        <p className="text-ink font-medium text-sm truncate">{item.materias?.nome || 'Sem matéria'}{item.topicos?.nome ? ` — ${item.topicos.nome}` : ''}</p>
                      </div>
                      {item.descricao && <p className="text-ink/60 text-sm mt-1 ml-4">{item.descricao}</p>}
                      {item.data_inicio !== item.data_fim && (
                        <p className="text-ink/40 text-xs mt-1 ml-4">Período: {item.data_inicio} até {item.data_fim}</p>
                      )}
                    </div>
                    <div className="flex gap-3 shrink-0 ml-3">
                      <button onClick={() => abrirEdicao(item)} className="text-gold text-xs hover:underline">Editar</button>
                      <button onClick={() => excluirItem(item.id)} className="text-erro text-xs hover:underline">Remover</button>
                    </div>
                  </div>
                ))}
                {itensDoDia.length === 0 && <p className="text-ink/40 text-sm">Nada planejado para este dia ainda.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
