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

export default function Layout() {
  const { profile, signOut } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)
  const links = profile?.role === 'professor' ? professorLinks : alunoLinks

  return (
    <div className="min-h-screen flex bg-paper">
      {/* topo mobile */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-ink text-paper flex items-center justify-between px-4 h-14">
        <span className="font-serif text-xl">aprova<span className="text-gold">JA</span></span>
        <button onClick={() => setMenuAberto((v) => !v)} className="p-2" aria-label="Abrir menu">
          {menuAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {menuAberto && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setMenuAberto(false)} />
      )}

      <aside className={`w-64 shrink-0 bg-ink text-paper flex flex-col fixed md:static inset-y-0 left-0 z-30 transition-transform
        ${menuAberto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="px-6 py-6 border-b border-white/10 hidden md:block">
          <span className="font-serif text-2xl tracking-tight">aprova<span className="text-gold">JA</span></span>
          <p className="text-paper/40 text-[11px] tracking-widest uppercase mt-0.5">
            {profile?.role === 'professor' ? 'Painel do professor' : 'Painel do aluno'}
          </p>
        </div>
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
                  `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive ? 'bg-white/10 text-white font-medium' : 'text-paper/65 hover:bg-white/5 hover:text-paper'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-gold" />}
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                    <span>{link.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
        <div className="px-4 py-4 border-t border-white/10 text-sm">
          <p className="text-paper/60 truncate mb-2">{profile?.nome}</p>
          <button onClick={() => signOut()} className="flex items-center gap-2 text-gold hover:text-gold-light text-sm transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto mt-14 md:mt-0 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {profile?.role === 'aluno' && <NotificacoesBanner />}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
