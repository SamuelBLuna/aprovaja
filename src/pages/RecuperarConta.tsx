import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function RecuperarConta() {
  const { profile, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()

  async function recuperar() {
    const { error } = await supabase.rpc('cancelar_exclusao_conta')
    if (!error) {
      await refreshProfile()
      navigate(profile?.role === 'professor' ? '/professor' : '/aluno')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="max-w-sm w-full bg-white border border-ink/10 rounded p-6 text-center">
        <h1 className="font-serif text-xl text-ink mb-2">Sua conta está marcada para exclusão</h1>
        <p className="text-ink/60 text-sm mb-6">Você pode recuperar o acesso agora, ou continuar e a conta permanecerá desativada.</p>
        <button onClick={recuperar} className="w-full bg-ink text-white py-2 rounded text-sm font-medium hover:bg-ink-light mb-2">
          Recuperar minha conta
        </button>
        <button onClick={() => signOut()} className="w-full border border-ink/20 text-ink py-2 rounded text-sm hover:bg-ink/5">
          Sair
        </button>
      </div>
    </div>
  )
}
