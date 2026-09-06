import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-ink">aprova<span className="text-gold">JA</span></h1>
          <p className="text-ink/60 text-sm mt-1">Estude com foco. Acompanhe seu progresso.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-ink/10 rounded p-6 space-y-4">
          <div>
            <label className="block text-sm text-ink/70 mb-1" htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-ink/20 rounded px-3 py-2 text-sm focus:border-gold"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/70 mb-1" htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-ink/20 rounded px-3 py-2 text-sm focus:border-gold"
            />
          </div>

          {error && <p className="text-erro text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-white py-2 rounded text-sm font-medium hover:bg-ink-light disabled:opacity-50"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-ink/60 mt-5">
          É aluno e tem um código de turma?{' '}
          <Link to="/cadastro" className="text-gold hover:underline">Cadastre-se</Link>
        </p>
      </div>
    </div>
  )
}
