import { useState, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { X, Download, Upload, Plus, Trash2, Check } from 'lucide-react'
import { db } from '../db/db'
import { categoryStore } from '../db/queries'

const PALETTE = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#10b981', '#14b8a6', '#06b6d4', '#64748b',
]

async function exportData() {
  const [events, categories, dailyNotes] = await Promise.all([
    db.events.toArray(),
    db.categories.toArray(),
    db.dailyNotes.toArray(),
  ])
  const payload = { version: 1, exportedAt: new Date().toISOString(), events, categories, dailyNotes }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `planner-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function doImport(file) {
  const text = await file.text()
  const data = JSON.parse(text)
  if (!Array.isArray(data.events) || !Array.isArray(data.categories)) {
    throw new Error('Invalid backup file.')
  }
  await db.transaction('rw', db.events, db.categories, db.dailyNotes, db.meta, async () => {
    await Promise.all([db.events.clear(), db.categories.clear(), db.dailyNotes.clear()])
    await db.categories.bulkPut(data.categories)
    await db.events.bulkPut(data.events)
    if (Array.isArray(data.dailyNotes)) await db.dailyNotes.bulkPut(data.dailyNotes)
    await db.meta.put({ key: 'seeded', value: true })
  })
}

export function SettingsModal({ onClose }) {
  const categories = useLiveQuery(() => db.categories.orderBy('id').toArray(), [])
  const [editState, setEditState] = useState({})
  const [newCat, setNewCat] = useState(null)
  const [error, setError] = useState(null)
  const [importMsg, setImportMsg] = useState(null)
  const fileRef = useRef()

  function startEdit(cat) {
    setEditState(prev => ({ ...prev, [cat.id]: { name: cat.name, color: cat.color } }))
  }

  function cancelEdit(id) {
    setEditState(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  async function saveEdit(cat) {
    const e = editState[cat.id]
    if (!e?.name?.trim()) return
    await categoryStore.update(cat.id, { name: e.name.trim(), color: e.color })
    cancelEdit(cat.id)
  }

  async function handleDelete(cat) {
    setError(null)
    try {
      await categoryStore.delete(cat.id)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddCat() {
    if (!newCat?.name?.trim()) return
    await categoryStore.add({ name: newCat.name.trim(), color: newCat.color })
    setNewCat(null)
  }

  async function handleImportFile(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!window.confirm('This will replace all current data. Continue?')) {
      e.target.value = ''
      return
    }
    setError(null)
    setImportMsg('Importing…')
    try {
      await doImport(file)
      setImportMsg('Imported!')
      setTimeout(() => setImportMsg(null), 2500)
    } catch (err) {
      setError('Import failed: ' + err.message)
      setImportMsg(null)
    }
    e.target.value = ''
  }

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#e5e5e5', flex: 1 }}>Settings</span>
          <button onClick={onClose} style={iconBtnStyle}><X size={16} /></button>
        </div>

        {/* Backup */}
        <div style={sectionStyle}>
          <div style={sectionLabelStyle}>Backup</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ActionBtn icon={<Download size={13} />} label="Export JSON" onClick={exportData} />
            <ActionBtn
              icon={<Upload size={13} />}
              label={importMsg ?? 'Import JSON'}
              onClick={() => fileRef.current.click()}
            />
            <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
          </div>
          <p style={{ marginTop: 8, fontSize: 11, color: '#555', lineHeight: 1.5 }}>
            Export saves all events, categories, and notes. Import replaces all current data.
          </p>
        </div>

        {/* Categories */}
        <div style={sectionStyle}>
          <div style={sectionLabelStyle}>Categories</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {(categories ?? []).map(cat => {
              const e = editState[cat.id]
              if (e) {
                return (
                  <div key={cat.id} style={{ padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, background: e.color, flexShrink: 0 }} />
                      <input
                        value={e.name}
                        onChange={ev => setEditState(prev => ({ ...prev, [cat.id]: { ...prev[cat.id], name: ev.target.value } }))}
                        onKeyDown={ev => { if (ev.key === 'Enter') saveEdit(cat); if (ev.key === 'Escape') cancelEdit(cat.id) }}
                        style={inputStyle}
                        autoFocus
                      />
                      <button onClick={() => saveEdit(cat)} style={iconBtnStyle} title="Save"><Check size={14} color="#10b981" /></button>
                      <button onClick={() => cancelEdit(cat.id)} style={iconBtnStyle} title="Cancel"><X size={13} color="#555" /></button>
                    </div>
                    <ColorSwatches value={e.color} onChange={color => setEditState(prev => ({ ...prev, [cat.id]: { ...prev[cat.id], color } }))} />
                  </div>
                )
              }
              return (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: cat.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: '#ccc' }}>{cat.name}</span>
                  <button onClick={() => startEdit(cat)} style={iconBtnStyle} title="Rename / recolor" aria-label="Edit">✎</button>
                  <button onClick={() => handleDelete(cat)} style={iconBtnStyle} title="Delete" aria-label="Delete"><Trash2 size={13} color="#555" /></button>
                </div>
              )
            })}

            {newCat ? (
              <div style={{ padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: newCat.color, flexShrink: 0 }} />
                  <input
                    placeholder="Category name"
                    value={newCat.name}
                    onChange={e => setNewCat(prev => ({ ...prev, name: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCat(); if (e.key === 'Escape') setNewCat(null) }}
                    style={inputStyle}
                    autoFocus
                  />
                  <button onClick={handleAddCat} style={iconBtnStyle} title="Add"><Check size={14} color="#10b981" /></button>
                  <button onClick={() => setNewCat(null)} style={iconBtnStyle} title="Cancel"><X size={13} color="#555" /></button>
                </div>
                <ColorSwatches value={newCat.color} onChange={color => setNewCat(prev => ({ ...prev, color }))} />
              </div>
            ) : (
              <button
                onClick={() => setNewCat({ name: '', color: '#6366f1' })}
                style={addCatBtnStyle}
              >
                <Plus size={13} /> Add category
              </button>
            )}
          </div>
          {error && <p style={{ marginTop: 8, fontSize: 11, color: '#ef4444' }}>{error}</p>}
        </div>
      </div>
    </div>
  )
}

function ColorSwatches({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 22, paddingBottom: 4 }}>
      {PALETTE.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          style={{
            width: 24, height: 24, borderRadius: 4, background: c,
            border: 'none', cursor: 'pointer',
            outline: c === value ? '2px solid #fff' : '2px solid transparent',
            outlineOffset: 1,
          }}
        />
      ))}
    </div>
  )
}

function ActionBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 12px', borderRadius: 6, border: '1px solid #2a2a2a',
      background: '#1a1a1a', color: '#ccc', fontSize: 12, cursor: 'pointer',
    }}>
      {icon}{label}
    </button>
  )
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
}

const panelStyle = {
  width: '100%', maxWidth: 460, background: '#111',
  borderRadius: '12px 12px 0 0', padding: '20px 20px 40px',
  maxHeight: '82svh', overflowY: 'auto',
}

const iconBtnStyle = {
  background: 'none', border: 'none', color: '#666', cursor: 'pointer',
  padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 32, minHeight: 32, fontSize: 15,
}

const inputStyle = {
  flex: 1, background: '#1a1a1a', border: '1px solid #333',
  borderRadius: 4, padding: '5px 8px', color: '#e5e5e5', fontSize: 13, outline: 'none',
}

const sectionStyle = { marginBottom: 24 }

const sectionLabelStyle = {
  fontSize: 10, fontWeight: 700, color: '#555',
  letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
}

const addCatBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'none', border: '1px dashed #2a2a2a', borderRadius: 6,
  color: '#555', fontSize: 12, padding: '8px 10px', cursor: 'pointer',
  width: '100%', marginTop: 8,
}
