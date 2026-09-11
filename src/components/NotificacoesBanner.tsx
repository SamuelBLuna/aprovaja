import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Notificacao } from '../lib/types'

export default function NotificacoesBanner() {
 const { profile } = useAuth()
 const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])

 useEffect(() => {
 if (!profile) return
 supabase
 .from('notificacoes')
 .select('*')
 .eq('aluno_id', profile.id)
 .eq('lida', false)
 .order('created_at', { ascending: false })
 .then(({ data }) => setNotificacoes((data as Notificacao[]) || []))
 }, [profile])

 async function dispensar(id: string) {
 setNotificacoes((prev) => prev.filter((n) => n.id !== id))
 await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
 }

 if (notificacoes.length === 0) return null

 return (
 <div className="space-y-2 mb-6">
 {notificacoes.map((n) => (
 <div key={n.id} className="bg-gold/10 border border-gold/30 rounded-lg px-4 py-3 flex items-start justify-between gap-3">
 <div>
 <p className="text-sm font-medium text-ink">{n.titulo}</p>
 <p className="text-sm text-slate-600 mt-0.5">{n.mensagem}</p>
 </div>
 <button onClick={() => dispensar(n.id)} className="text-slate-400 hover:text-ink shrink-0 text-lg leading-none" aria-label="Dispensar">
 ×
 </button>
 </div>
 ))}
 </div>
 )
}
