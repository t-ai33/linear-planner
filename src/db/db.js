import Dexie from 'dexie'

export const db = new Dexie('planner')

db.version(1).stores({
  events: '++id, startDateTime, endDateTime, categoryId, isAllDay',
  categories: '++id',
  dailyNotes: 'date',
  meta: 'key',
})
