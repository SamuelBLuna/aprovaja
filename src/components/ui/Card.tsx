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
 className={`bg-white border border-slate-200 rounded-xl ${paddings[padding]} ${
 interactive ? 'hover:border-ink-light/40 transition-colors cursor-pointer' : ''
 } ${className}`}
 {...props}
 >
 {children}
 </div>
 )
}
