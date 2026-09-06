export type UserRole = 'professor' | 'aluno'
export type TurmaStatus = 'ativa' | 'encerrada'
export type QuestaoTipo = 'multipla_escolha' | 'verdadeiro_falso'

export interface Profile {
  id: string
  nome: string
  email: string
  role: UserRole
  avatar_url: string | null
  deleted_at: string | null
  created_at: string
}

export interface Turma {
  id: string
  nome: string
  codigo_turma: string
  data_inicio: string
  data_fim: string
  status: TurmaStatus
  created_by: string
  created_at: string
}

export interface Materia {
  id: string
  professor_id: string
  nome: string
  cor: string
  created_at: string
}

export interface Topico {
  id: string
  materia_id: string
  nome: string
  descricao: string | null
  ordem: number
  created_at: string
}

export interface GrupoQuestoes {
  id: string
  professor_id: string
  materia_id: string | null
  topico_id: string | null
  titulo: string
  texto_base: string
  created_at: string
}

export interface Alternativa {
  id: string // 'A' | 'B' | 'C' | 'D' | 'E'
  texto: string
}

export interface Questao {
  id: string
  professor_id: string
  materia_id: string
  topico_id: string | null
  grupo_id: string | null
  tipo: QuestaoTipo
  enunciado: string
  alternativas: Alternativa[] | null
  resposta_correta: string
  explicacao: string | null
  nivel_dificuldade: 1 | 2 | 3
  precisa_revisao: boolean
  created_at: string
}

export interface CronogramaItem {
  id: string
  turma_id: string
  data_inicio: string // YYYY-MM-DD
  data_fim: string // YYYY-MM-DD
  titulo: string | null
  descricao: string | null
  materia_id: string | null
  topico_id: string | null
  created_by: string
  created_at: string
}

export interface Simulado {
  id: string
  turma_id: string
  professor_id: string
  titulo: string
  descricao: string | null
  data_disponivel: string
  data_limite: string | null
  tempo_limite_minutos: number
  created_at: string
}

export interface SimuladoTentativa {
  id: string
  simulado_id: string
  aluno_id: string
  iniciado_em: string
  finalizado_em: string | null
  tempo_total_segundos: number | null
  acertos: number
  erros: number
}

export interface Resposta {
  id: string
  aluno_id: string
  questao_id: string
  turma_id: string | null
  tentativa_id: string | null
  resposta_dada: string
  correta: boolean
  tempo_gasto_segundos: number | null
  created_at: string
}

export interface Notificacao {
  id: string
  aluno_id: string
  titulo: string
  mensagem: string
  lida: boolean
  created_at: string
}
