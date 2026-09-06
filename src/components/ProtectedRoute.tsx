import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { UserRole } from '../lib/types'

export default function ProtectedRoute({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper text-ink">
        Carregando…
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (profile?.deleted_at) return <Navigate to="/recuperar-conta" replace />
  if (profile && profile.role !== role) {
    return <Navigate to={profile.role === 'professor' ? '/professor' : '/aluno'} replace />
  }

  return <>{children}</>
}
