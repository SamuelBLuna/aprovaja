import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import SignupAluno from './pages/SignupAluno'
import RecuperarConta from './pages/RecuperarConta'

import DashboardProfessor from './pages/professor/DashboardProfessor'
import Cronograma from './pages/professor/Cronograma'
import Materias from './pages/professor/Materias'
import QuestoesProfessor from './pages/professor/Questoes'
import Simulados from './pages/professor/Simulados'
import Alunos from './pages/professor/Alunos'
import ConfiguracoesProfessor from './pages/professor/ConfiguracoesProfessor'

import DashboardAluno from './pages/aluno/DashboardAluno'
import QuestoesAluno from './pages/aluno/QuestoesAluno'
import SimuladosAluno from './pages/aluno/SimuladosAluno'
import DesempenhoAluno from './pages/aluno/DesempenhoAluno'
import ConfiguracoesAluno from './pages/aluno/ConfiguracoesAluno'

export default function App() {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-paper text-ink">Carregando…</div>
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to={profile?.role === 'professor' ? '/professor' : '/aluno'} /> : <Login />} />
      <Route path="/cadastro" element={session ? <Navigate to="/aluno" /> : <SignupAluno />} />
      <Route path="/recuperar-conta" element={session ? <RecuperarConta /> : <Navigate to="/login" />} />

      <Route path="/professor" element={<ProtectedRoute role="professor"><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardProfessor />} />
        <Route path="cronograma" element={<Cronograma />} />
        <Route path="materias" element={<Materias />} />
        <Route path="questoes" element={<QuestoesProfessor />} />
        <Route path="simulados" element={<Simulados />} />
        <Route path="alunos" element={<Alunos />} />
        <Route path="configuracoes" element={<ConfiguracoesProfessor />} />
      </Route>

      <Route path="/aluno" element={<ProtectedRoute role="aluno"><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardAluno />} />
        <Route path="questoes" element={<QuestoesAluno />} />
        <Route path="simulados" element={<SimuladosAluno />} />
        <Route path="desempenho" element={<DesempenhoAluno />} />
        <Route path="configuracoes" element={<ConfiguracoesAluno />} />
      </Route>

      <Route path="*" element={<Navigate to={session ? (profile?.role === 'professor' ? '/professor' : '/aluno') : '/login'} replace />} />
    </Routes>
  )
}
