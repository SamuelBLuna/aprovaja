import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Materia, Topico, Questao } from '../../lib/types'
import QuestionCard from '../../components/QuestionCard'
import SemTurma from '../../components/SemTurma'
import { usePossuiTurma } from '../../lib/usePossuiTurma'

type QuestaoComGrupo = Questao & { grupos_questoes?: { texto_base: string } | null; topicos?: { nome: string } | null }

function embaralhar<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function QuestoesAluno() {
  const { profile } = useAuth()
  const possuiTurma = usePossuiTurma()
  const [materias, setMaterias] = useState<Materia[]>([])
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [materiaId, setMateriaId] = useState('')
  const [topicoId, setTopicoId] = useState('')

  const [questoes, setQuestoes] = useState<QuestaoComGrupo[]>([])
  const [indice, setIndice] = useState(0)
  const [praticando, setPraticando] = useState(false)

  useEffect(() => {
    supabase.from('materias').select('*').order('nome').then(({ data }) => setMaterias((data as Materia[]) || []))
  }, [])

  useEffect(() => {
    if (!materiaId) { setTopicos([]); return }
    supabase.from('topicos').select('*').eq('materia_id', materiaId).order('ordem').then(({ data }) => setTopicos((data as Topico[]) || []))
  }, [materiaId])

  async function iniciar() {
    if (!profile) return
    let query = supabase.from('questoes').select('*, grupos_questoes(texto_base), topicos(nome)').eq('materia_id', materiaId)
    if (topicoId) query = query.eq('topico_id', topicoId)
    const { data } = await query
    const pool = (data as QuestaoComGrupo[]) || []

    if (pool.length === 0) { setQuestoes([]); setIndice(0); setPraticando(true); return }

    // Busca a última resposta do aluno pra cada questão, pra não ficar repetindo
    // sempre as mesmas primeiro: quem nunca respondeu vem primeiro, quem já
    // acertou recentemente vai pro final.
    const { data: respostasRecentes } = await supabase
      .from('respostas')
      .select('questao_id, correta, created_at')
      .eq('aluno_id', profile.id)
      .in('questao_id', pool.map((q) => q.id))
      .order('created_at', { ascending: false })

    const ultimaPorQuestao = new Map<string, { correta: boolean; created_at: string }>()
    for (const r of respostasRecentes || []) {
      if (!ultimaPorQuestao.has(r.questao_id)) ultimaPorQuestao.set(r.questao_id, r)
    }

    const nuncaRespondidas: QuestaoComGrupo[] = []
    const erradas: QuestaoComGrupo[] = []
    const corretas: QuestaoComGrupo[] = []
    for (const q of pool) {
      const ultima = ultimaPorQuestao.get(q.id)
      if (!ultima) nuncaRespondidas.push(q)
      else if (!ultima.correta) erradas.push(q)
      else corretas.push(q)
    }

    function porMaisAntiga(arr: QuestaoComGrupo[]) {
      return [...arr].sort((a, b) => new Date(ultimaPorQuestao.get(a.id)!.created_at).getTime() - new Date(ultimaPorQuestao.get(b.id)!.created_at).getTime())
    }

    const ordenadas = [...embaralhar(nuncaRespondidas), ...porMaisAntiga(erradas), ...porMaisAntiga(corretas)]
    setQuestoes(ordenadas)
    setIndice(0)
    setPraticando(true)
  }

  if (possuiTurma === false) return <SemTurma />

  if (praticando) {
    if (questoes.length === 0) {
      return (
        <div>
          <p className="text-ink/60 mb-4">Nenhuma questão encontrada para esse filtro.</p>
          <button onClick={() => setPraticando(false)} className="text-gold hover:underline text-sm">Voltar</button>
        </div>
      )
    }
    const questaoAtual = questoes[indice]
    return (
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setPraticando(false)} className="text-ink/60 hover:underline text-sm">← Trocar filtro</button>
          <span className="text-ink/60 text-sm">Questão {indice + 1} de {questoes.length}</span>
        </div>
        <QuestionCard
          key={questaoAtual.id}
          questao={questaoAtual}
          textoBase={questaoAtual.grupos_questoes?.texto_base}
          materiaNome={materias.find((m) => m.id === materiaId)?.nome}
          topicoNome={questaoAtual.topicos?.nome}
          permitirRepetir
        />
        <div className="flex justify-between mt-4">
          <button disabled={indice === 0} onClick={() => setIndice((i) => i - 1)} className="text-sm text-ink/60 disabled:opacity-30 hover:underline">← Anterior</button>
          <button disabled={indice === questoes.length - 1} onClick={() => setIndice((i) => i + 1)} className="text-sm text-gold disabled:opacity-30 hover:underline">Próxima →</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-serif text-2xl text-ink mb-1">Questões</h1>
      <p className="text-ink/60 text-sm mb-6">Escolha a matéria (e opcionalmente o tópico) para praticar à vontade.</p>

      <div className="bg-white border border-ink/10 rounded p-5 max-w-md space-y-3">
        <select value={materiaId} onChange={(e) => setMateriaId(e.target.value)} className="w-full border border-ink/20 rounded px-3 py-2 text-sm bg-white">
          <option value="">Selecione a matéria</option>
          {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
        <select value={topicoId} onChange={(e) => setTopicoId(e.target.value)} disabled={!materiaId} className="w-full border border-ink/20 rounded px-3 py-2 text-sm bg-white">
          <option value="">Todos os tópicos</option>
          {topicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <button onClick={iniciar} disabled={!materiaId} className="w-full bg-ink text-white py-2 rounded text-sm font-medium hover:bg-ink-light disabled:opacity-40">
          Começar a praticar
        </button>
      </div>
    </div>
  )
}
