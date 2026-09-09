import { useState, FormEvent } from 'react'
import { User, KeyRound, AlertOctagon } from 'lucide-react'
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
    <div className="space-y-5 max-w-lg">
      <form onSubmit={salvarNome} className="bg-white border border-ink/[0.07] rounded-xl shadow-soft p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-ink/5 flex items-center justify-center"><User className="w-4 h-4 text-ink/50" /></div>
          <h2 className="font-serif text-lg text-ink">Nome</h2>
        </div>
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full border border-ink/15 rounded-lg px-3 py-2.5 text-sm focus:border-gold outline-none transition-colors mb-3" />
        {msgNome && <p className="text-sm text-acerto mb-3">{msgNome}</p>}
        <button disabled={salvandoNome} className="bg-ink text-white px-4 py-2.5 rounded-lg text-sm hover:bg-ink-light transition-colors shadow-soft disabled:opacity-50">
          {salvandoNome ? 'Salvando…' : 'Salvar'}
        </button>
      </form>

      <form onSubmit={salvarSenha} className="bg-white border border-ink/[0.07] rounded-xl shadow-soft p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-ink/5 flex items-center justify-center"><KeyRound className="w-4 h-4 text-ink/50" /></div>
          <h2 className="font-serif text-lg text-ink">Trocar senha</h2>
        </div>
        <div className="space-y-2.5 mb-3">
          <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} placeholder="Senha atual"
            className="w-full border border-ink/15 rounded-lg px-3 py-2.5 text-sm focus:border-gold outline-none transition-colors" />
          <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Nova senha" minLength={6}
            className="w-full border border-ink/15 rounded-lg px-3 py-2.5 text-sm focus:border-gold outline-none transition-colors" />
        </div>
        {msgSenha && <p className={`text-sm mb-3 ${erroSenha ? 'text-erro' : 'text-acerto'}`}>{msgSenha}</p>}
        <button disabled={salvandoSenha} className="bg-ink text-white px-4 py-2.5 rounded-lg text-sm hover:bg-ink-light transition-colors shadow-soft disabled:opacity-50">
          {salvandoSenha ? 'Salvando…' : 'Atualizar senha'}
        </button>
      </form>

      <div className="bg-white border border-erro/15 rounded-xl shadow-soft p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-erro-light flex items-center justify-center"><AlertOctagon className="w-4 h-4 text-erro" /></div>
          <h2 className="font-serif text-lg text-erro">Excluir conta</h2>
        </div>
        <p className="text-ink/50 text-sm mb-3">Sua conta será desativada, mas poderá ser recuperada fazendo login novamente antes da remoção definitiva.</p>
        <button onClick={excluirConta} className="border border-erro/30 text-erro px-4 py-2 rounded-lg text-sm hover:bg-erro-light transition-colors">Excluir minha conta</button>
      </div>
    </div>
  )
}
