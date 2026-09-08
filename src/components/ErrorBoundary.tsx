import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { erro: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null }

  static getDerivedStateFromError(erro: Error) {
    return { erro }
  }

  componentDidCatch(erro: Error, info: React.ErrorInfo) {
    console.error('Erro capturado pelo ErrorBoundary:', erro, info)
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-paper px-4">
          <div className="max-w-md w-full text-center">
            <h1 className="font-serif text-3xl text-ink mb-2">aprova<span className="text-gold">JA</span></h1>
            <div className="bg-white border border-ink/10 rounded-lg p-6 mt-6">
              <p className="text-erro text-sm font-medium mb-2">Algo deu errado.</p>
              <p className="text-ink/60 text-sm mb-4">
                Tente recarregar a página. Se o problema continuar, verifique se as variáveis de ambiente do Supabase estão configuradas corretamente.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-ink text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-ink-light transition-colors shadow-soft"
              >
                Recarregar
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
