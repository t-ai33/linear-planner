import { useMemo, useState, useRef, useCallback } from 'react'
import { format, addDays } from 'date-fns'
import { StickyNote } from 'lucide-react'
import { usePlannerData } from '../hooks/usePlannerData'
import { useNoteDays } from '../hooks/useNoteDays'
import { EventModal } from '../components/EventModal'

const HOUR_HEIGHT = 56
const NIGHT_HEIGHT = 8
const SNAP_MINUTES = 15

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const COMPRESSED_NIGHT = new Set([0, 1, 2, 3, 4, 5, 23])

function hourHeight(h) { return COMPRESSED_NIGHT.has(h) ? NIGHT_HEIGHT : HOUR_HEIGHT }

function topForHour(h) {
  let top = 0
  for (let i = 0; i < h; i++) top += hourHeight(i)
  return top
}

function totalHeight() { return HOURS.reduce((acc, h) => acc + hourHeight(h), 0) }

function minuteToTop(isoString) {
  const d = new Date(isoString)
  const h = d.getHours()
  const m = d.getMinutes()
  return topForHour(h) + (m / 60) * hourHeight(h)
}

function topToMinutes(y) {
  let remaining = Math.max(0, y)
  for (let h = 0; h < 24; h++) {
    const hh = hourHeight(h)
    if (remaining <= hh) {
      const raw = Math.round((remaining / hh) * 60)
      return h * 60 + Math.min(Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES, 59)
    }
    remaining -= hh
  }
  return 23 * 60 + 45
}

function minutesToTimeStr(totalMins) {
  const h = Math.floor(totalMins / 60) % 24
  const m = totalMins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function ThreeDayView({ year, focusDate, onDayClick, onBack }) {
  const { events, categoryMap } = usePlannerData(year)
  const noteDays = useNoteDays()
  const [modal, setModal] = useState(null)
  const containerRef = useRef(null)

  const days = useMemo(() => {
    const base = new Date(focusDate + 'T12:00:00')
    return [0, 1, 2].map(i => format(addDays(base, i), 'yyyy-MM-dd'))
  }, [focusDate])

  const eventsByDay = useMemo(() => {
    const map = {}
    for (const day of days) map[day] = []
    for (const event of events) {
      const s = event.startDateTime.slice(0, 10)
      const e = event.endDateTime.slice(0, 10)
      for (const day of days) {
        if (s <= day && e >= day) map[day].push(event)
      }
    }
    return map
  }, [events, days])

  const containerH = totalHeight()
  const today = format(new Date(), 'yyyy-MM-dd')

  const pageYToTrackY = (pageY) => {
    const el = containerRef.current
    if (!el) return 0
    return pageY - el.getBoundingClientRect().top + el.scrollTop
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100svh', background: '#0a0a0a' }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid #1e1e1e', flexShrink: 0 }}>
        <button onClick={onBack} style={navBtnStyle}>← Year</button>
        <span style={{ fontSize: 14, color: '#666', flex: 1 }}>
          {format(new Date(days[0] + 'T12:00:00'), 'MMM d')}–{format(new Date(days[2] + 'T12:00:00'), 'MMM d, yyyy')}
        </span>
        <button
          onClick={() => setModal({ defaultDate: focusDate, defaultStart: '09:00', defaultEnd: '10:00' })}
          style={plusBtnStyle}
          title="New event"
        >+</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'flex', paddingLeft: 40, flexShrink: 0, borderBottom: '1px solid #1a1a1a' }}>
        {days.map(day => (
          <div
            key={day}
            onClick={() => onDayClick(day)}
            style={{
              flex: 1, padding: '8px 0',
              cursor: 'pointer', fontSize: 12,
              color: day === today ? '#818cf8' : '#777',
              fontWeight: day === today ? 700 : 400,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            {format(new Date(day + 'T12:00:00'), 'EEE d')}
            {noteDays.has(day) && (
              <StickyNote size={9} color="#94a3b8" strokeWidth={1.5} />
            )}
          </div>
        ))}
      </div>

      {/* Scrollable time grid */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ display: 'flex', minHeight: containerH }}>
          {/* Hour labels */}
          <div style={{ width: 40, flexShrink: 0, position: 'relative', background: '#0f0f0f' }}>
            {HOURS.filter(h => !COMPRESSED_NIGHT.has(h)).map(h => (
              <div key={h} style={{
                position: 'absolute', top: topForHour(h) - 7,
                right: 6, fontSize: 10, color: '#777', lineHeight: 1, whiteSpace: 'nowrap',
              }}>
                {String(h).padStart(2, '0')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(day => (
            <DayColumn
              key={day}
              day={day}
              events={eventsByDay[day] ?? []}
              categoryMap={categoryMap}
              containerH={containerH}
              containerRef={containerRef}
              pageYToTrackY={pageYToTrackY}
              onEditEvent={(event) => setModal({ event })}
              onCreateEvent={(start, end) => setModal({ defaultDate: day, defaultStart: start, defaultEnd: end })}
            />
          ))}
        </div>
      </div>

      {modal && (
        <EventModal
          event={modal.event ?? null}
          defaultDate={modal.defaultDate ?? focusDate}
          defaultStart={modal.defaultStart}
          defaultEnd={modal.defaultEnd}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function DayColumn({ day, events, categoryMap, containerH, pageYToTrackY, onEditEvent, onCreateEvent }) {
  const drag = useRef({ active: false, startY: 0, startMin: 0 })
  const [dragRange, setDragRange] = useState(null)
  const today = format(new Date(), 'yyyy-MM-dd')
  const nowTop = today === day ? minuteToTop(new Date().toISOString().replace('T', 'T').slice(0, 16) + ':00') : null

  const onPointerDown = (e) => {
    if (e.target !== e.currentTarget) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const y = pageYToTrackY(e.clientY)
    const startMin = topToMinutes(y)
    drag.current = { active: true, startY: y, startMin }
    setDragRange(null)
  }

  const onPointerMove = (e) => {
    if (!drag.current.active) return
    const y = pageYToTrackY(e.clientY)
    const endMin = topToMinutes(y)
    const lo = Math.min(drag.current.startMin, endMin)
    const hi = Math.max(drag.current.startMin, endMin)
    setDragRange({ topPx: topForHour(Math.floor(lo / 60)) + ((lo % 60) / 60) * hourHeight(Math.floor(lo / 60)), startMin: lo, endMin: hi })
  }

  const onPointerUp = (e) => {
    if (!drag.current.active) return
    drag.current.active = false
    const y = pageYToTrackY(e.clientY)
    const endMin = topToMinutes(y)
    const lo = Math.min(drag.current.startMin, endMin)
    let hi = Math.max(drag.current.startMin, endMin)
    setDragRange(null)
    if (hi - lo < SNAP_MINUTES) hi = lo + 60
    onCreateEvent(minutesToTimeStr(lo), minutesToTimeStr(hi))
  }

  const loTopPx = dragRange ? topForHour(Math.floor(dragRange.startMin / 60)) + ((dragRange.startMin % 60) / 60) * hourHeight(Math.floor(dragRange.startMin / 60)) : 0
  const hiTopPx = dragRange ? topForHour(Math.floor(dragRange.endMin / 60)) + ((dragRange.endMin % 60) / 60) * hourHeight(Math.floor(dragRange.endMin / 60)) : 0

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        flex: 1, position: 'relative', borderLeft: '1px solid #1e1e1e',
        height: containerH, cursor: 'crosshair',
      }}
    >
      {/* Alternating hour bands */}
      {HOURS.map(h => (
        <div key={h} style={{
          position: 'absolute', left: 0, right: 0,
          top: topForHour(h), height: hourHeight(h),
          background: COMPRESSED_NIGHT.has(h) ? '#0c0c0c' : (h % 2 === 0 ? '#111' : '#0e0e0e'),
          borderTop: COMPRESSED_NIGHT.has(h) ? 'none' : '1px solid #1d1d1d',
        }} />
      ))}

      {/* Now line */}
      {nowTop !== null && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: nowTop,
          height: 2, background: '#ef4444', zIndex: 10,
          boxShadow: '0 0 5px #ef4444',
        }} />
      )}

      {/* Drag ghost */}
      {dragRange && (
        <div style={{
          position: 'absolute', left: 2, right: 2,
          top: loTopPx, height: Math.max(hiTopPx - loTopPx, 4),
          background: '#6366f130', border: '1px dashed #6366f1',
          borderRadius: 3, pointerEvents: 'none', zIndex: 5,
        }} />
      )}

      {/* Events */}
      {events.map(event => {
        if (event.isAllDay) {
          const color = categoryMap[event.categoryId]?.color ?? '#555'
          return (
            <div
              key={event.id}
              onClick={e => { e.stopPropagation(); onEditEvent(event) }}
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: containerH,
                background: color + '18',
                borderLeft: `3px solid ${color}`,
                zIndex: 2, cursor: 'pointer',
                display: 'flex', alignItems: 'flex-start', padding: '10px 6px',
              }}
            >
              <span style={{
                fontSize: 11, fontWeight: 600, color,
                writingMode: 'vertical-lr', transform: 'rotate(180deg)',
                lineHeight: 1, maxHeight: '80%', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{event.title}</span>
            </div>
          )
        }
        const top = minuteToTop(event.startDateTime)
        const height = Math.max(minuteToTop(event.endDateTime) - top, 16)
        const color = categoryMap[event.categoryId]?.color ?? '#555'
        return (
          <div
            key={event.id}
            onClick={e => { e.stopPropagation(); onEditEvent(event) }}
            style={{
              position: 'absolute', top, left: 2, right: 2, height,
              background: color, opacity: 0.88, borderRadius: 3,
              padding: '2px 4px', fontSize: 11, color: '#fff',
              overflow: 'hidden', zIndex: 3, cursor: 'pointer',
            }}
          >
            {event.title}
          </div>
        )
      })}
    </div>
  )
}

const navBtnStyle = { background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 13, padding: '4px 0' }
const plusBtnStyle = {
  width: 32, height: 32, borderRadius: 16, border: 'none',
  background: '#6366f1', color: '#fff', fontSize: 22, lineHeight: 1,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  paddingBottom: 2,
}
