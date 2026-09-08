import ConfiguracoesConta from '../../components/ConfiguracoesConta'
import EntrarTurmaForm from '../../components/EntrarTurmaForm'

export default function ConfiguracoesAluno() {
  return (
    <div>
      <h1 className="font-serif text-2xl text-ink mb-6">Configurações</h1>
      <div className="bg-white border border-ink/[0.07] rounded-xl shadow-soft p-5 max-w-lg mb-6">
        <h2 className="font-serif text-lg text-ink mb-3">Entrar em outra turma</h2>
        <EntrarTurmaForm titulo="Tem o código de outra turma? Entre sem precisar criar uma conta nova." />
      </div>
      <ConfiguracoesConta />
    </div>
  )
}
