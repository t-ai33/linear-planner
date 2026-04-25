import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'

export function useNoteDays() {
  const notes = useLiveQuery(() => db.dailyNotes.toArray(), []) ?? []
  return new Set(notes.filter(n => n.content?.trim()).map(n => n.date))
}
