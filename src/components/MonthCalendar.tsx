import { useState } from 'react'

interface MonthCalendarProps {
  selectedDate: string
  onSelectDate: (date: string) => void
  markedDates?: Set<string>
}

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
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

export default function MonthCalendar({ selectedDate, onSelectDate, markedDates }: MonthCalendarProps) {
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

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => changeMonth(-1)} className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors text-sm" aria-label="Mês anterior">‹</button>
        <p className="text-sm font-semibold text-slate-900">{MESES[viewMonth]} {viewYear}</p>
        <button onClick={() => changeMonth(1)} className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors text-sm" aria-label="Próximo mês">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 mb-2">
        {DIAS_SEMANA.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
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
              className={`relative aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-colors
                ${isSelected ? 'bg-ink text-white' : isToday ? 'bg-ink-50 text-ink font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              {day}
              {hasMark && (
                <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-gold'}`} />
              )}
            </button>
          )
        })}
      </div>

      <button onClick={irParaHoje} className="mt-4 w-full text-center text-xs font-semibold text-ink hover:text-ink-dark transition-colors py-2 border-t border-slate-100 pt-3">
        Ir para hoje
      </button>
    </div>
  )
}
