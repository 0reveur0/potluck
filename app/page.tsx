'use client'
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from '@/src/lib/auth'
import { ToastProvider } from '@/src/lib/toast'
import { useJoinedTables } from '@/src/lib/hooks'
import { AuthScreen } from '@/src/components/AuthScreen'
import { Sidebar } from '@/src/components/Sidebar'
import { Dashboard } from '@/src/components/Dashboard'
import { EmptyTableState } from '@/src/components/EmptyTableState'
import { Spinner } from '@/src/lib/ui'
import type { TableWithMember } from '@/src/lib/types'

function Shell() {
  const { user, loading } = useAuth()
  const { tables, loading: tablesLoading, refresh } = useJoinedTables()
  const [activeId, setActiveId] = useState<number | null>(null)

  useEffect(() => {
    if (!activeId && tables.length > 0) setActiveId(tables[0].id)
    if (activeId && !tables.find((t: TableWithMember) => t.id === activeId)) {
      setActiveId(tables[0]?.id ?? null)
    }
  }, [tables, activeId])

  if (loading || (user && tablesLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#141209' }}>
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) return <AuthScreen />

  const active = tables.find((t: TableWithMember) => t.id === activeId) ?? null

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#141209' }}>
      <Sidebar
        tables={tables}
        activeId={activeId}
        onSelect={setActiveId}
        onJoined={refresh}
      />
      <main className="flex flex-1 flex-col overflow-hidden pt-12 md:pt-0">
        {tables.length === 0 || !active
          ? <EmptyTableState onJoined={refresh} />
          : <Dashboard key={active.id} table={active} onTablesChanged={refresh} />
        }
      </main>
    </div>
  )
}

export default function HomePage() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AuthProvider>
  )
}
