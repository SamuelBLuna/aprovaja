import { useEffect, useState, FormEvent } from 'react'
import { Plus, BarChart3, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Turma, Materia, Topico, Questao, Simulado, SimuladoTentativa } from '../../lib/types'
import { isoHoje } from '../../lib/dates'
import PageHeader from '../../components/ui/PageHeader'

function embaralhar<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function estaAtivaDeVerdade(t: Turma) {
  return t.status === 'ativa' && t.data_fim >= isoHoje()
}

function datetimeLocalParaISO(valor: string): string | null {
  if (!valor) return null
  return new Date(valor).toISOString()
}

function isoParaDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatarTempo(segundos: number) {
  const s = Math.max(0, Math.floor(segundos))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

interface TentativaComAluno extends SimuladoTentativa {
  profiles?: { nome: string; email: string } | null
}
interface RespostaDetalhe {
  questao_id: string
  resposta_dada: string
  correta: boolean
  questoes: Questao & { materias?: { nome: string } | null }
}

export default function Simulados() {
  const { profile } = useAuth()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [simulados, setSimulados] = useState<(Simulado & { turmas?: { nome: string } })[]>([])

  const [showForm, setShowForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [turmaId, setTurmaId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tempoLimite, setTempoLimite] = useState(60)
  const [dataLimite, setDataLimite] = useState('')

  const [modo, setModo] = useState<'manual' | 'aleatorio'>('manual')
  const [materiaId, setMateriaId] = useState('')
  const [questoesFiltradas, setQuestoesFiltradas] = useState<Questao[]>([])
  const [selecionadas, setSelecionadas] = useState<Map<string, Questao>>(new Map())
  const [ordemMaterias, setOrdemMaterias] = useState<string[]>([]) // ordem em que as matérias aparecem na prova
  const [topicoAleatorio, setTopicoAleatorio] = useState('')
  const [quantidade, setQuantidade] = useState(10)

  // resultados
  const [verResultadosId, setVerResultadosId] = useState<string | null>(null)
  const [resultados, setResultados] = useState<Record<string, TentativaComAluno[]>>({})
  const [alunoExpandidoId, setAlunoExpandidoId] = useState<string | null>(null)
  const [detalhesPorTentativa, setDetalhesPorTentativa] = useState<Record<string, RespostaDetalhe[]>>({})

  useEffect(() => {
    supabase.from('turmas').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setTurmas((data as Turma[]) || [])
      if (data && data.length > 0) setTurmaId(data[0].id)
    })
    supabase.from('materias').select('*').order('nome').then(({ data }) => setMaterias((data as Materia[]) || []))
    carregarSimulados()
  }, [])

  async function carregarSimulados() {
    const { data } = await supabase.from('simulados').select('*, turmas(nome)').order('created_at', { ascending: false })
    setSimulados((data as any) || [])
  }

  useEffect(() => {
    if (!materiaId) { setTopicos([]); setQuestoesFiltradas([]); return }
    supabase.from('topicos').select('*').eq('materia_id', materiaId).order('ordem').then(({ data }) => setTopicos((data as Topico[]) || []))
    supabase.from('questoes').select('*').eq('materia_id', materiaId).then(({ data }) => setQuestoesFiltradas((data as Questao[]) || []))
  }, [materiaId])

  function nomeDaMateria(id: string) {
    return materias.find((m) => m.id === id)?.nome || 'Matéria'
  }

  function garantirNaOrdem(materiaIdNova: string) {
    setOrdemMaterias((prev) => (prev.includes(materiaIdNova) ? prev : [...prev, materiaIdNova]))
  }

  function toggleManual(q: Questao) {
    setSelecionadas((prev) => {
      const next = new Map(prev)
      if (next.has(q.id)) next.delete(q.id); else next.set(q.id, q)
      return next
    })
    garantirNaOrdem(q.materia_id)
  }

  function removerSelecionada(id: string) {
    setSelecionadas((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }

  async function sortear() {
    let query = supabase.from('questoes').select('*').eq('materia_id', materiaId)
    if (topicoAleatorio) query = query.eq('topico_id', topicoAleatorio)
    const { data } = await query
    const pool = embaralhar((data as Questao[]) || []).slice(0, quantidade)
    setSelecionadas((prev) => {
      const next = new Map(prev)
      pool.forEach((q) => next.set(q.id, q))
      return next
    })
    garantirNaOrdem(materiaId)
  }

  function moverMateria(indice: number, direcao: -1 | 1) {
    setOrdemMaterias((prev) => {
      const novo = [...prev]
      const alvo = indice + direcao
      if (alvo < 0 || alvo >= novo.length) return prev
      ;[novo[indice], novo[alvo]] = [novo[alvo], novo[indice]]
      return novo
    })
  }

  // matérias com pelo menos 1 questão selecionada, na ordem escolhida
  const materiasComSelecao = ordemMaterias.filter((mid) => Array.from(selecionadas.values()).some((q) => q.materia_id === mid))

  function questoesFinaisOrdenadas(): Questao[] {
    const resultado: Questao[] = []
    for (const mid of materiasComSelecao) {
      for (const q of selecionadas.values()) {
        if (q.materia_id === mid) resultado.push(q)
      }
    }
    return resultado
  }

  function resetForm() {
    setTitulo(''); setDescricao(''); setTempoLimite(60); setDataLimite('')
    setMateriaId(''); setSelecionadas(new Map()); setOrdemMaterias([]); setTopicoAleatorio(''); setQuantidade(10)
    setEditandoId(null)
  }

  function abrirNovo() {
    resetForm()
    const ativas = turmas.filter(estaAtivaDeVerdade)
    if (!ativas.find((t) => t.id === turmaId) && ativas.length > 0) setTurmaId(ativas[0].id)
    setShowForm(true)
  }

  async function abrirEdicao(s: Simulado) {
    setEditandoId(s.id)
    setTurmaId(s.turma_id)
    setTitulo(s.titulo)
    setDescricao(s.descricao || '')
    setTempoLimite(s.tempo_limite_minutos)
    setDataLimite(isoParaDatetimeLocal(s.data_limite))
    setMateriaId('')

    const { data } = await supabase.from('simulado_questoes').select('ordem, questoes(*)').eq('simulado_id', s.id).order('ordem')
    const questoesAtuais = (data || []).map((r: any) => r.questoes).filter(Boolean) as Questao[]
    setSelecionadas(new Map(questoesAtuais.map((q) => [q.id, q])))

    const ordemInicial: string[] = []
    questoesAtuais.forEach((q) => { if (!ordemInicial.includes(q.materia_id)) ordemInicial.push(q.materia_id) })
    setOrdemMaterias(ordemInicial)

    setShowForm(true)
  }

  async function salvarSimulado(e: FormEvent) {
    e.preventDefault()
    if (!profile || !titulo.trim() || !turmaId || selecionadas.size === 0) {
      alert('Escolha ao menos uma questão para o simulado.')
      return
    }
    const questoesEmOrdem = questoesFinaisOrdenadas()

    if (editandoId) {
      const { error } = await supabase.from('simulados').update({
        turma_id: turmaId, titulo: titulo.trim(), descricao: descricao.trim() || null,
        tempo_limite_minutos: tempoLimite, data_limite: datetimeLocalParaISO(dataLimite),
      }).eq('id', editandoId)
      if (error) { alert('Erro ao salvar: ' + error.message); return }

      await supabase.from('simulado_questoes').delete().eq('simulado_id', editandoId)
      const rows = questoesEmOrdem.map((q, i) => ({ simulado_id: editandoId, questao_id: q.id, ordem: i }))
      await supabase.from('simulado_questoes').insert(rows)

      resetForm(); setShowForm(false); carregarSimulados()
      return
    }

    const { data, error } = await supabase.from('simulados').insert({
      turma_id: turmaId, professor_id: profile.id, titulo: titulo.trim(), descricao: descricao.trim() || null,
      tempo_limite_minutos: tempoLimite, data_limite: datetimeLocalParaISO(dataLimite),
    }).select().single()

    if (!error && data) {
      const rows = questoesEmOrdem.map((q, i) => ({ simulado_id: (data as Simulado).id, questao_id: q.id, ordem: i }))
      await supabase.from('simulado_questoes').insert(rows)
      resetForm()
      setShowForm(false)
      carregarSimulados()
    } else if (error) {
      alert('Erro ao criar simulado: ' + error.message)
    }
  }

  async function excluirSimulado(id: string) {
    if (!confirm('Excluir este simulado? As tentativas dos alunos também serão apagadas.')) return
    await supabase.from('simulados').delete().eq('id', id)
    carregarSimulados()
  }

  async function abrirResultados(simuladoId: string) {
    if (verResultadosId === simuladoId) { setVerResultadosId(null); return }
    setVerResultadosId(simuladoId)
    setAlunoExpandidoId(null)
    if (!resultados[simuladoId]) {
      const { data } = await supabase
        .from('simulado_tentativas')
        .select('*, profiles(nome, email)')
        .eq('simulado_id', simuladoId)
        .order('finalizado_em', { ascending: false, nullsFirst: false })
      setResultados((prev) => ({ ...prev, [simuladoId]: (data as any) || [] }))
    }
  }

  async function abrirDetalheAluno(tentativaId: string) {
    if (alunoExpandidoId === tentativaId) { setAlunoExpandidoId(null); return }
    setAlunoExpandidoId(tentativaId)
    if (!detalhesPorTentativa[tentativaId]) {
      const { data } = await supabase.from('respostas').select('questao_id, resposta_dada, correta, questoes(*, materias(nome))').eq('tentativa_id', tentativaId)
      setDetalhesPorTentativa((prev) => ({ ...prev, [tentativaId]: (data as any) || [] }))
    }
  }

  const turmasAtivas = turmas.filter(estaAtivaDeVerdade)
  const turmasParaSelecionar = editandoId ? turmas : turmasAtivas

  return (
    <div>
      <PageHeader
        title="Simulados"
        subtitle="Monte provas completas, na ordem certa das matérias."
        actions={turmasAtivas.length > 0 ? (
          <button onClick={() => (showForm ? (setShowForm(false), resetForm()) : abrirNovo())} className="flex items-center gap-1.5 bg-ink text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-ink-light transition-colors shadow-soft">
            <Plus className="w-4 h-4" /> {showForm ? 'Cancelar' : 'Novo simulado'}
          </button>
        ) : undefined}
      />

      {showForm && (
        <form onSubmit={salvarSimulado} className="bg-white border border-ink/[0.07] rounded-xl shadow-soft p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="border border-ink/15 rounded-lg px-3 py-2 text-sm bg-white">
              {turmasParaSelecionar.map((t) => <option key={t.id} value={t.id}>{t.nome}{t.status === 'encerrada' ? ' (encerrada)' : ''}</option>)}
            </select>
            <input required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do simulado" className="sm:col-span-2 border border-ink/15 rounded-lg px-3 py-2 text-sm focus:border-gold" />
            <input type="number" min={5} value={tempoLimite} onChange={(e) => setTempoLimite(Number(e.target.value))} className="border border-ink/15 rounded-lg px-3 py-2 text-sm" placeholder="Minutos" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)" className="border border-ink/15 rounded-lg px-3 py-2 text-sm focus:border-gold" />
            <div>
              <label className="text-xs text-ink/60 mr-2">Disponível até (opcional):</label>
              <input type="datetime-local" value={dataLimite} onChange={(e) => setDataLimite(e.target.value)} className="border border-ink/15 rounded-lg px-3 py-1.5 text-sm" />
            </div>
          </div>

          {materiasComSelecao.length > 0 && (
            <div className="bg-paper/60 border border-ink/10 rounded p-3">
              <p className="text-sm text-ink font-medium mb-2">Ordem das matérias na prova</p>
              <div className="space-y-2">
                {materiasComSelecao.map((mid, i) => {
                  const questoesDaMateria = Array.from(selecionadas.values()).filter((q) => q.materia_id === mid)
                  return (
                    <div key={mid} className="bg-white border border-ink/10 rounded">
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm text-ink font-medium">{i + 1}. {nomeDaMateria(mid)} <span className="text-ink/40 font-normal">({questoesDaMateria.length} questões)</span></span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" onClick={() => moverMateria(i, -1)} disabled={i === 0} className="w-6 h-6 rounded hover:bg-ink/5 disabled:opacity-20 text-ink/60">↑</button>
                          <button type="button" onClick={() => moverMateria(i, 1)} disabled={i === materiasComSelecao.length - 1} className="w-6 h-6 rounded hover:bg-ink/5 disabled:opacity-20 text-ink/60">↓</button>
                        </div>
                      </div>
                      <div className="border-t border-ink/10 px-3 py-2 space-y-1 max-h-28 overflow-y-auto">
                        {questoesDaMateria.map((q) => (
                          <div key={q.id} className="flex items-start justify-between gap-2 text-xs">
                            <span className="text-ink/70">{q.enunciado.slice(0, 80)}{q.enunciado.length > 80 ? '…' : ''}</span>
                            <button type="button" onClick={() => removerSelecionada(q.id)} className="text-erro shrink-0 hover:underline">remover</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-ink/40 mt-2">As setas mudam a ordem em que as matérias aparecem pro aluno — útil pra seguir a ordem oficial do edital.</p>
            </div>
          )}

          <div className="flex gap-4 border-b border-ink/10 pb-2">
            <button type="button" onClick={() => setModo('manual')} className={`text-sm ${modo === 'manual' ? 'text-ink font-medium border-b-2 border-gold' : 'text-ink/50'}`}>Escolher manualmente</button>
            <button type="button" onClick={() => setModo('aleatorio')} className={`text-sm ${modo === 'aleatorio' ? 'text-ink font-medium border-b-2 border-gold' : 'text-ink/50'}`}>Sortear questões</button>
          </div>

          <select value={materiaId} onChange={(e) => setMateriaId(e.target.value)} className="border border-ink/15 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Selecione a matéria pra adicionar mais questões</option>
            {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>

          {modo === 'manual' ? (
            materiaId && (
              <div className="max-h-56 overflow-y-auto border border-ink/10 rounded p-2 space-y-1">
                {questoesFiltradas.map((q) => (
                  <label key={q.id} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={selecionadas.has(q.id)} onChange={() => toggleManual(q)} className="mt-0.5" />
                    <span className="text-ink/80">{q.enunciado.slice(0, 110)}{q.enunciado.length > 110 ? '…' : ''}</span>
                  </label>
                ))}
                {questoesFiltradas.length === 0 && <p className="text-ink/40 text-sm">Nenhuma questão nesta matéria.</p>}
              </div>
            )
          ) : (
            materiaId && (
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-ink/60 mb-1">Tópico (opcional)</label>
                  <select value={topicoAleatorio} onChange={(e) => setTopicoAleatorio(e.target.value)} className="border border-ink/15 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">Qualquer tópico</option>
                    {topicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-ink/60 mb-1">Quantidade</label>
                  <input type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} className="w-24 border border-ink/15 rounded-lg px-3 py-2 text-sm" />
                </div>
                <button type="button" onClick={sortear} className="border border-ink/15 rounded-lg px-3 py-2 text-sm hover:bg-ink/5">Sortear</button>
              </div>
            )
          )}

          <button className="bg-ink text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-ink-light transition-colors shadow-soft">{editandoId ? 'Salvar alterações' : 'Criar simulado'}</button>
        </form>
      )}

      <div className="space-y-2">
        {simulados.map((s) => {
          const aberto = verResultadosId === s.id
          const lista = resultados[s.id] || []
          const finalizados = lista.filter((t) => t.finalizado_em)
          return (
            <div key={s.id} className="bg-white border border-ink/[0.07] rounded-xl shadow-soft overflow-hidden">
              <div className="px-4 py-3 flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <p className="text-ink font-medium text-sm truncate">{s.titulo} <span className="text-ink/40 font-normal">— {s.turmas?.nome}</span></p>
                  <p className="text-ink/50 text-xs">{s.tempo_limite_minutos} min {s.data_limite ? `· disponível até ${new Date(s.data_limite).toLocaleString('pt-BR')}` : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => abrirResultados(s.id)} title="Ver resultados" className={`p-1.5 transition-colors ${aberto ? 'text-gold' : 'text-ink/30 hover:text-gold'}`}><BarChart3 className="w-4 h-4" /></button>
                  <button onClick={() => abrirEdicao(s)} title="Editar" className="p-1.5 text-ink/30 hover:text-gold transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => excluirSimulado(s.id)} title="Excluir" className="p-1.5 text-ink/30 hover:text-erro transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {aberto && (
                <div className="border-t border-ink/10 bg-paper/50 px-4 py-4">
                  {finalizados.length === 0 ? (
                    <p className="text-ink/40 text-sm">Nenhum aluno finalizou esse simulado ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {finalizados.map((t) => {
                        const total = t.acertos + t.erros
                        const pct = total > 0 ? Math.round((t.acertos / total) * 100) : 0
                        const detalheAberto = alunoExpandidoId === t.id
                        return (
                          <div key={t.id} className="bg-white border border-ink/10 rounded">
                            <button onClick={() => abrirDetalheAluno(t.id)} className="w-full flex items-center justify-between px-3 py-2 text-left">
                              <div className="min-w-0">
                                <p className="text-sm text-ink truncate">{t.profiles?.nome}</p>
                                <p className="text-xs text-ink/40">{formatarTempo(t.tempo_total_segundos || 0)}</p>
                              </div>
                              <span className={`text-sm font-medium shrink-0 ${pct >= 70 ? 'text-acerto' : pct >= 50 ? 'text-gold' : 'text-erro'}`}>{pct}% ({t.acertos}/{total})</span>
                            </button>
                            {detalheAberto && (
                              <div className="border-t border-ink/10 px-3 py-3 space-y-1.5">
                                {(detalhesPorTentativa[t.id] || []).map((r) => (
                                  <div key={r.questao_id} className={`rounded px-2.5 py-2 text-xs border ${r.correta ? 'border-acerto/30 bg-acerto/5' : 'border-erro/30 bg-erro/5'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="bg-ink/5 text-ink/70 px-1.5 py-0.5 rounded">{r.questoes.materias?.nome}</span>
                                      <span className={r.correta ? 'text-acerto font-medium' : 'text-erro font-medium'}>{r.correta ? 'Acertou' : 'Errou'}</span>
                                    </div>
                                    <p className="text-ink">{r.questoes.enunciado}</p>
                                    <p className="text-ink/50 mt-1">Resposta: <strong>{r.resposta_dada}</strong>{!r.correta && <> · Correta: <strong>{r.questoes.resposta_correta}</strong></>}</p>
                                  </div>
                                ))}
                                {!detalhesPorTentativa[t.id] && <p className="text-ink/40 text-xs">Carregando…</p>}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {simulados.length === 0 && <p className="text-ink/50 text-sm">Nenhum simulado criado ainda.</p>}
      </div>
    </div>
  )
}
