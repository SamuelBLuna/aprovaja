import EntrarTurmaForm from './EntrarTurmaForm'

export default function SemTurma() {
  return (
    <div className="bg-white border border-ink/10 rounded-lg p-8 text-center max-w-md mx-auto mt-10">
      <p className="text-4xl mb-3">🎓</p>
      <h2 className="font-serif text-xl text-ink mb-2">Você não está em nenhuma turma no momento</h2>
      <p className="text-ink/60 text-sm mb-5">
        Peça o código da turma para o seu professor e entre abaixo — sem precisar criar uma conta nova.
      </p>
      <EntrarTurmaForm onSuccess={() => window.location.reload()} />
    </div>
  )
}
