import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../lib/types'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUpAluno: (params: { nome: string; email: string; password: string; codigoTurma: string }) => Promise<{ error: string | null; precisaConfirmarEmail?: boolean }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error || !data) {
      // sessão sem perfil correspondente (ex: apagado direto na tabela) — nunca deixa a pessoa presa
      setProfile(null)
      await supabase.auth.signOut()
      return
    }
    setProfile(data as Profile)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: traduzErro(error.message) }
    return { error: null }
  }

  async function signUpAluno({ nome, email, password, codigoTurma }: { nome: string; email: string; password: string; codigoTurma: string }) {
    const codigo = codigoTurma.trim()

    // valida o código ANTES de criar a conta — evita conta órfã e não depende de sessão
    const { data: turmaValida, error: validaError } = await supabase.rpc('validar_codigo_turma', { p_codigo: codigo })
    if (validaError) return { error: 'Não foi possível validar o código agora. Tente novamente em instantes.' }
    if (!turmaValida || turmaValida.length === 0) return { error: 'Código de turma inválido ou turma encerrada. Confira com seu professor.' }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome, role: 'aluno', codigo_turma: codigo } },
    })
    if (error) return { error: traduzErro(error.message) }
    if (!data.user) return { error: 'Não foi possível criar a conta. Tente novamente.' }

    // Supabase retorna "sucesso" com identities vazio quando o e-mail já existe (proteção anti-enumeração)
    if (data.user.identities && data.user.identities.length === 0) {
      return { error: 'Já existe uma conta com este e-mail. Faça login.' }
    }

    // Se a confirmação de e-mail estiver ativada no projeto, não há sessão ainda —
    // a matrícula na turma já foi feita pelo gatilho no banco, independente disso.
    if (!data.session) {
      return { error: null, precisaConfirmarEmail: true }
    }

    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (session?.user) await loadProfile(session.user.id)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUpAluno, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

function traduzErro(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('User already registered')) return 'Já existe uma conta com este e-mail.'
  if (msg.includes('Password should be at least')) return 'A senha precisa ter no mínimo 6 caracteres.'
  return msg
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de um AuthProvider')
  return ctx
}
