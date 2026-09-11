import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, LineChart, CalendarCheck2, Sparkles } from 'lucide-react'
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

 <div className="relative">
 <span className="font-serif font-bold text-3xl tracking-tight">aprova<span className="text-gold">JA</span></span>
 </div>
 <div className="relative max-w-md">
 <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium mb-5 border border-white/10">
 <Sparkles className="w-3.5 h-3.5 text-gold" /> Feito pra quem leva o concurso a sério
 </div>
 <h1 className="font-serif font-bold text-4xl leading-tight mb-6">
 Estude com direção.<br />Evolua com evidência.
 </h1>
 <div className="space-y-4 text-paper/80 text-sm">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><CalendarCheck2 className="w-4 h-4 text-gold" /></div>
 <span>Cronograma diário definido pelo seu professor</span>
 </div>
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><GraduationCap className="w-4 h-4 text-gold" /></div>
 <span>Banco de questões e simulados cronometrados</span>
 </div>
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><LineChart className="w-4 h-4 text-gold" /></div>
 <span>Desempenho real, matéria por matéria</span>
 </div>
 </div>
 </div>
 <p className="relative text-paper/40 text-xs">© aprovaJA</p>
 </div>

 {/* formulário */}
 <div className="flex-1 flex items-center justify-center px-4 py-12">
 <div className="w-full max-w-sm">
 <div className="text-center mb-8 lg:hidden">
 <h1 className="font-serif font-bold text-3xl text-ink">aprova<span className="text-gold">JA</span></h1>
 <p className="text-slate-500 text-sm mt-1">Estude com foco. Acompanhe seu progresso.</p>
 </div>
 <h2 className="hidden lg:block font-serif font-bold text-2xl text-ink mb-1">Bem-vindo de volta 👋</h2>
 <p className="hidden lg:block text-slate-500 text-sm mb-8">Entre com seus dados para continuar seus estudos.</p>

 <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 ">
 <div>
 <label className="block text-sm text-slate-600 mb-1" htmlFor="email">E-mail</label>
 <input
 id="email"
 type="email"
 required
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-ink-light focus:ring-2 focus:ring-ink-light/20 transition-all"
 />
 </div>
 <div>
 <label className="block text-sm text-slate-600 mb-1" htmlFor="password">Senha</label>
 <input
 id="password"
 type="password"
 required
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-ink-light focus:ring-2 focus:ring-ink-light/20 transition-all"
 />
 </div>

 {error && <p className="text-erro text-sm bg-erro-light rounded-lg px-3 py-2">{error}</p>}

 <button
 type="submit"
 disabled={loading}
 className="w-full bg-ink text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-ink-dark transition-colors disabled:opacity-50"
 >
 {loading ? 'Entrando…' : 'Entrar'}
 </button>
 </form>

 <p className="text-center text-sm text-slate-500 mt-5">
 É aluno e tem um código de turma?{' '}
 <Link to="/cadastro" className="text-gold font-medium hover:text-gold-dark transition-colors">Cadastre-se</Link>
 </p>
 </div>
 </div>
 </div>
 )
}
