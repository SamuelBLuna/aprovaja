import { Users2 } from 'lucide-react'
import ConfiguracoesConta from '../../components/ConfiguracoesConta'
import EntrarTurmaForm from '../../components/EntrarTurmaForm'
import PageHeader from '../../components/ui/PageHeader'

export default function ConfiguracoesAluno() {
 return (
 <div>
 <PageHeader title="Configurações" subtitle="Gerencie sua conta e suas turmas." />
 <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-lg mb-5">
 <div className="flex items-center gap-2 mb-3">
 <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center"><Users2 className="w-4 h-4 text-gold-dark" /></div>
 <h2 className="text-base font-semibold text-slate-900">Entrar em outra turma</h2>
 </div>
 <EntrarTurmaForm titulo="Tem o código de outra turma? Entre sem precisar criar uma conta nova." />
 </div>
 <ConfiguracoesConta />
 </div>
 )
}
