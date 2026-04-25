import { useState, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { eventStore } from '../db/queries'

export function EventModal({ event, defaultDate, defaultStart, defaultEnd, defaultAllDay, onClose }) {
  const isNew = !event
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? []

  const [title, setTitle] = useState(event?.title ?? '')
  const [isAllDay, setIsAllDay] = useState(event?.isAllDay ?? defaultAllDay ?? false)
  const [startDate, setStartDate] = useState(event?.startDateTime.slice(0, 10) ?? defaultDate ?? '')
  const [startTime, setStartTime] = useState(event?.startDateTime.slice(11, 16) ?? defaultStart ?? '09:00')
  const [endDate, setEndDate] = useState(event?.endDateTime.slice(0, 10) ?? defaultDate ?? '')
  const [endTime, setEndTime] = useState(event?.endDateTime.slice(11, 16) ?? defaultEnd ?? '10:00')
  const [categoryId, setCategoryId] = useState(event?.categoryId ?? null)
  const [notes, setNotes] = useState(event?.notes ?? '')

  // Default category to first available
  useEffect(() => {
    if (categoryId === null && categories.length > 0) {
      setCategoryId(categories[0].id)
    }
  }, [categories, categoryId])

  const titleRef = useRef(null)
  useEffect(() => { titleRef.current?.focus() }, [])

  const save = async () => {
    if (!title.trim()) { titleRef.current?.focus(); return }
    const startISO = isAllDay ? `${startDate}T00:00:00` : `${startDate}T${startTime}:00`
    const endISO = isAllDay ? `${endDate}T23:59:59` : `${endDate}T${endTime}:00`
    if (isNew) {
      await eventStore.add({ title: title.trim(), startDateTime: startISO, endDateTime: endISO, isAllDay, categoryId, notes })
    } else {
      await eventStore.update(event.id, { title: title.trim(), startDateTime: startISO, endDateTime: endISO, isAllDay, categoryId, notes })
    }
    onClose()
  }

  const del = async () => {
    await eventStore.delete(event.id)
    onClose()
  }

  const backdropClick = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div
      onClick={backdropClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'flex-end',
        background: 'rgba(0,0,0,0.75)',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 600, margin: '0 auto',
        background: '#181818', borderRadius: '18px 18px 0 0',
        padding: '20px 20px 40px', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#333', margin: '0 auto 16px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#e5e5e5' }}>
            {isNew ? 'New Event' : 'Edit Event'}
          </span>
          <button onClick={onClose} style={ghostBtn}>✕</button>
        </div>

        {/* Title */}
        <input
          ref={titleRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save() }}
          placeholder="Event title"
          style={{ ...inputStyle, fontSize: 16, fontWeight: 500, marginBottom: 14 }}
        />

        {/* All-day toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer', userSelect: 'none' }}>
          <div
            onClick={() => setIsAllDay(v => !v)}
            style={{
              width: 40, height: 22, borderRadius: 11, position: 'relative',
              background: isAllDay ? '#6366f1' : '#333', transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: isAllDay ? 21 : 3,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s',
            }} />
          </div>
          <span style={{ fontSize: 13, color: '#aaa' }}>All day</span>
        </label>

        {/* Date / time rows */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <div style={labelStyle}>Start date</div>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>End date</div>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
          {!isAllDay && <>
            <div>
              <div style={labelStyle}>Start time</div>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>End time</div>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} />
            </div>
          </>}
        </div>

        {/* Category pills */}
        <div style={{ marginBottom: 18 }}>
          <div style={labelStyle}>Category</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {categories.map(cat => {
              const active = categoryId === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                    border: `2px solid ${active ? cat.color : 'transparent'}`,
                    background: active ? cat.color + '25' : '#252525',
                    color: active ? cat.color : '#777',
                    fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                  {cat.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} style={primaryBtn}>Save</button>
          {!isNew && (
            <button onClick={del} style={deleteBtn}>Delete</button>
          )}
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', background: '#242424', border: '1px solid #2e2e2e',
  borderRadius: 8, color: '#e5e5e5', fontSize: 13, padding: '9px 12px',
  fontFamily: 'inherit', outline: 'none', userSelect: 'text',
}
const labelStyle = { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }
const ghostBtn = { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 16, padding: 4 }
const primaryBtn = {
  flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
  background: '#6366f1', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
const deleteBtn = {
  padding: '11px 18px', borderRadius: 10, border: '1px solid #3a1a1a',
  background: '#1a0a0a', color: '#ef4444', fontSize: 14, cursor: 'pointer',
}
