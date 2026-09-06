import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Materia, Topico } from '../../lib/types'

export default function Materias() {
  const { profile } = useAuth()
  const [materias, setMaterias] = useState<Materia[]>([])
  const [topicosPorMateria, setTopicosPorMateria] = useState<Record<string, Topico[]>>({})
  const [novaMateria, setNovaMateria] = useState('')
  const [expandida, setExpandida] = useState<string | null>(null)
  const [novoTopico, setNovoTopico] = useState<Record<string, string>>({})
  const [novaDescricao, setNovaDescricao] = useState<Record<string, string>>({})

  const [editandoMateriaId, setEditandoMateriaId] = useState<string | null>(null)
  const [editMateriaNome, setEditMateriaNome] = useState('')

  const [editandoTopicoId, setEditandoTopicoId] = useState<string | null>(null)
  const [editTopicoNome, setEditTopicoNome] = useState('')
  const [editTopicoDescricao, setEditTopicoDescricao] = useState('')

  useEffect(() => { carregarMaterias() }, [])

  async function carregarMaterias() {
    const { data } = await supabase.from('materias').select('*').order('created_at')
    setMaterias((data as Materia[]) || [])
    if (data) for (const m of data) carregarTopicos(m.id)
  }

  async function carregarTopicos(materiaId: string) {
    const { data } = await supabase.from('topicos').select('*').eq('materia_id', materiaId).order('ordem')
    setTopicosPorMateria((prev) => ({ ...prev, [materiaId]: (data as Topico[]) || [] }))
  }

  async function criarMateria(e: FormEvent) {
    e.preventDefault()
    if (!novaMateria.trim() || !profile) return
    const { error } = await supabase.from('materias').insert({ nome: novaMateria.trim(), professor_id: profile.id })
    if (!error) { setNovaMateria(''); carregarMaterias() }
  }

  async function excluirMateria(id: string) {
    if (!confirm('Excluir esta matéria e todos os seus tópicos? As questões vinculadas também serão removidas.')) return
    await supabase.from('materias').delete().eq('id', id)
    carregarMaterias()
  }

  function iniciarEdicaoMateria(m: Materia) {
    setEditandoMateriaId(m.id)
    setEditMateriaNome(m.nome)
  }

  async function salvarEdicaoMateria(id: string) {
    if (!editMateriaNome.trim()) return
    await supabase.from('materias').update({ nome: editMateriaNome.trim() }).eq('id', id)
    setEditandoMateriaId(null)
    carregarMaterias()
  }

  async function criarTopico(materiaId: string, e: FormEvent) {
    e.preventDefault()
    const nome = novoTopico[materiaId]?.trim()
    if (!nome) return
    const descricao = novaDescricao[materiaId]?.trim() || null
    const ordem = (topicosPorMateria[materiaId]?.length || 0) + 1
    await supabase.from('topicos').insert({ materia_id: materiaId, nome, descricao, ordem })
    setNovoTopico((prev) => ({ ...prev, [materiaId]: '' }))
    setNovaDescricao((prev) => ({ ...prev, [materiaId]: '' }))
    carregarTopicos(materiaId)
  }

  async function excluirTopico(materiaId: string, topicoId: string) {
    await supabase.from('topicos').delete().eq('id', topicoId)
    carregarTopicos(materiaId)
  }

  function iniciarEdicaoTopico(t: Topico) {
    setEditandoTopicoId(t.id)
    setEditTopicoNome(t.nome)
    setEditTopicoDescricao(t.descricao || '')
  }

  async function salvarEdicaoTopico(materiaId: string, topicoId: string) {
    if (!editTopicoNome.trim()) return
    await supabase.from('topicos').update({ nome: editTopicoNome.trim(), descricao: editTopicoDescricao.trim() || null }).eq('id', topicoId)
    setEditandoTopicoId(null)
    carregarTopicos(materiaId)
  }

  return (
    <div>
      <h1 className="font-serif text-2xl text-ink mb-1">Matérias</h1>
      <p className="text-ink/60 text-sm mb-6">Organize o conteúdo em matérias e tópicos. Ex: CPC → Petição Inicial (arts. 319 a 321).</p>

      <form onSubmit={criarMateria} className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          value={novaMateria}
          onChange={(e) => setNovaMateria(e.target.value)}
          placeholder="Nome da nova matéria (ex: Direito Penal)"
          className="flex-1 border border-ink/20 rounded px-3 py-2 text-sm bg-white focus:border-gold"
        />
        <button className="bg-ink text-white px-4 py-2 rounded text-sm font-medium hover:bg-ink-light">Adicionar</button>
      </form>

      <div className="space-y-3">
        {materias.map((m) => {
          const aberta = expandida === m.id
          const topicos = topicosPorMateria[m.id] || []
          const editandoEssaMateria = editandoMateriaId === m.id
          return (
            <div key={m.id} className="bg-white border border-ink/10 rounded overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 gap-2">
                {editandoEssaMateria ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input value={editMateriaNome} onChange={(e) => setEditMateriaNome(e.target.value)} autoFocus
                      className="flex-1 border border-ink/20 rounded px-2 py-1 text-sm" />
                    <button onClick={() => salvarEdicaoMateria(m.id)} className="text-acerto text-xs hover:underline">Salvar</button>
                    <button onClick={() => setEditandoMateriaId(null)} className="text-ink/50 text-xs hover:underline">Cancelar</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => setExpandida(aberta ? null : m.id)}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.cor }} />
                    <span className="text-ink font-medium">{m.nome}</span>
                    <span className="text-ink/40 text-xs">{topicos.length} tópico{topicos.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {!editandoEssaMateria && (
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => iniciarEdicaoMateria(m)} className="text-gold text-xs hover:underline">Editar</button>
                    <button onClick={() => excluirMateria(m.id)} className="text-erro text-xs hover:underline">Excluir</button>
                    <span className="text-ink/40 cursor-pointer" onClick={() => setExpandida(aberta ? null : m.id)}>{aberta ? '▾' : '▸'}</span>
                  </div>
                )}
              </div>

              {aberta && (
                <div className="border-t border-ink/10 px-4 py-3 bg-paper/50">
                  <ul className="space-y-1.5 mb-3">
                    {topicos.map((t) => {
                      const editandoEsseTopico = editandoTopicoId === t.id
                      return (
                        <li key={t.id} className="text-sm bg-white border border-ink/10 rounded px-3 py-2">
                          {editandoEsseTopico ? (
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input value={editTopicoNome} onChange={(e) => setEditTopicoNome(e.target.value)} autoFocus
                                className="flex-1 border border-ink/20 rounded px-2 py-1 text-sm" placeholder="Nome" />
                              <input value={editTopicoDescricao} onChange={(e) => setEditTopicoDescricao(e.target.value)}
                                className="flex-1 border border-ink/20 rounded px-2 py-1 text-sm" placeholder="Detalhe" />
                              <div className="flex gap-2 shrink-0">
                                <button onClick={() => salvarEdicaoTopico(m.id, t.id)} className="text-acerto text-xs hover:underline">Salvar</button>
                                <button onClick={() => setEditandoTopicoId(null)} className="text-ink/50 text-xs hover:underline">Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-ink">{t.nome}{t.descricao ? <span className="text-ink/50"> — {t.descricao}</span> : null}</span>
                              <div className="flex gap-3 shrink-0 ml-3">
                                <button onClick={() => iniciarEdicaoTopico(t)} className="text-gold text-xs hover:underline">Editar</button>
                                <button onClick={() => excluirTopico(m.id, t.id)} className="text-erro text-xs hover:underline">Remover</button>
                              </div>
                            </div>
                          )}
                        </li>
                      )
                    })}
                    {topicos.length === 0 && <p className="text-ink/40 text-sm">Nenhum tópico ainda.</p>}
                  </ul>
                  <form onSubmit={(e) => criarTopico(m.id, e)} className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={novoTopico[m.id] || ''}
                      onChange={(e) => setNovoTopico((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      placeholder="Nome do tópico (ex: Petição Inicial)"
                      className="flex-1 border border-ink/20 rounded px-3 py-1.5 text-sm bg-white focus:border-gold"
                    />
                    <input
                      value={novaDescricao[m.id] || ''}
                      onChange={(e) => setNovaDescricao((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      placeholder="Detalhe (ex: arts. 319 a 321)"
                      className="sm:w-56 border border-ink/20 rounded px-3 py-1.5 text-sm bg-white focus:border-gold"
                    />
                    <button className="bg-ink text-white px-3 py-1.5 rounded text-sm hover:bg-ink-light">+</button>
                  </form>
                </div>
              )}
            </div>
          )
        })}
        {materias.length === 0 && <p className="text-ink/50 text-sm">Nenhuma matéria criada ainda.</p>}
      </div>
    </div>
  )
}
