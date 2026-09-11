import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ChevronDown, LogOut, Settings, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import NotificacoesBanner from './NotificacoesBanner'

const professorLinks = [
 { to: '/professor', label: 'Painel', end: true },
 { to: '/professor/cronograma', label: 'Cronograma' },
 { to: '/professor/materias', label: 'Matérias' },
 { to: '/professor/questoes', label: 'Questões' },
 { to: '/professor/simulados', label: 'Simulados' },
 { to: '/professor/alunos', label: 'Alunos' },
]

const alunoLinks = [
 { to: '/aluno', label: 'Painel', end: true },
 { to: '/aluno/questoes', label: 'Questões' },
 { to: '/aluno/simulados', label: 'Simulados' },
 { to: '/aluno/desempenho', label: 'Desempenho' },
]

function iniciais(nome?: string) {
 if (!nome) return '?'
 const partes = nome.trim().split(' ')
 return ((partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
}

export default function Layout() {
 const { profile, signOut } = useAuth()
 const [menuAberto, setMenuAberto] = useState(false)
 const [perfilAberto, setPerfilAberto] = useState(false)
 const perfilRef = useRef<HTMLDivElement>(null)
 const links = profile?.role === 'professor' ? professorLinks : alunoLinks
 const configuracoesPath = profile?.role === 'professor' ? '/professor/configuracoes' : '/aluno/configuracoes'

 useEffect(() => {
 function fechar(e: MouseEvent) {
 if (perfilRef.current && !perfilRef.current.contains(e.target as Node)) setPerfilAberto(false)
 }
 document.addEventListener('mousedown', fechar)
 return () => document.removeEventListener('mousedown', fechar)
 }, [])

 return (
 <div className="min-h-screen bg-paper">
 <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
 <div className="flex items-center gap-8 min-w-0">
 <span className="font-extrabold text-lg text-ink shrink-0 tracking-tight">aprova<span className="text-gold">JA</span></span>
 <nav className="hidden md:flex items-center gap-1">
 {links.map((link) => (
 <NavLink
 key={link.to}
 to={link.to}
 end={link.end}
 className={({ isActive }) =>
 `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
 isActive ? 'text-ink bg-ink-50' : 'text-slate-500 hover:text-ink hover:bg-slate-50'
 }`
 }
 >
 {link.label}
 </NavLink>
 ))}
 </nav>
 </div>

 <div className="flex items-center gap-3">
 <button className="md:hidden p-2 text-slate-500" onClick={() => setMenuAberto((v) => !v)} aria-label="Abrir menu">
 {menuAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
 </button>

 <div className="relative hidden md:block" ref={perfilRef}>
 <button onClick={() => setPerfilAberto((v) => !v)} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-50 transition-colors">
 <div className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center text-xs font-semibold">
 {iniciais(profile?.nome)}
 </div>
 <span className="text-sm text-slate-700 font-medium max-w-[120px] truncate">{profile?.nome?.split(' ')[0]}</span>
 <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
 </button>
 {perfilAberto && (
 <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl py-1.5 animate-[fadeIn_0.1s_ease-out]">
 <div className="px-3.5 py-2 border-b border-slate-100">
 <p className="text-sm font-medium text-slate-800 truncate">{profile?.nome}</p>
 <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
 </div>
 <NavLink to={configuracoesPath} onClick={() => setPerfilAberto(false)} className="flex items-center gap-2 px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-50">
 <Settings className="w-4 h-4" /> Configurações
 </NavLink>
 <button onClick={() => signOut()} className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-erro hover:bg-erro-light">
 <LogOut className="w-4 h-4" /> Sair
 </button>
 </div>
 )}
 </div>
 </div>
 </div>

 {menuAberto && (
 <nav className="md:hidden border-t border-slate-100 px-4 py-2 space-y-0.5">
 {links.map((link) => (
 <NavLink
 key={link.to}
 to={link.to}
 end={link.end}
 onClick={() => setMenuAberto(false)}
 className={({ isActive }) => `block px-3 py-2.5 rounded-lg text-sm font-medium ${isActive ? 'text-ink bg-ink-50' : 'text-slate-600'}`}
 >
 {link.label}
 </NavLink>
 ))}
 <NavLink to={configuracoesPath} onClick={() => setMenuAberto(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600">
 Configurações
 </NavLink>
 <button onClick={() => signOut()} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-erro">Sair</button>
 </nav>
 )}
 </header>

 <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
 {profile?.role === 'aluno' && <NotificacoesBanner />}
 <Outlet />
 </main>
 </div>
 )
}
