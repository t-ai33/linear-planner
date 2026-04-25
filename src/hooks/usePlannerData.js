import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { eventStore, categoryStore } from '../db/queries'

export function usePlannerData(year) {
  const events = useLiveQuery(() => {
    return db.events
      .where('startDateTime')
      .below(`${year + 1}-01-01`)
      .toArray()
      .then(evts => evts.filter(e => e.endDateTime >= `${year}-01-01`))
  }, [year]) ?? []

  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? []

  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]))

  const addEvent = useCallback((event) => eventStore.add(event), [])
  const updateEvent = useCallback((id, changes) => eventStore.update(id, changes), [])
  const deleteEvent = useCallback((id) => eventStore.delete(id), [])

  return { events, categories, categoryMap, addEvent, updateEvent, deleteEvent }
}
