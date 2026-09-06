export function isoHoje() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function somarDias(iso: string, dias: number) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function enumerarDatas(inicio: string, fim: string): string[] {
  const datas: string[] = []
  let cursor = inicio
  let guard = 0
  while (cursor <= fim && guard < 400) {
    datas.push(cursor)
    cursor = somarDias(cursor, 1)
    guard += 1
  }
  return datas
}
