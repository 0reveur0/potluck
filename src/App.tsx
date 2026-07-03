import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { ToastProvider } from './lib/toast'
import { supabase } from './lib/supabase'
import { useJoinedTables } from './lib/hooks'
import { AuthScreen } from './components/AuthScreen'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { EmptyTableState } from './components/EmptyTableState'
import { Spinner } from './lib/ui'

function Shell() {
  const { user, loading } = useAuth()
  const { tables, loading: tablesLoading, refresh } = useJoinedTables()
  const [activeId, setActiveId] = useState<number | null>(null)

  // Auto-select the most recently joined table on first load.
  useEffect(() => {
    if (!activeId && tables.length > 0) setActiveId(tables[0].id)
    if (activeId && !tables.find((t) => t.id === activeId)) setActiveId(tables[0]?.id ?? null)
  }, [tables, activeId])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) return <AuthScreen />

  const active = tables.find((t) => t.id === activeId) ?? null

  return (
    <div className="flex h-screen overflow-hidden bg-cream-50">
      <Sidebar
        tables={tables}
        activeId={activeId}
        onSelect={setActiveId}
        onJoined={refresh}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        {tables.length === 0 || !active ? (
          <EmptyTableState onJoined={refresh} />
        ) : (
          <Dashboard key={active.id} table={active} onTablesChanged={refresh} />
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AuthProvider>
  )
}
