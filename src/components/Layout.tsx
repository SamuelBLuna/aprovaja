import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificacoesBanner from './NotificacoesBanner'

const professorLinks = [
  { to: '/professor', label: 'Painel', end: true },
  { to: '/professor/cronograma', label: 'Cronograma' },
  { to: '/professor/materias', label: 'Matérias' },
  { to: '/professor/questoes', label: 'Questões' },
  { to: '/professor/simulados', label: 'Simulados' },
  { to: '/professor/alunos', label: 'Alunos' },
  { to: '/professor/configuracoes', label: 'Configurações' },
]

const alunoLinks = [
  { to: '/aluno', label: 'Painel', end: true },
  { to: '/aluno/questoes', label: 'Questões' },
  { to: '/aluno/simulados', label: 'Simulados' },
  { to: '/aluno/desempenho', label: 'Desempenho' },
  { to: '/aluno/configuracoes', label: 'Configurações' },
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
          <span className="block w-6 h-0.5 bg-paper mb-1.5" />
          <span className="block w-6 h-0.5 bg-paper mb-1.5" />
          <span className="block w-6 h-0.5 bg-paper" />
        </button>
      </div>

      {menuAberto && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setMenuAberto(false)} />
      )}

      <aside className={`w-64 shrink-0 bg-ink text-paper flex flex-col fixed md:static inset-y-0 left-0 z-30 transition-transform
        ${menuAberto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="px-6 py-6 border-b border-white/10 hidden md:block">
          <span className="font-serif text-2xl tracking-tight">aprova<span className="text-gold">JA</span></span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 mt-14 md:mt-0">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMenuAberto(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm transition-colors ${
                  isActive ? 'bg-white/10 text-white font-medium' : 'text-paper/70 hover:bg-white/5 hover:text-paper'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10 text-sm">
          <p className="text-paper/60 truncate mb-2">{profile?.nome}</p>
          <button onClick={() => signOut()} className="text-gold hover:text-gold-light text-sm">
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto mt-14 md:mt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {profile?.role === 'aluno' && <NotificacoesBanner />}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
