import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SignupAluno() {
  const { signUpAluno } = useAuth()
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [codigoTurma, setCodigoTurma] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [precisaConfirmar, setPrecisaConfirmar] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error, precisaConfirmarEmail } = await signUpAluno({ nome, email, password, codigoTurma })
    setLoading(false)
    if (error) {
      setError(error)
    } else if (precisaConfirmarEmail) {
      setPrecisaConfirmar(true)
    } else {
      navigate('/aluno')
    }
  }

  if (precisaConfirmar) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper px-4">
        <div className="max-w-sm w-full bg-white border border-ink/10 rounded p-6 text-center">
          <h1 className="font-serif text-xl text-ink mb-2">Confirme seu e-mail</h1>
          <p className="text-ink/60 text-sm mb-4">
            Enviamos um link de confirmação para <strong>{email}</strong>. Depois de confirmar, é só fazer login normalmente — você já estará matriculado na turma.
          </p>
          <Link to="/login" className="text-gold hover:underline text-sm">Ir para o login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-ink">aprova<span className="text-gold">JA</span></h1>
          <p className="text-ink/60 text-sm mt-1">Cadastro de aluno</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-ink/10 rounded p-6 space-y-4">
          <div>
            <label className="block text-sm text-ink/70 mb-1" htmlFor="nome">Nome completo</label>
            <input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)}
              className="w-full border border-ink/20 rounded px-3 py-2 text-sm focus:border-gold" />
          </div>
          <div>
            <label className="block text-sm text-ink/70 mb-1" htmlFor="email">E-mail</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-ink/20 rounded px-3 py-2 text-sm focus:border-gold" />
          </div>
          <div>
            <label className="block text-sm text-ink/70 mb-1" htmlFor="password">Senha</label>
            <input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-ink/20 rounded px-3 py-2 text-sm focus:border-gold" />
          </div>
          <div>
            <label className="block text-sm text-ink/70 mb-1" htmlFor="codigo">Código da turma</label>
            <input id="codigo" required value={codigoTurma} onChange={(e) => setCodigoTurma(e.target.value)}
              placeholder="Ex: TRT2024"
              className="w-full border border-ink/20 rounded px-3 py-2 text-sm uppercase focus:border-gold" />
            <p className="text-xs text-ink/50 mt-1">Peça este código para o seu professor.</p>
          </div>

          {error && <p className="text-erro text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-ink text-white py-2 rounded text-sm font-medium hover:bg-ink-light disabled:opacity-50">
            {loading ? 'Criando conta…' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-ink/60 mt-5">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-gold hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
