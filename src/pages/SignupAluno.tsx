import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, LineChart, CalendarCheck2, PartyPopper } from 'lucide-react'
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
 <div className="max-w-sm w-full bg-white border border-slate-200 rounded-2xl p-7 text-center">
 <div className="w-14 h-14 rounded-full bg-gold flex items-center justify-center mx-auto mb-4">
 <PartyPopper className="w-6 h-6 text-white" />
 </div>
 <h1 className="font-serif font-bold text-xl text-ink mb-2">Confirme seu e-mail</h1>
 <p className="text-slate-500 text-sm mb-4">
 Enviamos um link de confirmação para <strong>{email}</strong>. Depois de confirmar, é só fazer login normalmente — você já estará matriculado na turma.
 </p>
 <Link to="/login" className="text-gold font-medium hover:text-gold-dark text-sm transition-colors">Ir para o login</Link>
 </div>
 </div>
 )
 }

 return (
 <div className="min-h-screen flex bg-paper">
 <div className="hidden lg:flex lg:w-1/2 bg-ink text-paper flex-col justify-between p-12 relative overflow-hidden">

 <div className="relative">
 <span className="font-serif font-bold text-3xl tracking-tight">aprova<span className="text-gold">JA</span></span>
 </div>
 <div className="relative max-w-md">
 <h1 className="font-serif font-bold text-4xl leading-tight mb-6">Sua turma já está esperando por você. 🚀</h1>
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

 <div className="flex-1 flex items-center justify-center px-4 py-12">
 <div className="w-full max-w-sm">
 <div className="text-center mb-8 lg:hidden">
 <h1 className="font-serif font-bold text-3xl text-ink">aprova<span className="text-gold">JA</span></h1>
 <p className="text-slate-500 text-sm mt-1">Cadastro de aluno</p>
 </div>
 <h2 className="hidden lg:block font-serif font-bold text-2xl text-ink mb-1">Criar sua conta</h2>
 <p className="hidden lg:block text-slate-500 text-sm mb-8">Peça o código da turma ao seu professor antes de começar.</p>

 <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 ">
 <div>
 <label className="block text-sm text-slate-600 mb-1" htmlFor="nome">Nome completo</label>
 <input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)}
 className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-ink-light focus:ring-2 focus:ring-ink-light/20 transition-all" />
 </div>
 <div>
 <label className="block text-sm text-slate-600 mb-1" htmlFor="email">E-mail</label>
 <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
 className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-ink-light focus:ring-2 focus:ring-ink-light/20 transition-all" />
 </div>
 <div>
 <label className="block text-sm text-slate-600 mb-1" htmlFor="password">Senha</label>
 <input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
 className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-ink-light focus:ring-2 focus:ring-ink-light/20 transition-all" />
 </div>
 <div>
 <label className="block text-sm text-slate-600 mb-1" htmlFor="codigo">Código da turma</label>
 <input id="codigo" required value={codigoTurma} onChange={(e) => setCodigoTurma(e.target.value)}
 placeholder="Ex: TRT2024"
 className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm uppercase outline-none focus:border-ink-light focus:ring-2 focus:ring-ink-light/20 transition-all font-mono tracking-wider" />
 <p className="text-xs text-slate-500 mt-1">Peça este código para o seu professor.</p>
 </div>

 {error && <p className="text-erro text-sm bg-erro-light rounded-lg px-3 py-2">{error}</p>}

 <button type="submit" disabled={loading}
 className="w-full bg-ink text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-ink-dark transition-colors disabled:opacity-50">
 {loading ? 'Criando conta…' : 'Criar conta'}
 </button>
 </form>

 <p className="text-center text-sm text-slate-500 mt-5">
 Já tem uma conta?{' '}
 <Link to="/login" className="text-gold font-medium hover:text-gold-dark transition-colors">Entrar</Link>
 </p>
 </div>
 </div>
 </div>
 )
}
