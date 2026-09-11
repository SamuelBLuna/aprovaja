import EntrarTurmaForm from './EntrarTurmaForm'

export default function SemTurma() {
 return (
 <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-md mx-auto mt-10">
 <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center text-3xl mx-auto mb-4">🎓</div>
 <h2 className="font-serif text-xl text-ink mb-2">Você não está em nenhuma turma no momento</h2>
 <p className="text-slate-500 text-sm mb-6">
 Peça o código da turma para o seu professor e entre abaixo — sem precisar criar uma conta nova.
 </p>
 <EntrarTurmaForm onSuccess={() => window.location.reload()} />
 </div>
 )
}
