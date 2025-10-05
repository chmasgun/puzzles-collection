'use client'

import Link from 'next/link'
import { Brain, Puzzle, Target, Calculator, Grid3X3, User, LogOut, Grid2x2X } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'

export default function HomePage() {
  const { data: session, status } = useSession()

  const puzzleTypes = [
    // {
    //   id: 'wordle',
    //   name: 'Word Puzzles',
    //   description: 'Challenge your vocabulary with word-based brain teasers',
    //   icon: Brain,
    //   color: 'bg-blue-500',
    //   href: '/puzzles/wordle'
    // },
    // {
    //   id: 'sudoku',
    //   name: 'Sudoku',
    //   description: 'Classic number placement puzzles',
    //   icon: Grid3X3,
    //   color: 'bg-green-500',
    //   href: '/puzzles/sudoku'
    // },
    // {
    //   id: 'pattern',
    //   name: 'Pattern Matching',
    //   description: 'Identify patterns and sequences',
    //   icon: Target,
    //   color: 'bg-purple-500',
    //   href: '/puzzles/pattern'
    // },
    // {
    //   id: 'logic',
    //   name: 'Logic Puzzles',
    //   description: 'Test your reasoning and deduction skills',
    //   icon: Puzzle,
    //   color: 'bg-orange-500',
    //   href: '/puzzles/logic'
    // },
    // {
    //   id: 'math',
    //   name: 'Math Puzzles',
    //   description: 'Mathematical brain teasers and calculations',
    //   icon: Calculator,
    //   color: 'bg-red-500',
    //   href: '/puzzles/math'
    // },
    {
      id: 'maffdoku',
      name: 'Maffdoku',
      description: 'Maffdoku is a type of Sudoku puzzle that uses mathematical operations instead of numbers.',
      icon: Grid2x2X,
      color: 'bg-yellow-500',
      href: '/puzzles/maffdoku'
    },
    {
      id: 'brainteasers',
      name: 'Brain Teasers',
      description: 'Brain teasers are puzzles that test your logic, reasoning, and problem-solving skills.',
      icon: Brain,
      color: 'bg-green-500',
      href: '/puzzles/brainteasers'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-blue-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">
                Puzzle Collection
              </h1>
            </div>
            <nav className="flex items-center space-x-4">
              {status === 'loading' ? (
                <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
              ) : session ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || ''}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <User className="h-8 w-8 text-gray-600" />
                    )}
                    <span className="text-gray-700 text-sm font-medium">
                      {session.user.name}
                    </span>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <>
                  <Link 
                    href="/auth/signin" 
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/auth/signup" 
                    className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Challenge Your Mind
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore our collection of brain teaser puzzles designed to test your logic, 
            vocabulary, pattern recognition, and problem-solving skills.
          </p>
        </div>

        {/* Puzzle Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {puzzleTypes.map((puzzle) => {
            const IconComponent = puzzle.icon
            return (
              <Link
                key={puzzle.id}
                href={puzzle.href}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 group"
              >
                <div className="flex items-center mb-4">
                  <div className={`${puzzle.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <h3 className="ml-4 text-xl font-semibold text-gray-900">
                    {puzzle.name}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {puzzle.description}
                </p>
                <div className="mt-4 text-blue-600 text-sm font-medium group-hover:text-blue-700">
                  Start Playing →
                </div>
              </Link>
            )
          })}
        </div>

        {/* Features Section */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Track Progress
            </h3>
            <p className="text-gray-600 text-sm">
              Monitor your solving streaks and improvement over time
            </p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Multiple Difficulties
            </h3>
            <p className="text-gray-600 text-sm">
              From beginner to expert levels for all skill ranges
            </p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Puzzle className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Daily Challenges
            </h3>
            <p className="text-gray-600 text-sm">
              New puzzles added regularly to keep you engaged
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600 text-sm">
            <p>&copy; 2024 Puzzle Collection. Challenge your mind every day.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 