import { useState, FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function ConfiguracoesConta() {
  const { profile, refreshProfile, signOut } = useAuth()
  const [nome, setNome] = useState(profile?.nome || '')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [msgNome, setMsgNome] = useState<string | null>(null)
  const [msgSenha, setMsgSenha] = useState<string | null>(null)
  const [erroSenha, setErroSenha] = useState(false)
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  async function salvarNome(e: FormEvent) {
    e.preventDefault()
    setSalvandoNome(true)
    setMsgNome(null)
    const { error } = await supabase.from('profiles').update({ nome: nome.trim() }).eq('id', profile!.id)
    setSalvandoNome(false)
    setMsgNome(error ? 'Erro ao salvar.' : 'Nome atualizado.')
    if (!error) refreshProfile()
  }

  async function salvarSenha(e: FormEvent) {
    e.preventDefault()
    setErroSenha(false)
    if (!senhaAtual) { setErroSenha(true); setMsgSenha('Informe sua senha atual.'); return }
    if (novaSenha.length < 6) { setErroSenha(true); setMsgSenha('A nova senha precisa ter no mínimo 6 caracteres.'); return }

    setSalvandoSenha(true)
    setMsgSenha(null)

    // reautentica com a senha atual antes de trocar — evita que alguém
    // com a sessão aberta na sua frente troque sua senha sem saber ela
    const { error: authError } = await supabase.auth.signInWithPassword({ email: profile!.email, password: senhaAtual })
    if (authError) {
      setSalvandoSenha(false)
      setErroSenha(true)
      setMsgSenha('Senha atual incorreta.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setSalvandoSenha(false)
    if (error) {
      setErroSenha(true)
      setMsgSenha(error.message)
    } else {
      setErroSenha(false)
      setMsgSenha('Senha atualizada.')
      setSenhaAtual('')
      setNovaSenha('')
    }
  }

  async function excluirConta() {
    if (!confirm('Tem certeza que quer excluir sua conta? Você poderá recuperá-la fazendo login novamente antes que ela seja removida definitivamente.')) return
    const { error } = await supabase.rpc('solicitar_exclusao_conta')
    if (!error) {
      alert('Conta marcada para exclusão. Você pode recuperá-la fazendo login novamente.')
      await signOut()
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <form onSubmit={salvarNome} className="bg-white border border-ink/[0.07] rounded-xl shadow-soft p-5 space-y-3">
        <h2 className="font-serif text-lg text-ink">Nome</h2>
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm focus:border-gold" />
        {msgNome && <p className="text-sm text-acerto">{msgNome}</p>}
        <button disabled={salvandoNome} className="bg-ink text-white px-4 py-2.5 rounded-lg text-sm hover:bg-ink-light transition-colors shadow-soft disabled:opacity-50">
          {salvandoNome ? 'Salvando…' : 'Salvar'}
        </button>
      </form>

      <form onSubmit={salvarSenha} className="bg-white border border-ink/[0.07] rounded-xl shadow-soft p-5 space-y-3">
        <h2 className="font-serif text-lg text-ink">Trocar senha</h2>
        <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} placeholder="Senha atual"
          className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm focus:border-gold" />
        <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Nova senha" minLength={6}
          className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm focus:border-gold" />
        {msgSenha && <p className={`text-sm ${erroSenha ? 'text-erro' : 'text-acerto'}`}>{msgSenha}</p>}
        <button disabled={salvandoSenha} className="bg-ink text-white px-4 py-2.5 rounded-lg text-sm hover:bg-ink-light transition-colors shadow-soft disabled:opacity-50">
          {salvandoSenha ? 'Salvando…' : 'Atualizar senha'}
        </button>
      </form>

      <div className="bg-white border border-erro/20 rounded p-5 space-y-2">
        <h2 className="font-serif text-lg text-erro">Excluir conta</h2>
        <p className="text-ink/60 text-sm">Sua conta será desativada, mas poderá ser recuperada fazendo login novamente antes da remoção definitiva.</p>
        <button onClick={excluirConta} className="border border-erro text-erro px-4 py-2 rounded text-sm hover:bg-erro/5">Excluir minha conta</button>
      </div>
    </div>
  )
}
