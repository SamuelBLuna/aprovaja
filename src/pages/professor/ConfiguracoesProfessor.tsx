import ConfiguracoesConta from '../../components/ConfiguracoesConta'
import PageHeader from '../../components/ui/PageHeader'

export default function ConfiguracoesProfessor() {
  return (
    <div>
      <PageHeader title="Configurações" subtitle="Gerencie sua conta." />
      <ConfiguracoesConta />
    </div>
  )
}
