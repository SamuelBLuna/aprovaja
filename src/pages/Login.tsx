import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, LineChart, CalendarCheck2 } from 'lucide-react'
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
    <div className="min-h-screen flex bg-paper">
      {/* painel de marca — só em telas maiores */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink text-paper flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gold/10" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-gold/5" />
        <div className="relative">
          <span className="font-serif text-3xl">aprova<span className="text-gold">JA</span></span>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-serif text-4xl leading-tight mb-6">
            Estude com direção.<br />Evolua com evidência.
          </h1>
          <div className="space-y-4 text-paper/70 text-sm">
            <div className="flex items-center gap-3">
              <CalendarCheck2 className="w-5 h-5 text-gold shrink-0" />
              <span>Cronograma diário definido pelo seu professor</span>
            </div>
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5 text-gold shrink-0" />
              <span>Banco de questões e simulados cronometrados</span>
            </div>
            <div className="flex items-center gap-3">
              <LineChart className="w-5 h-5 text-gold shrink-0" />
              <span>Desempenho real, matéria por matéria</span>
            </div>
          </div>
        </div>
        <p className="relative text-paper/40 text-xs">Feito para quem leva o concurso a sério.</p>
      </div>

      {/* formulário */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 lg:hidden">
            <h1 className="font-serif text-3xl text-ink">aprova<span className="text-gold">JA</span></h1>
            <p className="text-ink/60 text-sm mt-1">Estude com foco. Acompanhe seu progresso.</p>
          </div>
          <h2 className="hidden lg:block font-serif text-2xl text-ink mb-1">Bem-vindo de volta</h2>
          <p className="hidden lg:block text-ink/50 text-sm mb-8">Entre com seus dados para continuar seus estudos.</p>

          <form onSubmit={handleSubmit} className="bg-white border border-ink/10 rounded-xl p-6 space-y-4 shadow-sm">
            <div>
              <label className="block text-sm text-ink/70 mb-1" htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-ink/20 rounded-lg px-3 py-2.5 text-sm focus:border-gold transition-colors"
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
                className="w-full border border-ink/20 rounded-lg px-3 py-2.5 text-sm focus:border-gold transition-colors"
              />
            </div>

            {error && <p className="text-erro text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-white py-2.5 rounded-lg text-sm font-medium hover:bg-ink-light transition-colors disabled:opacity-50"
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
    </div>
  )
}
