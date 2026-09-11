import { ReactNode } from 'react'

interface BadgeProps {
 children: ReactNode
 tone?: 'neutral' | 'gold' | 'acerto' | 'erro' | 'info'
}

const tons = {
 neutral: 'bg-slate-100 text-slate-600',
 gold: 'bg-gold-light text-gold-dark',
 acerto: 'bg-acerto-light text-acerto',
 erro: 'bg-erro-light text-erro',
 info: 'bg-info-light text-info',
}

export default function Badge({ children, tone = 'neutral' }: BadgeProps) {
 return (
 <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${tons[tone]}`}>
 {children}
 </span>
 )
}
