import { useEffect, useState, FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Materia, Topico, GrupoQuestoes, Questao } from '../../lib/types'
import QuestaoForm, { QuestaoFormValues } from '../../components/QuestaoForm'

type Modo = 'lista' | 'nova_avulsa' | 'novo_grupo'
type GrupoComMateriaTopico = GrupoQuestoes & { materias?: { nome: string } | null; topicos?: { nome: string } | null }

export default function Questoes() {
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [materias, setMaterias] = useState<Materia[]>([])
  const [topicosPorMateria, setTopicosPorMateria] = useState<Record<string, Topico[]>>({})
  const [grupos, setGrupos] = useState<GrupoComMateriaTopico[]>([])
  const [avulsas, setAvulsas] = useState<(Questao & { materias?: { nome: string }; topicos?: { nome: string } })[]>([])
  const [questoesPorGrupo, setQuestoesPorGrupo] = useState<Record<string, Questao[]>>({})

  const [modo, setModo] = useState<Modo>('lista')
  const [filtroMateria, setFiltroMateria] = useState('')
  const [somenteRevisao, setSomenteRevisao] = useState(searchParams.get('revisao') === '1')
  const [grupoExpandido, setGrupoExpandido] = useState<string | null>(null)
  const [editandoAvulsaId, setEditandoAvulsaId] = useState<string | null>(null)
  const [editandoDoGrupo, setEditandoDoGrupo] = useState<{ grupoId: string; questaoId: string } | null>(null)
  const [editandoInfoGrupoId, setEditandoInfoGrupoId] = useState<string | null>(null)

  // form: questão avulsa
  const [materiaId, setMateriaId] = useState('')
  const [topicoId, setTopicoId] = useState('')

  // form: novo grupo
  const [grupoTitulo, setGrupoTitulo] = useState('')
  const [grupoMateriaId, setGrupoMateriaId] = useState('')
  const [grupoTopicoId, setGrupoTopicoId] = useState('')
  const [grupoTexto, setGrupoTexto] = useState('')

  // form: editar info do grupo
  const [editGrupoTitulo, setEditGrupoTitulo] = useState('')
  const [editGrupoMateriaId, setEditGrupoMateriaId] = useState('')
  const [editGrupoTopicoId, setEditGrupoTopicoId] = useState('')
  const [editGrupoTexto, setEditGrupoTexto] = useState('')

  useEffect(() => {
    supabase.from('materias').select('*').order('nome').then(({ data }) => setMaterias((data as Materia[]) || []))
    carregarGrupos()
    carregarAvulsas('', somenteRevisao)
  }, [])

  useEffect(() => { carregarAvulsas(filtroMateria, somenteRevisao) }, [filtroMateria, somenteRevisao])

  useEffect(() => {
    // mantém a URL em sincronia (permite link direto "Questões p/ revisão" a partir do Painel)
    if (somenteRevisao) setSearchParams({ revisao: '1' }, { replace: true })
    else if (searchParams.get('revisao')) setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [somenteRevisao])

  async function carregarTopicosDe(materiaId: string) {
    if (!materiaId) return []
    if (topicosPorMateria[materiaId]) return topicosPorMateria[materiaId]
    const { data } = await supabase.from('topicos').select('*').eq('materia_id', materiaId).order('ordem')
    const topicos = (data as Topico[]) || []
    setTopicosPorMateria((prev) => ({ ...prev, [materiaId]: topicos }))
    return topicos
  }

  useEffect(() => { if (materiaId) carregarTopicosDe(materiaId) }, [materiaId])
  useEffect(() => { if (grupoMateriaId) carregarTopicosDe(grupoMateriaId) }, [grupoMateriaId])
  useEffect(() => { if (editGrupoMateriaId) carregarTopicosDe(editGrupoMateriaId) }, [editGrupoMateriaId])

  async function carregarGrupos() {
    const { data } = await supabase.from('grupos_questoes').select('*, materias(nome), topicos(nome)').order('created_at', { ascending: false })
    setGrupos((data as any) || [])
  }

  async function carregarAvulsas(materiaFiltro: string, apenasRevisao: boolean) {
    let query = supabase.from('questoes').select('*, materias(nome), topicos(nome)').is('grupo_id', null).order('created_at', { ascending: false })
    if (materiaFiltro) query = query.eq('materia_id', materiaFiltro)
    if (apenasRevisao) query = query.eq('precisa_revisao', true)
    const { data } = await query
    setAvulsas((data as any) || [])
  }

  async function carregarQuestoesDoGrupo(grupoId: string) {
    const { data } = await supabase.from('questoes').select('*').eq('grupo_id', grupoId).order('created_at')
    setQuestoesPorGrupo((prev) => ({ ...prev, [grupoId]: (data as Questao[]) || [] }))
  }

  function abrirGrupo(grupoId: string) {
    const abrindo = grupoExpandido !== grupoId
    setGrupoExpandido(abrindo ? grupoId : null)
    setEditandoDoGrupo(null)
    setEditandoInfoGrupoId(null)
    if (abrindo && !questoesPorGrupo[grupoId]) carregarQuestoesDoGrupo(grupoId)
  }

  // ---------- questão avulsa ----------
  async function salvarAvulsa(values: QuestaoFormValues) {
    if (!profile || !materiaId) { alert('Escolha a matéria.'); return }
    if (editandoAvulsaId) {
      const { error } = await supabase.from('questoes').update({ ...values, materia_id: materiaId, topico_id: topicoId || null }).eq('id', editandoAvulsaId)
      if (!error) { setModo('lista'); setEditandoAvulsaId(null); carregarAvulsas(filtroMateria, somenteRevisao) }
    } else {
      const { error } = await supabase.from('questoes').insert({
        ...values, professor_id: profile.id, materia_id: materiaId, topico_id: topicoId || null, grupo_id: null,
      })
      if (!error) { setModo('lista'); carregarAvulsas(filtroMateria, somenteRevisao) }
      else alert('Erro ao salvar: ' + error.message)
    }
  }

  function iniciarNovaAvulsa() {
    setEditandoAvulsaId(null); setMateriaId(''); setTopicoId(''); setModo('nova_avulsa')
  }

  function iniciarEdicaoAvulsa(q: Questao) {
    setEditandoAvulsaId(q.id); setMateriaId(q.materia_id); setTopicoId(q.topico_id || '')
    carregarTopicosDe(q.materia_id)
    setModo('nova_avulsa')
  }

  async function excluirAvulsa(id: string) {
    if (!confirm('Excluir esta questão?')) return
    await supabase.from('questoes').delete().eq('id', id)
    carregarAvulsas(filtroMateria, somenteRevisao)
  }

  async function alternarRevisaoAvulsa(id: string, atual: boolean) {
    await supabase.from('questoes').update({ precisa_revisao: !atual }).eq('id', id)
    carregarAvulsas(filtroMateria, somenteRevisao)
  }

  // ---------- grupo de questões ----------
  async function criarGrupo(e: FormEvent) {
    e.preventDefault()
    if (!profile || !grupoTitulo.trim() || !grupoMateriaId || !grupoTexto.trim()) return
    const { data, error } = await supabase.from('grupos_questoes').insert({
      professor_id: profile.id, materia_id: grupoMateriaId, topico_id: grupoTopicoId || null,
      titulo: grupoTitulo.trim(), texto_base: grupoTexto.trim(),
    }).select().single()
    if (!error && data) {
      setGrupoTitulo(''); setGrupoMateriaId(''); setGrupoTopicoId(''); setGrupoTexto('')
      await carregarGrupos()
      setModo('lista')
      setGrupoExpandido((data as GrupoQuestoes).id) // já abre pra começar a adicionar perguntas
    } else if (error) {
      alert('Erro ao criar grupo: ' + error.message)
    }
  }

  async function excluirGrupo(id: string) {
    if (!confirm('Excluir este grupo e todas as suas perguntas?')) return
    await supabase.from('grupos_questoes').delete().eq('id', id)
    carregarGrupos()
  }

  function iniciarEdicaoInfoGrupo(g: GrupoComMateriaTopico) {
    setEditandoInfoGrupoId(g.id)
    setEditGrupoTitulo(g.titulo)
    setEditGrupoMateriaId(g.materia_id || '')
    setEditGrupoTopicoId(g.topico_id || '')
    setEditGrupoTexto(g.texto_base)
    if (g.materia_id) carregarTopicosDe(g.materia_id)
  }

  async function salvarEdicaoInfoGrupo(grupoId: string) {
    if (!editGrupoTitulo.trim() || !editGrupoMateriaId || !editGrupoTexto.trim()) return
    const { error } = await supabase.from('grupos_questoes').update({
      titulo: editGrupoTitulo.trim(), materia_id: editGrupoMateriaId, topico_id: editGrupoTopicoId || null, texto_base: editGrupoTexto.trim(),
    }).eq('id', grupoId)
    if (!error) {
      setEditandoInfoGrupoId(null)
      carregarGrupos()
    } else {
      alert('Erro ao salvar: ' + error.message)
    }
  }

  async function adicionarQuestaoAoGrupo(grupo: GrupoComMateriaTopico, values: QuestaoFormValues) {
    if (!profile) return
    await supabase.from('questoes').insert({
      ...values, professor_id: profile.id, materia_id: grupo.materia_id, topico_id: grupo.topico_id || null, grupo_id: grupo.id,
    })
    carregarQuestoesDoGrupo(grupo.id)
  }

  async function salvarEdicaoDoGrupo(grupo: GrupoQuestoes, questaoId: string, values: QuestaoFormValues) {
    await supabase.from('questoes').update(values).eq('id', questaoId)
    setEditandoDoGrupo(null)
    carregarQuestoesDoGrupo(grupo.id)
  }

  async function excluirQuestaoDoGrupo(grupoId: string, questaoId: string) {
    if (!confirm('Excluir esta pergunta do grupo?')) return
    await supabase.from('questoes').delete().eq('id', questaoId)
    carregarQuestoesDoGrupo(grupoId)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="font-serif text-2xl text-ink">Questões</h1>
        {modo === 'lista' && (
          <div className="flex gap-2">
            <button onClick={() => setModo('novo_grupo')} className="border border-ink/20 text-ink px-3 py-2 rounded text-sm hover:bg-ink/5">
              + Grupo de questões (texto-base)
            </button>
            <button onClick={iniciarNovaAvulsa} className="bg-ink text-white px-4 py-2 rounded text-sm font-medium hover:bg-ink-light">
              + Questão avulsa
            </button>
          </div>
        )}
      </div>

      {modo === 'nova_avulsa' && (
        <div className="bg-white border border-ink/10 rounded p-5 mb-6">
          <p className="text-sm text-ink/60 mb-4">{editandoAvulsaId ? 'Editando questão avulsa' : 'Nova questão avulsa — sem vínculo com nenhum grupo.'}</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <select required value={materiaId} onChange={(e) => setMateriaId(e.target.value)} className="border border-ink/20 rounded px-3 py-2 text-sm bg-white">
              <option value="">Matéria *</option>
              {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            <select value={topicoId} onChange={(e) => setTopicoId(e.target.value)} disabled={!materiaId} className="border border-ink/20 rounded px-3 py-2 text-sm bg-white">
              <option value="">Tópico (opcional)</option>
              {(topicosPorMateria[materiaId] || []).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <QuestaoForm
            initial={editandoAvulsaId ? avulsas.find((a) => a.id === editandoAvulsaId) || undefined : undefined}
            onSubmit={salvarAvulsa}
            onCancel={() => { setModo('lista'); setEditandoAvulsaId(null) }}
            submitLabel={editandoAvulsaId ? 'Salvar alterações' : 'Salvar questão'}
          />
        </div>
      )}

      {modo === 'novo_grupo' && (
        <form onSubmit={criarGrupo} className="bg-white border border-ink/10 rounded p-5 mb-6 space-y-3">
          <p className="text-sm text-ink/60">Use um grupo quando várias perguntas dependem do mesmo texto — ex: interpretação de texto ou estudo de caso. Depois de criar, você adiciona as perguntas uma a uma.</p>
          <input required value={grupoTitulo} onChange={(e) => setGrupoTitulo(e.target.value)} placeholder="Título do grupo (ex: Texto 1 — Interpretação)"
            className="w-full border border-ink/20 rounded px-3 py-2 text-sm focus:border-gold" />
          <div className="grid grid-cols-2 gap-3">
            <select required value={grupoMateriaId} onChange={(e) => setGrupoMateriaId(e.target.value)} className="border border-ink/20 rounded px-3 py-2 text-sm bg-white">
              <option value="">Matéria *</option>
              {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            <select value={grupoTopicoId} onChange={(e) => setGrupoTopicoId(e.target.value)} disabled={!grupoMateriaId} className="border border-ink/20 rounded px-3 py-2 text-sm bg-white">
              <option value="">Tópico (opcional, vale para todas as perguntas do grupo)</option>
              {(topicosPorMateria[grupoMateriaId] || []).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <textarea required value={grupoTexto} onChange={(e) => setGrupoTexto(e.target.value)} rows={6} placeholder="Cole aqui o texto-base ou o enunciado do estudo de caso"
            className="w-full border border-ink/20 rounded px-3 py-2 text-sm focus:border-gold" />
          <div className="flex gap-2">
            <button className="bg-ink text-white px-4 py-2 rounded text-sm hover:bg-ink-light">Criar grupo e adicionar perguntas</button>
            <button type="button" onClick={() => setModo('lista')} className="text-ink/60 text-sm hover:underline">Cancelar</button>
          </div>
        </form>
      )}

      {modo === 'lista' && (
        <>
          {/* GRUPOS */}
          <h2 className="font-serif text-lg text-ink mb-3">Grupos de questões</h2>
          <div className="space-y-2 mb-8">
            {grupos.map((g) => {
              const aberto = grupoExpandido === g.id
              const perguntas = questoesPorGrupo[g.id] || []
              const editandoInfo = editandoInfoGrupoId === g.id
              return (
                <div key={g.id} className="bg-white border border-ink/10 rounded overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => abrirGrupo(g.id)}>
                    <div>
                      <p className="text-ink font-medium text-sm">{g.titulo}</p>
                      <p className="text-ink/40 text-xs">{g.materias?.nome}{g.topicos?.nome ? ` — ${g.topicos.nome}` : ''} · {perguntas.length || '…'} pergunta(s)</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); excluirGrupo(g.id) }} className="text-erro text-xs hover:underline">Excluir</button>
                      <span className="text-ink/40">{aberto ? '▾' : '▸'}</span>
                    </div>
                  </div>

                  {aberto && (
                    <div className="border-t border-ink/10 px-4 py-4 bg-paper/50 space-y-4">
                      {editandoInfo ? (
                        <div className="bg-white border border-gold/40 rounded p-4 space-y-3">
                          <input value={editGrupoTitulo} onChange={(e) => setEditGrupoTitulo(e.target.value)} placeholder="Título do grupo"
                            className="w-full border border-ink/20 rounded px-3 py-2 text-sm focus:border-gold" />
                          <div className="grid grid-cols-2 gap-3">
                            <select value={editGrupoMateriaId} onChange={(e) => setEditGrupoMateriaId(e.target.value)} className="border border-ink/20 rounded px-3 py-2 text-sm bg-white">
                              <option value="">Matéria *</option>
                              {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                            </select>
                            <select value={editGrupoTopicoId} onChange={(e) => setEditGrupoTopicoId(e.target.value)} disabled={!editGrupoMateriaId} className="border border-ink/20 rounded px-3 py-2 text-sm bg-white">
                              <option value="">Tópico (opcional)</option>
                              {(topicosPorMateria[editGrupoMateriaId] || []).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                            </select>
                          </div>
                          <textarea value={editGrupoTexto} onChange={(e) => setEditGrupoTexto(e.target.value)} rows={5}
                            className="w-full border border-ink/20 rounded px-3 py-2 text-sm focus:border-gold" />
                          <div className="flex gap-2">
                            <button onClick={() => salvarEdicaoInfoGrupo(g.id)} className="bg-ink text-white px-4 py-2 rounded text-sm hover:bg-ink-light">Salvar alterações</button>
                            <button onClick={() => setEditandoInfoGrupoId(null)} className="text-ink/60 text-sm hover:underline">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white border border-ink/10 rounded p-3">
                          <p className="text-sm text-ink/70 whitespace-pre-wrap mb-2">{g.texto_base}</p>
                          <button onClick={() => iniciarEdicaoInfoGrupo(g)} className="text-gold text-xs hover:underline">Editar título / matéria / tópico / texto</button>
                        </div>
                      )}

                      {perguntas.map((q) => (
                        editandoDoGrupo?.questaoId === q.id ? (
                          <div key={q.id} className="bg-white border border-gold/40 rounded p-4">
                            <QuestaoForm
                              initial={q}
                              onSubmit={(values) => salvarEdicaoDoGrupo(g, q.id, values)}
                              onCancel={() => setEditandoDoGrupo(null)}
                              submitLabel="Salvar alterações"
                            />
                          </div>
                        ) : (
                          <div key={q.id} className="bg-white border border-ink/10 rounded px-4 py-3 flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1 text-xs">
                                <span className="bg-ink/5 text-ink/70 px-2 py-0.5 rounded">{q.tipo === 'multipla_escolha' ? 'Múltipla escolha' : 'V ou F'}</span>
                                {q.precisa_revisao && <span className="bg-erro/10 text-erro px-2 py-0.5 rounded">Precisa revisão</span>}
                              </div>
                              <p className="text-sm text-ink">{q.enunciado}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                              <button onClick={() => setEditandoDoGrupo({ grupoId: g.id, questaoId: q.id })} className="text-gold text-xs hover:underline">Editar</button>
                              <button onClick={() => excluirQuestaoDoGrupo(g.id, q.id)} className="text-erro text-xs hover:underline">Excluir</button>
                            </div>
                          </div>
                        )
                      ))}

                      <div className="bg-white border border-dashed border-ink/20 rounded p-4">
                        <p className="text-sm text-ink font-medium mb-3">Adicionar pergunta a este grupo</p>
                        <QuestaoForm onSubmit={(values) => adicionarQuestaoAoGrupo(g, values)} submitLabel="Adicionar pergunta" resetAfterSubmit />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {grupos.length === 0 && <p className="text-ink/50 text-sm">Nenhum grupo criado ainda.</p>}
          </div>

          {/* AVULSAS */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h2 className="font-serif text-lg text-ink">Questões avulsas</h2>
            <label className="flex items-center gap-1.5 text-sm text-ink/70 ml-auto">
              <input type="checkbox" checked={somenteRevisao} onChange={(e) => setSomenteRevisao(e.target.checked)} />
              Só as que precisam de revisão
            </label>
            <select value={filtroMateria} onChange={(e) => setFiltroMateria(e.target.value)} className="border border-ink/20 rounded px-3 py-1.5 text-sm bg-white">
              <option value="">Todas as matérias</option>
              {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            {avulsas.map((q) => (
              <div key={q.id} className="bg-white border border-ink/10 rounded px-4 py-3 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 text-xs">
                    <span className="bg-ink/5 text-ink/70 px-2 py-0.5 rounded">{q.materias?.nome}</span>
                    {q.topicos?.nome && <span className="bg-ink/5 text-ink/70 px-2 py-0.5 rounded">{q.topicos.nome}</span>}
                    <span className="bg-ink/5 text-ink/70 px-2 py-0.5 rounded">{q.tipo === 'multipla_escolha' ? 'Múltipla escolha' : 'V ou F'}</span>
                    {q.precisa_revisao && <span className="bg-erro/10 text-erro px-2 py-0.5 rounded">Precisa revisão</span>}
                  </div>
                  <p className="text-sm text-ink">{q.enunciado}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <button onClick={() => iniciarEdicaoAvulsa(q)} className="text-xs text-gold hover:underline">Editar</button>
                  <button onClick={() => alternarRevisaoAvulsa(q.id, q.precisa_revisao)} className="text-xs text-gold hover:underline">
                    {q.precisa_revisao ? 'Marcar como revisada' : 'Marcar p/ revisão'}
                  </button>
                  <button onClick={() => excluirAvulsa(q.id)} className="text-xs text-erro hover:underline">Excluir</button>
                </div>
              </div>
            ))}
            {avulsas.length === 0 && <p className="text-ink/50 text-sm">Nenhuma questão encontrada.</p>}
          </div>
        </>
      )}
    </div>
  )
}
