import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// Usamos HashRouter (URLs com #) porque o GitHub Pages não sabe
// redirecionar rotas de SPA para o index.html — assim funciona sem configuração extra.
ReactDOM.createRoot(document.getElementById('root')!).render(
 <React.StrictMode>
 <ErrorBoundary>
 <HashRouter>
 <AuthProvider>
 <App />
 </AuthProvider>
 </HashRouter>
 </ErrorBoundary>
 </React.StrictMode>,
)
