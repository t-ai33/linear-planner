import { db } from './db'

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Work', color: '#6366f1' },
  { id: 2, name: 'Meetings', color: '#f59e0b' },
  { id: 3, name: 'Personal', color: '#10b981' },
  { id: 4, name: 'Events', color: '#ef4444' },
  { id: 5, name: 'Social', color: '#8b5cf6' },
]

const CATEGORY_NAMES = { 1: 'Work', 2: 'Meetings', 3: 'Personal', 4: 'Events', 5: 'Social' }

export async function migrateCategories() {
  for (const [id, name] of Object.entries(CATEGORY_NAMES)) {
    await db.categories.update(Number(id), { name })
  }
}

const YEAR = 2026

const SEED_EVENTS = [
  {
    title: 'Q1 Strategy Review',
    startDateTime: `${YEAR}-01-12T09:00:00`,
    endDateTime: `${YEAR}-01-12T17:00:00`,
    isAllDay: false,
    categoryId: 1,
    notes: '',
  },
  {
    title: 'Tokyo — ALPAKA Asia',
    startDateTime: `${YEAR}-02-08T00:00:00`,
    endDateTime: `${YEAR}-02-14T23:59:59`,
    isAllDay: true,
    categoryId: 2,
    notes: 'Trade show + retail meetings',
  },
  {
    title: "Valentine's Dinner",
    startDateTime: `${YEAR}-02-14T19:00:00`,
    endDateTime: `${YEAR}-02-14T22:00:00`,
    isAllDay: false,
    categoryId: 5,
    notes: '',
  },
  {
    title: 'Melbourne Café Site Visit',
    startDateTime: `${YEAR}-03-05T10:00:00`,
    endDateTime: `${YEAR}-03-05T13:00:00`,
    isAllDay: false,
    categoryId: 1,
    notes: 'Docklands tenancy walkthrough',
  },
  {
    title: 'KL — Family',
    startDateTime: `${YEAR}-04-18T00:00:00`,
    endDateTime: `${YEAR}-04-26T23:59:59`,
    isAllDay: true,
    categoryId: 2,
    notes: '',
  },
  {
    title: 'Dentist',
    startDateTime: `${YEAR}-05-07T11:00:00`,
    endDateTime: `${YEAR}-05-07T12:00:00`,
    isAllDay: false,
    categoryId: 4,
    notes: '',
  },
  {
    title: 'ALPAKA Product Launch',
    startDateTime: `${YEAR}-06-15T00:00:00`,
    endDateTime: `${YEAR}-06-18T23:59:59`,
    isAllDay: true,
    categoryId: 1,
    notes: '',
  },
  {
    title: 'Annual Physical',
    startDateTime: `${YEAR}-07-03T09:00:00`,
    endDateTime: `${YEAR}-07-03T10:30:00`,
    isAllDay: false,
    categoryId: 4,
    notes: '',
  },
  {
    title: 'NYC — Content Week',
    startDateTime: `${YEAR}-08-10T00:00:00`,
    endDateTime: `${YEAR}-08-17T23:59:59`,
    isAllDay: true,
    categoryId: 2,
    notes: '',
  },
  {
    title: 'Café Permit Submission',
    startDateTime: `${YEAR}-09-01T00:00:00`,
    endDateTime: `${YEAR}-09-01T23:59:59`,
    isAllDay: true,
    categoryId: 1,
    notes: 'EPA works approval lodgement deadline',
  },
  {
    title: 'Half Marathon',
    startDateTime: `${YEAR}-10-11T07:00:00`,
    endDateTime: `${YEAR}-10-11T11:00:00`,
    isAllDay: false,
    categoryId: 4,
    notes: '',
  },
  {
    title: 'End of Year Team Dinner',
    startDateTime: `${YEAR}-12-04T18:30:00`,
    endDateTime: `${YEAR}-12-04T22:00:00`,
    isAllDay: false,
    categoryId: 5,
    notes: '',
  },
  {
    title: 'Holiday',
    startDateTime: `${YEAR}-12-20T00:00:00`,
    endDateTime: `${YEAR}-12-31T23:59:59`,
    isAllDay: true,
    categoryId: 2,
    notes: '',
  },
]

export async function seedIfEmpty() {
  const meta = await db.meta.get('seeded')
  if (meta) return

  await db.categories.bulkAdd(DEFAULT_CATEGORIES)
  await db.events.bulkAdd(SEED_EVENTS)
  await db.meta.put({ key: 'seeded', value: true })
}
