import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  interactive?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

const paddings = { sm: 'p-4', md: 'p-5', lg: 'p-6' }

export default function Card({ children, interactive, padding = 'md', className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white border border-ink/[0.07] rounded-xl shadow-soft ${paddings[padding]} ${
        interactive ? 'hover:shadow-card hover:border-gold/30 transition-all duration-200 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
