import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
 variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
 size?: 'sm' | 'md'
 children: ReactNode
}

const variantes = {
 primary: 'bg-ink text-white hover:bg-ink-dark',
 secondary: 'border border-slate-200 text-slate-700 bg-white hover:bg-slate-50',
 ghost: 'text-ink hover:bg-ink-50',
 danger: 'border border-erro/30 text-erro hover:bg-erro-light',
}

const tamanhos = {
 sm: 'px-3 py-1.5 text-xs',
 md: 'px-4 py-2 text-sm',
}

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
 return (
 <button
 className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantes[variant]} ${tamanhos[size]} ${className}`}
 {...props}
 >
 {children}
 </button>
 )
}
