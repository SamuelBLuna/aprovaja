import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, BookOpen, HelpCircle, ClipboardList,
  Users, Settings, LogOut, Menu, X, TrendingUp,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import NotificacoesBanner from './NotificacoesBanner'

const professorLinks = [
  { to: '/professor', label: 'Painel', end: true, icon: LayoutDashboard },
  { to: '/professor/cronograma', label: 'Cronograma', icon: CalendarDays },
  { to: '/professor/materias', label: 'Matérias', icon: BookOpen },
  { to: '/professor/questoes', label: 'Questões', icon: HelpCircle },
  { to: '/professor/simulados', label: 'Simulados', icon: ClipboardList },
  { to: '/professor/alunos', label: 'Alunos', icon: Users },
  { to: '/professor/configuracoes', label: 'Configurações', icon: Settings },
]

const alunoLinks = [
  { to: '/aluno', label: 'Painel', end: true, icon: LayoutDashboard },
  { to: '/aluno/questoes', label: 'Questões', icon: HelpCircle },
  { to: '/aluno/simulados', label: 'Simulados', icon: ClipboardList },
  { to: '/aluno/desempenho', label: 'Desempenho', icon: TrendingUp },
  { to: '/aluno/configuracoes', label: 'Configurações', icon: Settings },
]

function iniciais(nome?: string) {
  if (!nome) return '?'
  const partes = nome.trim().split(' ')
  return (partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')
}

export default function Layout() {
  const { profile, signOut } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)
  const links = profile?.role === 'professor' ? professorLinks : alunoLinks

  return (
    <div className="min-h-screen flex bg-paper">
      {/* topo mobile */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-ink-gradient text-paper flex items-center justify-between px-4 h-14 shadow-lift">
        <span className="font-serif text-xl">aprova<span className="text-gold">JA</span></span>
        <button onClick={() => setMenuAberto((v) => !v)} className="p-2" aria-label="Abrir menu">
          {menuAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {menuAberto && (
        <div className="md:hidden fixed inset-0 z-20 bg-ink-dark/50 backdrop-blur-sm" onClick={() => setMenuAberto(false)} />
      )}

      <aside className={`w-64 shrink-0 bg-ink-gradient text-paper flex flex-col fixed md:static inset-y-0 left-0 z-30 transition-transform
        ${menuAberto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="px-6 py-7 hidden md:block">
          <span className="font-serif text-[26px] tracking-tight">aprova<span className="text-gold">JA</span></span>
          <p className="text-paper/35 text-[10px] tracking-[0.15em] uppercase mt-1 font-medium">
            {profile?.role === 'professor' ? 'Painel do professor' : 'Painel do aluno'}
          </p>
        </div>
        <div className="mx-4 border-t border-white/[0.08] hidden md:block" />
        <nav className="flex-1 px-3 py-4 space-y-0.5 mt-14 md:mt-4">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMenuAberto(false)}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                    isActive ? 'bg-white/[0.08] text-white font-medium' : 'text-paper/60 hover:bg-white/[0.04] hover:text-paper/90'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gold" />}
                    <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
                    <span>{link.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
        <div className="mx-4 border-t border-white/[0.08]" />
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gold/20 text-gold border border-gold/30 flex items-center justify-center text-xs font-semibold shrink-0">
            {iniciais(profile?.nome).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-paper/85 text-sm truncate">{profile?.nome}</p>
            <button onClick={() => signOut()} className="flex items-center gap-1 text-paper/40 hover:text-gold text-xs transition-colors">
              <LogOut className="w-3 h-3" /> Sair
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto mt-14 md:mt-0 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-9">
          {profile?.role === 'aluno' && <NotificacoesBanner />}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
