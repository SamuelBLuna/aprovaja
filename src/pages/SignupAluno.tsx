import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, LineChart, CalendarCheck2 } from 'lucide-react'
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
        <div className="max-w-sm w-full bg-white border border-ink/10 rounded-xl p-6 text-center shadow-sm">
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
    <div className="min-h-screen flex bg-paper">
      <div className="hidden lg:flex lg:w-1/2 bg-ink text-paper flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gold/10" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-gold/5" />
        <div className="relative">
          <span className="font-serif text-3xl">aprova<span className="text-gold">JA</span></span>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-serif text-4xl leading-tight mb-6">Sua turma já está esperando por você.</h1>
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

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 lg:hidden">
            <h1 className="font-serif text-3xl text-ink">aprova<span className="text-gold">JA</span></h1>
            <p className="text-ink/60 text-sm mt-1">Cadastro de aluno</p>
          </div>
          <h2 className="hidden lg:block font-serif text-2xl text-ink mb-1">Criar sua conta</h2>
          <p className="hidden lg:block text-ink/50 text-sm mb-8">Peça o código da turma ao seu professor antes de começar.</p>

          <form onSubmit={handleSubmit} className="bg-white border border-ink/10 rounded-xl p-6 space-y-4 shadow-sm">
            <div>
              <label className="block text-sm text-ink/70 mb-1" htmlFor="nome">Nome completo</label>
              <input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)}
                className="w-full border border-ink/20 rounded-lg px-3 py-2.5 text-sm focus:border-gold transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-ink/70 mb-1" htmlFor="email">E-mail</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-ink/20 rounded-lg px-3 py-2.5 text-sm focus:border-gold transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-ink/70 mb-1" htmlFor="password">Senha</label>
              <input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-ink/20 rounded-lg px-3 py-2.5 text-sm focus:border-gold transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-ink/70 mb-1" htmlFor="codigo">Código da turma</label>
              <input id="codigo" required value={codigoTurma} onChange={(e) => setCodigoTurma(e.target.value)}
                placeholder="Ex: TRT2024"
                className="w-full border border-ink/20 rounded-lg px-3 py-2.5 text-sm uppercase focus:border-gold transition-colors" />
              <p className="text-xs text-ink/50 mt-1">Peça este código para o seu professor.</p>
            </div>

            {error && <p className="text-erro text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-ink text-white py-2.5 rounded-lg text-sm font-medium hover:bg-ink-light transition-colors disabled:opacity-50">
              {loading ? 'Criando conta…' : 'Criar conta'}
            </button>
          </form>

          <p className="text-center text-sm text-ink/60 mt-5">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-gold hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
