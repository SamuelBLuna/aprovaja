import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  tone?: 'neutral' | 'gold' | 'acerto' | 'erro'
}

const tons = {
  neutral: 'bg-ink/[0.06] text-ink/70',
  gold: 'bg-gold/15 text-gold-dark',
  acerto: 'bg-acerto-light text-acerto',
  erro: 'bg-erro-light text-erro',
}

export default function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide ${tons[tone]}`}>
      {children}
    </span>
  )
}
