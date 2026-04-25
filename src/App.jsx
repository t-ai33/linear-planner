import { useState, useEffect } from 'react'
import { seedIfEmpty, migrateCategories } from './db/seed'
import { AnnualView } from './views/AnnualView'
import { ThreeDayView } from './views/ThreeDayView'
import { DayDetailView } from './views/DayDetailView'

export const YEAR = 2026

function App() {
  const [view, setView] = useState('annual') // 'annual' | 'three-day' | 'day'
  const [focusDate, setFocusDate] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    seedIfEmpty().then(migrateCategories).then(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100svh', color: '#555' }}>
        Loading...
      </div>
    )
  }

  const navigateTo = (targetView, date) => {
    setFocusDate(date)
    setView(targetView)
  }

  return (
    <div style={{ width: '100%', minHeight: '100svh', background: '#0a0a0a' }}>
      {view === 'annual' && (
        <AnnualView
          year={YEAR}
          onDayClick={(date) => navigateTo('three-day', date)}
        />
      )}
      {view === 'three-day' && (
        <ThreeDayView
          year={YEAR}
          focusDate={focusDate}
          onDayClick={(date) => navigateTo('day', date)}
          onBack={() => setView('annual')}
        />
      )}
      {view === 'day' && (
        <DayDetailView
          year={YEAR}
          date={focusDate}
          onBack={() => navigateTo('three-day', focusDate)}
        />
      )}
    </div>
  )
}

export default App
