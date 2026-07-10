import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Potluck — Knowledge Sharing',
  description: 'A private, credit-based peer-to-peer tutoring and knowledge-sharing platform.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-charcoal-950 text-cream-50 antialiased">
        {children}
      </body>
    </html>
  )
}
