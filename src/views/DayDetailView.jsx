import { useMemo, useState, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { usePlannerData } from '../hooks/usePlannerData'
import { noteStore } from '../db/queries'
import { EventModal } from '../components/EventModal'

// Horizontal time axis — hours run left to right
const HOUR_WIDTH = 80
const NIGHT_WIDTH = 10
const EVENT_HEIGHT = 56
const AXIS_HEIGHT = 32
const LABEL_WIDTH = 0   // no left gutter — we pin the ruler via sticky
const TRACK_PADDING_V = 12
const SNAP_MINUTES = 15

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const COMPRESSED = new Set([0, 1, 2, 3, 4, 5, 23])

function hourWidth(h) { return COMPRESSED.has(h) ? NIGHT_WIDTH : HOUR_WIDTH }

function leftForHour(h) {
  let left = 0
  for (let i = 0; i < h; i++) left += hourWidth(i)
  return left
}

function totalWidth() {
  return HOURS.reduce((acc, h) => acc + hourWidth(h), 0)
}

function minuteToLeft(isoString) {
  const d = new Date(isoString)
  const h = d.getHours()
  const m = d.getMinutes()
  return leftForHour(h) + (m / 60) * hourWidth(h)
}

function leftToMinutes(x) {
  let remaining = Math.max(0, x)
  for (let h = 0; h < 24; h++) {
    const w = hourWidth(h)
    if (remaining <= w) {
      const raw = Math.round((remaining / w) * 60)
      return h * 60 + Math.min(Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES, 59)
    }
    remaining -= w
  }
  return 23 * 60 + 45
}

function minutesToTimeStr(totalMins) {
  const h = Math.floor(totalMins / 60) % 24
  const m = totalMins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function DayDetailView({ year, date, onBack }) {
  const { events, categoryMap } = usePlannerData(year)
  const [noteContent, setNoteContent] = useState('')
  const noteLoaded = useRef(false)
  const [modal, setModal] = useState(null) // null | { event } | { defaultStart, defaultEnd }
  const scrollRef = useRef(null)

  // drag state
  const drag = useRef({ active: false, startX: 0, startMin: 0 })
  const [dragRange, setDragRange] = useState(null) // { leftPx, widthPx, startMin, endMin }

  useLiveQuery(async () => {
    const n = await noteStore.get(date)
    if (!noteLoaded.current) {
      setNoteContent(n?.content ?? '')
      noteLoaded.current = true
    }
  }, [date])

  const dayEvents = useMemo(() => events.filter(e =>
    e.startDateTime.slice(0, 10) <= date && e.endDateTime.slice(0, 10) >= date
  ), [events, date])

  const timedEvents = dayEvents.filter(e => !e.isAllDay)
  const allDayEvents = dayEvents.filter(e => e.isAllDay)

  const saveNote = useCallback((val) => noteStore.put(date, val), [date])

  // Convert page X to track-relative X
  const pageXToTrackX = (pageX) => {
    const el = scrollRef.current
    if (!el) return 0
    return pageX - el.getBoundingClientRect().left + el.scrollLeft
  }

  const onTrackPointerDown = (e) => {
    if (e.target !== e.currentTarget && e.target.dataset.track !== '1') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const x = pageXToTrackX(e.clientX)
    const startMin = leftToMinutes(x)
    drag.current = { active: true, startX: x, startMin }
    setDragRange(null)
  }

  const onTrackPointerMove = (e) => {
    if (!drag.current.active) return
    const x = pageXToTrackX(e.clientX)
    const endMin = leftToMinutes(x)
    const lo = Math.min(drag.current.startMin, endMin)
    const hi = Math.max(drag.current.startMin, endMin)
    const loLeft = leftForHour(Math.floor(lo / 60)) + ((lo % 60) / 60) * hourWidth(Math.floor(lo / 60))
    const hiLeft = leftForHour(Math.floor(hi / 60)) + ((hi % 60) / 60) * hourWidth(Math.floor(hi / 60))
    setDragRange({ leftPx: loLeft, widthPx: Math.max(hiLeft - loLeft, 4), startMin: lo, endMin: hi })
  }

  const onTrackPointerUp = (e) => {
    if (!drag.current.active) return
    drag.current.active = false
    const x = pageXToTrackX(e.clientX)
    const endMin = leftToMinutes(x)
    const lo = Math.min(drag.current.startMin, endMin)
    let hi = Math.max(drag.current.startMin, endMin)
    if (hi - lo < SNAP_MINUTES) hi = lo + 60 // tap = 1hr default
    setDragRange(null)
    setModal({ defaultStart: minutesToTimeStr(lo), defaultEnd: minutesToTimeStr(hi) })
  }

  const tw = totalWidth()
  const today = format(new Date(), 'yyyy-MM-dd')
  const nowLeft = today === date ? minuteToLeft(new Date().toISOString().slice(0, 10) + 'T' + format(new Date(), 'HH:mm') + ':00') : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100svh', background: '#0a0a0a' }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid #1e1e1e', flexShrink: 0 }}>
        <button onClick={onBack} style={navBtnStyle}>← 3-day</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#e5e5e5', flex: 1 }}>
          {format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d')}
        </span>
        <button
          onClick={() => setModal({ defaultStart: '09:00', defaultEnd: '10:00' })}
          style={plusBtnStyle}
          title="New event"
        >+</button>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div style={{ padding: '6px 14px', display: 'flex', flexWrap: 'wrap', gap: 5, borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
          {allDayEvents.map(e => (
            <button
              key={e.id}
              onClick={() => setModal({ event: e })}
              style={{
                padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer',
                background: (categoryMap[e.categoryId]?.color ?? '#555') + 'cc',
                color: '#fff', fontSize: 12,
              }}
            >{e.title}</button>
          ))}
        </div>
      )}

      {/* Film-strip scroll container */}
      <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}>
        <div style={{ width: tw, minHeight: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>

          {/* Hour ruler */}
          <div style={{
            height: AXIS_HEIGHT, flexShrink: 0, position: 'relative',
            borderBottom: '1px solid #2a2a2a', background: '#0f0f0f',
          }}>
            {HOURS.map(h => {
              if (COMPRESSED.has(h) && h !== 6 && h !== 22) return null
              const label = String(h).padStart(2, '0')
              return (
                <div key={h} style={{
                  position: 'absolute',
                  left: leftForHour(h) + 4,
                  top: 0, height: '100%',
                  display: 'flex', alignItems: 'center',
                  fontSize: 11, color: '#888', whiteSpace: 'nowrap',
                }}>
                  {label}
                </div>
              )
            })}
          </div>

          {/* Track */}
          <div
            data-track="1"
            onPointerDown={onTrackPointerDown}
            onPointerMove={onTrackPointerMove}
            onPointerUp={onTrackPointerUp}
            style={{
              flex: 1, position: 'relative',
              paddingTop: TRACK_PADDING_V, paddingBottom: TRACK_PADDING_V,
              cursor: 'crosshair',
              minHeight: EVENT_HEIGHT + TRACK_PADDING_V * 2,
            }}
          >
            {/* Hour columns — alternating backgrounds for readability */}
            {HOURS.map(h => (
              <div key={h} style={{
                position: 'absolute',
                left: leftForHour(h), top: 0, bottom: 0,
                width: hourWidth(h),
                background: COMPRESSED.has(h) ? '#0c0c0c' : (h % 2 === 0 ? '#111' : '#0e0e0e'),
                borderRight: '1px solid #222',
              }} />
            ))}

            {/* Now line */}
            {nowLeft !== null && (
              <div style={{
                position: 'absolute', left: nowLeft, top: 0, bottom: 0,
                width: 2, background: '#ef4444', zIndex: 10,
                boxShadow: '0 0 6px #ef4444',
              }} />
            )}

            {/* Drag ghost */}
            {dragRange && (
              <div style={{
                position: 'absolute',
                left: dragRange.leftPx, top: TRACK_PADDING_V,
                width: dragRange.widthPx, height: EVENT_HEIGHT,
                background: '#6366f140', border: '1px dashed #6366f1',
                borderRadius: 4, pointerEvents: 'none', zIndex: 5,
              }} />
            )}

            {/* Timed events */}
            {timedEvents.map(event => {
              const left = minuteToLeft(event.startDateTime)
              const right = minuteToLeft(event.endDateTime)
              const width = Math.max(right - left, 24)
              const color = categoryMap[event.categoryId]?.color ?? '#555'
              return (
                <div
                  key={event.id}
                  onClick={e => { e.stopPropagation(); setModal({ event }) }}
                  style={{
                    position: 'absolute',
                    left, top: 0, bottom: 0, width,
                    background: color, opacity: 0.88,
                    borderRadius: 5, padding: '5px 7px',
                    overflow: 'hidden', zIndex: 3, cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{event.title}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                    {format(new Date(event.startDateTime), 'HH:mm')}–{format(new Date(event.endDateTime), 'HH:mm')}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Daily note */}
      <div style={{ borderTop: '1px solid #1e1e1e', padding: '10px 14px 14px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</div>
        <textarea
          value={noteContent}
          onChange={e => setNoteContent(e.target.value)}
          onBlur={e => saveNote(e.target.value)}
          placeholder="Add a note for this day…"
          style={{
            width: '100%', minHeight: 64,
            background: '#131313', border: '1px solid #222',
            borderRadius: 8, color: '#c5c5c5', fontSize: 13,
            padding: '8px 10px', resize: 'vertical', fontFamily: 'inherit',
            userSelect: 'text', outline: 'none',
          }}
        />
      </div>

      {/* Event modal */}
      {modal && (
        <EventModal
          event={modal.event ?? null}
          defaultDate={date}
          defaultStart={modal.defaultStart}
          defaultEnd={modal.defaultEnd}
          onClose={() => setModal(null)}
        />
      )}
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
