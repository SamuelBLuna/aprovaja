import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Turma } from '../lib/types'

interface AlunoDaTurma {
  aluno_id: string
  joined_at: string
  profiles: { nome: string; email: string } | null
}

interface GerenciarTurmaProps {
  turma: Turma
  onFechar: () => void
  onAtualizada: (turma: Turma) => void
  onExcluida: () => void
}

export default function GerenciarTurma({ turma, onFechar, onAtualizada, onExcluida }: GerenciarTurmaProps) {
  const [nome, setNome] = useState(turma.nome)
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [msgNome, setMsgNome] = useState<string | null>(null)

  const [alunos, setAlunos] = useState<AlunoDaTurma[]>([])
  const [carregandoAlunos, setCarregandoAlunos] = useState(true)

  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState('')
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => { carregarAlunos() }, [turma.id])

  async function carregarAlunos() {
    setCarregandoAlunos(true)
    const { data } = await supabase.from('turma_alunos').select('aluno_id, joined_at, profiles(nome, email)').eq('turma_id', turma.id).order('joined_at')
    setAlunos((data as any) || [])
    setCarregandoAlunos(false)
  }

  async function salvarNome() {
    if (!nome.trim() || nome.trim() === turma.nome) { setMsgNome(null); return }
    setSalvandoNome(true)
    const { error } = await supabase.from('turmas').update({ nome: nome.trim() }).eq('id', turma.id)
    setSalvandoNome(false)
    if (error) {
      setMsgNome('Erro ao salvar.')
    } else {
      setMsgNome('Nome atualizado.')
      onAtualizada({ ...turma, nome: nome.trim() })
    }
  }

  async function removerAluno(alunoId: string, nomeAluno: string) {
    if (!confirm(`Remover ${nomeAluno} desta turma? Ele(a) perde o acesso ao conteúdo da turma, mas o histórico de respostas é mantido.`)) return
    await supabase.from('turma_alunos').delete().eq('turma_id', turma.id).eq('aluno_id', alunoId)
    carregarAlunos()
  }

  async function excluirTurma() {
    setExcluindo(true)
    const { error } = await supabase.from('turmas').delete().eq('id', turma.id)
    setExcluindo(false)
    if (error) {
      alert('Erro ao excluir: ' + error.message)
    } else {
      onExcluida()
    }
  }

  async function reativarTurma() {
    if (!confirm('Reativar esta turma? Os alunos removidos ao encerrar não voltam automaticamente — eles vão precisar usar o código de novo pra entrar.')) return
    const { error } = await supabase.rpc('reativar_turma', { p_turma_id: turma.id })
    if (!error) onAtualizada({ ...turma, status: 'ativa' })
    else alert('Erro ao reativar: ' + error.message)
  }

  const nomeConfere = confirmacaoExclusao.trim().toLowerCase() === turma.nome.trim().toLowerCase()

  return (
    <div className="bg-white border border-ink/10 rounded-lg p-5 mb-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-ink">Gerenciar turma</h2>
        <div className="flex items-center gap-3">
          {turma.status === 'encerrada' && (
            <button onClick={reativarTurma} className="text-gold text-sm hover:underline">Reativar turma</button>
          )}
          <button onClick={onFechar} className="text-ink/50 text-sm hover:underline">Fechar</button>
        </div>
      </div>

      {/* nome */}
      <div>
        <label className="block text-xs text-ink/60 mb-1">Nome da turma</label>
        <div className="flex gap-2">
          <input value={nome} onChange={(e) => setNome(e.target.value)} onBlur={salvarNome}
            className="flex-1 border border-ink/20 rounded px-3 py-2 text-sm focus:border-gold" />
          <button onClick={salvarNome} disabled={salvandoNome} className="bg-ink text-white px-4 py-2 rounded text-sm hover:bg-ink-light disabled:opacity-50">
            {salvandoNome ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
        {msgNome && <p className={`text-xs mt-1 ${msgNome.includes('Erro') ? 'text-erro' : 'text-acerto'}`}>{msgNome}</p>}
      </div>

      {/* alunos */}
      <div>
        <p className="text-xs text-ink/60 mb-2">Alunos matriculados ({alunos.length})</p>
        {carregandoAlunos ? (
          <p className="text-ink/40 text-sm">Carregando…</p>
        ) : alunos.length === 0 ? (
          <p className="text-ink/40 text-sm">Nenhum aluno usou o código <strong>{turma.codigo_turma}</strong> ainda.</p>
        ) : (
          <div className="border border-ink/10 rounded divide-y divide-ink/10 max-h-64 overflow-y-auto">
            {alunos.map((a) => (
              <div key={a.aluno_id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-ink truncate">{a.profiles?.nome || '(sem nome)'}</p>
                  <p className="text-xs text-ink/40 truncate">{a.profiles?.email}</p>
                </div>
                <button onClick={() => removerAluno(a.aluno_id, a.profiles?.nome || 'este aluno')} className="text-erro text-xs hover:underline shrink-0">
                  Remover da turma
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* zona de perigo */}
      <div className="border border-erro/20 rounded p-4 bg-erro/5">
        <p className="text-sm font-medium text-erro mb-1">Excluir turma</p>
        <p className="text-xs text-ink/60 mb-3">
          Apaga a turma, o cronograma, os simulados e as tentativas de simulado dela
          permanentemente — use só se criou por engano. Respostas do banco de questões
          livre não se perdem (ficam sem turma vinculada), mas o restante do histórico
          dessa turma some. Se ela já teve alunos de verdade estudando, prefira
          <strong> Encerrar</strong> em vez de excluir.
        </p>
        <div className="flex items-center gap-2">
          <input
            value={confirmacaoExclusao}
            onChange={(e) => setConfirmacaoExclusao(e.target.value)}
            placeholder={`Digite "${turma.nome}" para confirmar`}
            className="flex-1 border border-erro/30 rounded px-3 py-2 text-sm focus:border-erro"
          />
          <button
            onClick={excluirTurma}
            disabled={!nomeConfere || excluindo}
            className="bg-erro text-white px-4 py-2 rounded text-sm hover:bg-erro/90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {excluindo ? 'Excluindo…' : 'Excluir turma'}
          </button>
        </div>
      </div>
    </div>
  )
}
