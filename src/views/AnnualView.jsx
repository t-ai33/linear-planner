import { useMemo, useState } from 'react'
import { format, getDaysInMonth } from 'date-fns'
import { StickyNote, Settings } from 'lucide-react'
import { usePlannerData } from '../hooks/usePlannerData'
import { useNoteDays } from '../hooks/useNoteDays'
import { EventModal } from '../components/EventModal'
import { SettingsModal } from '../components/SettingsModal'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DOW_LABELS = ['S','M','T','W','T','F','S']
const MONTH_LABEL_WIDTH = 36
const DAY_CELL_WIDTH = 32

// Returns array of week rows, each a 7-element array (null = blank cell)
function getWeekRows(year, monthIdx) {
  const count = getDaysInMonth(new Date(year, monthIdx, 1))
  const firstDow = new Date(year, monthIdx, 1).getDay() // 0 = Sunday
  const rows = []
  let row = Array(firstDow).fill(null)
  for (let d = 1; d <= count; d++) {
    row.push(d)
    if (row.length === 7) { rows.push(row); row = [] }
  }
  if (row.length > 0) {
    while (row.length < 7) row.push(null)
    rows.push(row)
  }
  return rows
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function AnnualView({ year, onDayClick }) {
  const { events, categoryMap } = usePlannerData(year)
  const noteDays = useNoteDays()
  const [modal, setModal] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { bandsByDay, dotsByDay } = useMemo(() => {
    const bands = {}
    const dots = {}
    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`

    for (const event of events) {
      const startKey = event.startDateTime.slice(0, 10)
      const endKey = event.endDateTime.slice(0, 10)
      const color = categoryMap[event.categoryId]?.color ?? '#555'
      const isMultiDay = startKey !== endKey

      if (event.isAllDay || isMultiDay) {
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
          onClick={() => setSettingsOpen(true)}
          style={gearBtnStyle}
          title="Settings"
          aria-label="Settings"
        ><Settings size={15} color="#555" /></button>
        <button
          onClick={() => setModal({ defaultDate: format(new Date(), 'yyyy-MM-dd') })}
          style={plusBtnStyle}
          title="New event"
        >+</button>
      </div>

      {/* Day-of-week header */}
      <DayOfWeekHeader />

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

      {/* Day-of-week footer */}
      <DayOfWeekHeader bottom />

      {modal && (
        <EventModal
          event={null}
          defaultDate={modal.defaultDate}
          onClose={() => setModal(null)}
        />
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

function DayOfWeekHeader({ bottom }) {
  return (
    <div style={{
      display: 'flex',
      paddingLeft: MONTH_LABEL_WIDTH,
      borderTop: bottom ? '1px solid #1a1a1a' : 'none',
      borderBottom: bottom ? 'none' : '1px solid #1a1a1a',
    }}>
      {DOW_LABELS.map((label, i) => (
        <div key={i} style={{
          width: DAY_CELL_WIDTH,
          minWidth: DAY_CELL_WIDTH,
          textAlign: 'center',
          padding: '5px 0',
          fontSize: 10,
          fontWeight: 600,
          color: (i === 0 || i === 6) ? '#383838' : '#4a4a4a',
          letterSpacing: 0.5,
        }}>
          {label}
        </div>
      ))}
    </div>
  )
}

function MonthRow({ year, monthIdx, monthName, bandsByDay, dotsByDay, noteDays, today, onDayClick }) {
  const weekRows = getWeekRows(year, monthIdx)

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      borderBottom: '1px solid #1a1a1a',
    }}>
      {/* Month label */}
      <div style={{
        width: MONTH_LABEL_WIDTH,
        flexShrink: 0,
        paddingTop: 7,
        fontSize: 11, fontWeight: 600, color: '#444',
        letterSpacing: 0.5, textTransform: 'uppercase',
      }}>
        {monthName}
      </div>

      {/* Week rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {weekRows.map((week, weekIdx) => (
          <div key={weekIdx} style={{ display: 'flex', alignItems: 'stretch' }}>
            {week.map((day, colIdx) => {
              if (day === null) {
                return <div key={colIdx} style={{ width: DAY_CELL_WIDTH, minWidth: DAY_CELL_WIDTH }} />
              }
              const key = dateKey(year, monthIdx, day)
              const bands = bandsByDay[key] ?? []
              const dots = dotsByDay[key] ?? []
              const hasNote = noteDays.has(key)
              const isToday = key === today
              const isWeekend = colIdx === 0 || colIdx === 6

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
        ))}
      </div>
    </div>
  )
}

function DayCell({ day, dayKey, bands, dots, hasNote, isToday, isWeekend, onClick }) {
  const uniqueBands = []
  const seen = new Set()
  for (const b of bands) {
    if (!seen.has(b.event.id)) { seen.add(b.event.id); uniqueBands.push(b) }
  }

  return (
    <div
      onClick={onClick}
      style={{
        width: DAY_CELL_WIDTH, minWidth: DAY_CELL_WIDTH, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 4, paddingBottom: 4, gap: 2,
        background: isToday ? '#16162a' : 'transparent',
        borderRadius: isToday ? 4 : 0,
      }}
    >
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', paddingInline: 2 }}>
        {uniqueBands.slice(0, 3).map(b => (
          <EventBand key={b.event.id} color={b.color} title={b.event.title} day={dayKey} start={b.startKey} end={b.endKey} />
        ))}
        {uniqueBands.length > 3 && (
          <div style={{ height: 3, borderRadius: 1, background: '#2a2a2a' }} />
        )}
      </div>

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

const gearBtnStyle = {
  width: 30, height: 30, borderRadius: 15, border: 'none',
  background: 'transparent', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const plusBtnStyle = {
  width: 30, height: 30, borderRadius: 15, border: 'none',
  background: '#6366f1', color: '#fff', fontSize: 20, lineHeight: 1,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  paddingBottom: 2,
}
