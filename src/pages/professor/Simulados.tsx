import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Turma, Materia, Topico, Questao, Simulado } from '../../lib/types'
import { isoHoje } from '../../lib/dates'

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
  const [topicoAleatorio, setTopicoAleatorio] = useState('')
  const [quantidade, setQuantidade] = useState(10)

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

  function toggleManual(q: Questao) {
    setSelecionadas((prev) => {
      const next = new Map(prev)
      if (next.has(q.id)) next.delete(q.id); else next.set(q.id, q)
      return next
    })
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
  }

  function resetForm() {
    setTitulo(''); setDescricao(''); setTempoLimite(60); setDataLimite('')
    setMateriaId(''); setSelecionadas(new Map()); setTopicoAleatorio(''); setQuantidade(10)
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
    setDataLimite(s.data_limite ? s.data_limite.slice(0, 16) : '')
    setMateriaId('')

    const { data } = await supabase.from('simulado_questoes').select('questoes(*)').eq('simulado_id', s.id)
    const questoesAtuais = (data || []).map((r: any) => r.questoes).filter(Boolean) as Questao[]
    setSelecionadas(new Map(questoesAtuais.map((q) => [q.id, q])))
    setShowForm(true)
  }

  async function salvarSimulado(e: FormEvent) {
    e.preventDefault()
    if (!profile || !titulo.trim() || !turmaId || selecionadas.size === 0) {
      alert('Escolha ao menos uma questão para o simulado.')
      return
    }

    if (editandoId) {
      const { error } = await supabase.from('simulados').update({
        turma_id: turmaId, titulo: titulo.trim(), descricao: descricao.trim() || null,
        tempo_limite_minutos: tempoLimite, data_limite: dataLimite || null,
      }).eq('id', editandoId)
      if (error) { alert('Erro ao salvar: ' + error.message); return }

      await supabase.from('simulado_questoes').delete().eq('simulado_id', editandoId)
      const rows = Array.from(selecionadas.keys()).map((qId, i) => ({ simulado_id: editandoId, questao_id: qId, ordem: i }))
      await supabase.from('simulado_questoes').insert(rows)

      resetForm(); setShowForm(false); carregarSimulados()
      return
    }

    const { data, error } = await supabase.from('simulados').insert({
      turma_id: turmaId, professor_id: profile.id, titulo: titulo.trim(), descricao: descricao.trim() || null,
      tempo_limite_minutos: tempoLimite, data_limite: dataLimite || null,
    }).select().single()

    if (!error && data) {
      const rows = Array.from(selecionadas.keys()).map((qId, i) => ({ simulado_id: (data as Simulado).id, questao_id: qId, ordem: i }))
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

  const turmasAtivas = turmas.filter(estaAtivaDeVerdade)
  const turmasParaSelecionar = editandoId ? turmas : turmasAtivas

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-ink">Simulados</h1>
        {turmasAtivas.length > 0 && (
          <button onClick={() => (showForm ? (setShowForm(false), resetForm()) : abrirNovo())} className="bg-ink text-white px-4 py-2 rounded text-sm font-medium hover:bg-ink-light">
            {showForm ? 'Cancelar' : '+ Novo simulado'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={salvarSimulado} className="bg-white border border-ink/10 rounded p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="border border-ink/20 rounded px-3 py-2 text-sm bg-white">
              {turmasParaSelecionar.map((t) => <option key={t.id} value={t.id}>{t.nome}{t.status === 'encerrada' ? ' (encerrada)' : ''}</option>)}
            </select>
            <input required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do simulado" className="sm:col-span-2 border border-ink/20 rounded px-3 py-2 text-sm focus:border-gold" />
            <input type="number" min={5} value={tempoLimite} onChange={(e) => setTempoLimite(Number(e.target.value))} className="border border-ink/20 rounded px-3 py-2 text-sm" placeholder="Minutos" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)" className="border border-ink/20 rounded px-3 py-2 text-sm focus:border-gold" />
            <div>
              <label className="text-xs text-ink/60 mr-2">Disponível até (opcional):</label>
              <input type="datetime-local" value={dataLimite} onChange={(e) => setDataLimite(e.target.value)} className="border border-ink/20 rounded px-3 py-1.5 text-sm" />
            </div>
          </div>

          {selecionadas.size > 0 && (
            <div className="bg-paper/60 border border-ink/10 rounded p-3">
              <p className="text-sm text-ink font-medium mb-2">{selecionadas.size} questão(ões) no simulado</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {Array.from(selecionadas.values()).map((q) => (
                  <div key={q.id} className="flex items-start justify-between gap-2 text-xs bg-white border border-ink/10 rounded px-2 py-1.5">
                    <span className="text-ink/80">{q.enunciado.slice(0, 90)}{q.enunciado.length > 90 ? '…' : ''}</span>
                    <button type="button" onClick={() => removerSelecionada(q.id)} className="text-erro shrink-0 hover:underline">remover</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 border-b border-ink/10 pb-2">
            <button type="button" onClick={() => setModo('manual')} className={`text-sm ${modo === 'manual' ? 'text-ink font-medium border-b-2 border-gold' : 'text-ink/50'}`}>Escolher manualmente</button>
            <button type="button" onClick={() => setModo('aleatorio')} className={`text-sm ${modo === 'aleatorio' ? 'text-ink font-medium border-b-2 border-gold' : 'text-ink/50'}`}>Sortear questões</button>
          </div>

          <select value={materiaId} onChange={(e) => setMateriaId(e.target.value)} className="border border-ink/20 rounded px-3 py-2 text-sm bg-white">
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
                  <select value={topicoAleatorio} onChange={(e) => setTopicoAleatorio(e.target.value)} className="border border-ink/20 rounded px-3 py-2 text-sm bg-white">
                    <option value="">Qualquer tópico</option>
                    {topicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-ink/60 mb-1">Quantidade</label>
                  <input type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} className="w-24 border border-ink/20 rounded px-3 py-2 text-sm" />
                </div>
                <button type="button" onClick={sortear} className="border border-ink/20 rounded px-3 py-2 text-sm hover:bg-ink/5">Sortear</button>
              </div>
            )
          )}

          <button className="bg-ink text-white px-4 py-2 rounded text-sm font-medium hover:bg-ink-light">{editandoId ? 'Salvar alterações' : 'Criar simulado'}</button>
        </form>
      )}

      <div className="space-y-2">
        {simulados.map((s) => (
          <div key={s.id} className="bg-white border border-ink/10 rounded px-4 py-3 flex justify-between items-center">
            <div>
              <p className="text-ink font-medium text-sm">{s.titulo} <span className="text-ink/40 font-normal">— {s.turmas?.nome}</span></p>
              <p className="text-ink/50 text-xs">{s.tempo_limite_minutos} min {s.data_limite ? `· disponível até ${new Date(s.data_limite).toLocaleString('pt-BR')}` : ''}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button onClick={() => abrirEdicao(s)} className="text-gold text-xs hover:underline">Editar</button>
              <button onClick={() => excluirSimulado(s.id)} className="text-erro text-xs hover:underline">Excluir</button>
            </div>
          </div>
        ))}
        {simulados.length === 0 && <p className="text-ink/50 text-sm">Nenhum simulado criado ainda.</p>}
      </div>
    </div>
  )
}
