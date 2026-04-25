import { db } from './db'

export const categoryStore = {
  getAll: () => db.categories.toArray(),
  add: (cat) => db.categories.add(cat),
  update: (id, changes) => db.categories.update(id, changes),
  canDelete: async (id) => {
    const count = await db.events.where('categoryId').equals(id).count()
    return count === 0
  },
  delete: async (id) => {
    const safe = await categoryStore.canDelete(id)
    if (!safe) throw new Error('Reassign events before deleting this category.')
    return db.categories.delete(id)
  },
}

export const eventStore = {
  getAll: () => db.events.toArray(),
  getForYear: (year) =>
    db.events
      .where('startDateTime')
      .between(`${year}-01-01`, `${year + 1}-01-01`, true, false)
      .toArray(),
  add: (event) => db.events.add(event),
  update: (id, changes) => db.events.update(id, changes),
  delete: (id) => db.events.delete(id),
}

export const noteStore = {
  get: (date) => db.dailyNotes.get(date),
  put: (date, content) => db.dailyNotes.put({ date, content }),
}
