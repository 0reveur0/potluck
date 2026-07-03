import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'

export function Modal({
  open,
  onClose,
  children,
  title,
  maxWidth = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-charcoal-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={`relative z-10 w-full ${maxWidth} max-h-[92vh] overflow-y-auto rounded-t-3xl bg-cream-50 shadow-warm sm:rounded-3xl`}
          >
            {title && (
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-cream-200 bg-cream-50/95 px-5 py-4 backdrop-blur">
                <h2 className="font-display text-xl font-semibold text-charcoal-900">{title}</h2>
                <button onClick={onClose} className="rounded-full p-1.5 text-charcoal-700/60 hover:bg-cream-200 hover:text-charcoal-900">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`h-5 w-5 animate-spin rounded-full border-2 border-cream-300 border-t-amber-500 ${className}`} />
  )
}

export function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-cream-100 text-amber-600">{icon}</div>
      <h3 className="font-display text-lg font-semibold text-charcoal-900">{title}</h3>
      {subtitle && <p className="max-w-xs text-sm text-charcoal-700/70">{subtitle}</p>}
    </div>
  )
}

export function CreditsPill({ amount, className = '' }: { amount: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-bold text-amber-700 ${className}`}>
      <span className="text-base leading-none">🪙</span>
      {amount}
    </span>
  )
}
