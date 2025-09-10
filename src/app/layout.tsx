import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Puzzle Collection - Brain Teasers & Logic Games',
  description: 'Challenge your mind with our collection of brain teaser puzzles including Wordle variants, Sudoku, pattern matching, and more!',
  keywords: ['puzzles', 'brain teasers', 'wordle', 'sudoku', 'logic games', 'pattern matching'],
  authors: [{ name: 'Puzzle Collection' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
} 