import { useMemo, useState } from 'react'
import { format, getDaysInMonth } from 'date-fns'
import { StickyNote } from 'lucide-react'
import { usePlannerData } from '../hooks/usePlannerData'
import { useNoteDays } from '../hooks/useNoteDays'
import { EventModal } from '../components/EventModal'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getDaysInMonthArray(year, month) {
  const count = getDaysInMonth(new Date(year, month, 1))
  return Array.from({ length: count }, (_, i) => i + 1)
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function AnnualView({ year, onDayClick }) {
  const { events, categoryMap } = usePlannerData(year)
  const noteDays = useNoteDays()
  const [modal, setModal] = useState(null)

  const { bandsByDay, dotsByDay } = useMemo(() => {
    const bands = {}   // dayKey → [{ event, color, startKey, endKey }]
    const dots = {}    // dayKey → [color, ...]  (timed single-day events)

    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`

    for (const event of events) {
      const startKey = event.startDateTime.slice(0, 10)
      const endKey = event.endDateTime.slice(0, 10)
      const color = categoryMap[event.categoryId]?.color ?? '#555'
      const isMultiDay = startKey !== endKey

      if (event.isAllDay || isMultiDay) {
        // Show as a colored band across every day it spans
        const effectiveStart = startKey < yearStart ? yearStart : startKey
        const effectiveEnd = endKey > yearEnd ? yearEnd : endKey
        let cursor = effectiveStart
        while (cursor <= effectiveEnd) {
          if (!bands[cursor]) bands[cursor] = []
          bands[cursor].push({ event, color, startKey: effectiveStart, endKey: effectiveEnd })
          const d = new Date(cursor + 'T12:00:00')
          d.setDate(d.getDate() + 1)
          cursor = d.toISOString().slice(0, 10)
        }
      } else {
        // Timed single-day event — just a dot on that day
        if (startKey >= yearStart && startKey <= yearEnd) {
          if (!dots[startKey]) dots[startKey] = []
          dots[startKey].push(color)
        }
      }
    }

    return { bandsByDay: bands, dotsByDay: dots }
  }, [events, categoryMap, year])

  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div style={{ padding: '12px 8px', minHeight: '100svh' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        paddingBottom: 12, borderBottom: '1px solid #222', marginBottom: 8,
      }}>
        <span style={{ fontSize: 22, fontWeight: 600, color: '#e5e5e5', letterSpacing: -0.5 }}>{year}</span>
        <span style={{ fontSize: 13, color: '#555', flex: 1 }}>Annual Planner</span>
        <button
          onClick={() => setModal({ defaultDate: format(new Date(), 'yyyy-MM-dd') })}
          style={plusBtnStyle}
          title="New event"
        >+</button>
      </div>

      {/* Month rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {MONTH_NAMES.map((monthName, monthIdx) => (
          <MonthRow
            key={monthIdx}
            year={year}
            monthIdx={monthIdx}
            monthName={monthName}
            bandsByDay={bandsByDay}
            dotsByDay={dotsByDay}
            noteDays={noteDays}
            today={today}
            onDayClick={onDayClick}
          />
        ))}
      </div>

      {modal && (
        <EventModal
          event={null}
          defaultDate={modal.defaultDate}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function MonthRow({ year, monthIdx, monthName, bandsByDay, dotsByDay, noteDays, today, onDayClick }) {
  const days = getDaysInMonthArray(year, monthIdx)

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      borderBottom: '1px solid #1a1a1a', minHeight: 56,
    }}>
      <div style={{
        width: 36, flexShrink: 0,
        display: 'flex', alignItems: 'flex-start', paddingTop: 6,
        fontSize: 11, fontWeight: 600, color: '#444',
        letterSpacing: 0.5, textTransform: 'uppercase',
      }}>
        {monthName}
      </div>

      <div style={{ display: 'flex', flex: 1, overflowX: 'auto' }}>
        {days.map(day => {
          const key = dateKey(year, monthIdx, day)
          const bands = bandsByDay[key] ?? []
          const dots = dotsByDay[key] ?? []
          const hasNote = noteDays.has(key)
          const isToday = key === today
          const isWeekend = [0, 6].includes(new Date(key + 'T12:00:00').getDay())

          return (
            <DayCell
              key={day}
              day={day}
              dayKey={key}
              bands={bands}
              dots={dots}
              hasNote={hasNote}
              isToday={isToday}
              isWeekend={isWeekend}
              onClick={() => onDayClick(key)}
            />
          )
        })}
      </div>
    </div>
  )
}

function DayCell({ day, dayKey, bands, dots, hasNote, isToday, isWeekend, onClick }) {
  // Deduplicate bands by event id
  const uniqueBands = []
  const seen = new Set()
  for (const b of bands) {
    if (!seen.has(b.event.id)) { seen.add(b.event.id); uniqueBands.push(b) }
  }

  return (
    <div
      onClick={onClick}
      style={{
        width: 32, minWidth: 32, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 4, paddingBottom: 4, gap: 2,
        background: isToday ? '#16162a' : 'transparent',
        borderRadius: isToday ? 4 : 0,
      }}
    >
      {/* Day number + optional note icon inline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, lineHeight: 1 }}>
        <span style={{
          fontSize: 11,
          fontWeight: isToday ? 700 : 400,
          color: isToday ? '#818cf8' : isWeekend ? '#444' : '#555',
        }}>
          {day}
        </span>
        {hasNote && (
          <StickyNote size={7} color="#94a3b8" strokeWidth={1.5} style={{ flexShrink: 0 }} />
        )}
      </div>

      {/* Multi-day / all-day event bands */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', paddingInline: 2 }}>
        {uniqueBands.slice(0, 3).map(b => (
          <EventBand key={b.event.id} color={b.color} title={b.event.title} day={dayKey} start={b.startKey} end={b.endKey} />
        ))}
        {uniqueBands.length > 3 && (
          <div style={{ height: 3, borderRadius: 1, background: '#2a2a2a' }} />
        )}
      </div>

      {/* Timed event dots */}
      {dots.length > 0 && (
        <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 1 }}>
          {dots.slice(0, 3).map((color, i) => (
            <div key={i} style={{
              width: 3, height: 3, borderRadius: '50%',
              background: color, opacity: 0.7, flexShrink: 0,
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventBand({ color, title, day, start, end }) {
  const isStartDay = day === start
  const isEndDay = day === end
  return (
    <div
      title={title}
      style={{
        height: 4, background: color, opacity: 0.85,
        borderRadius: `${isStartDay ? 2 : 0}px ${isEndDay ? 2 : 0}px ${isEndDay ? 2 : 0}px ${isStartDay ? 2 : 0}px`,
      }}
    />
  )
}

const plusBtnStyle = {
  width: 30, height: 30, borderRadius: 15, border: 'none',
  background: '#6366f1', color: '#fff', fontSize: 20, lineHeight: 1,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  paddingBottom: 2,
}
