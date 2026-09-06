import { useState } from 'react'

interface MonthCalendarProps {
  selectedDate: string // YYYY-MM-DD
  onSelectDate: (date: string) => void
  markedDates?: Set<string>
  compact?: boolean
}

const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function hojeISO() {
  const d = new Date()
  return toISO(d.getFullYear(), d.getMonth(), d.getDate())
}

export default function MonthCalendar({ selectedDate, onSelectDate, markedDates, compact }: MonthCalendarProps) {
  const initial = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date()
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const todayISO = hojeISO()

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function changeMonth(delta: number) {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setViewMonth(m)
    setViewYear(y)
  }

  function irParaHoje() {
    const hoje = new Date()
    setViewYear(hoje.getFullYear())
    setViewMonth(hoje.getMonth())
    onSelectDate(todayISO)
  }

  const cellSize = compact ? 'aspect-square text-sm' : 'aspect-square text-base'

  return (
    <div className="border border-ink/10 rounded-lg bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => changeMonth(-1)} className="w-9 h-9 rounded-full hover:bg-ink/5 text-ink text-lg" aria-label="Mês anterior">‹</button>
        <div className="text-center">
          <p className="font-serif text-xl text-ink leading-tight">{MESES[viewMonth]}</p>
          <p className="text-ink/40 text-sm">{viewYear}</p>
        </div>
        <button onClick={() => changeMonth(1)} className="w-9 h-9 rounded-full hover:bg-ink/5 text-ink text-lg" aria-label="Próximo mês">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] tracking-wide text-ink/40 mb-2">
        {DIAS_SEMANA.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} />
          const iso = toISO(viewYear, viewMonth, day)
          const isSelected = iso === selectedDate
          const isToday = iso === todayISO
          const hasMark = markedDates?.has(iso)
          return (
            <button
              key={idx}
              onClick={() => onSelectDate(iso)}
              className={`relative ${cellSize} rounded-md flex items-center justify-center font-medium transition-colors
                ${isSelected ? 'bg-ink text-white shadow' : isToday ? 'bg-gold/15 text-ink ring-1 ring-gold/40' : 'text-ink hover:bg-ink/5'}`}
            >
              {day}
              {hasMark && (
                <span className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-gold-light' : 'bg-gold'}`} />
              )}
            </button>
          )
        })}
      </div>

      <button onClick={irParaHoje} className="mt-5 w-full text-center text-sm text-gold hover:text-gold-light font-medium py-1.5 border-t border-ink/10 pt-3">
        Ir para hoje
      </button>
    </div>
  )
}
