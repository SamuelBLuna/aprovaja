import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function usePossuiTurma() {
  const { profile } = useAuth()
  const [possuiTurma, setPossuiTurma] = useState<boolean | null>(null) // null = ainda checando

  useEffect(() => {
    if (!profile) return
    supabase.from('turma_alunos').select('turma_id', { count: 'exact', head: true }).eq('aluno_id', profile.id).then(({ count }) => {
      setPossuiTurma((count || 0) > 0)
    })
  }, [profile])

  return possuiTurma
}
