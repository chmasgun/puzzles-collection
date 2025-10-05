'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Brain, Clock, Trophy, Filter, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { DifficultyLevel, IPuzzle, IUserProgress } from '@/types'

interface PuzzleWithProgress extends IPuzzle {
  userProgress?: IUserProgress | null
}

export default function BrainteasersPage() {
  const { data: session } = useSession()
  const [puzzles, setPuzzles] = useState<PuzzleWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | ''>('')
  const [activeTab, setActiveTab] = useState<'all' | 'easy' | 'medium' | 'hard' | 'expert'>('all')



const difficulties: { value: DifficultyLevel | ''; label: string; color: string }[] = [
  { value: '', label: 'All Levels', color: 'bg-gray-100' },
  { value: DifficultyLevel.EASY, label: 'Easy', color: 'bg-green-100 text-green-800' },
  { value: DifficultyLevel.MEDIUM, label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: DifficultyLevel.HARD, label: 'Hard', color: 'bg-orange-100 text-orange-800' },
  { value: DifficultyLevel.EXPERT, label: 'Expert', color: 'bg-red-100 text-red-800' }
]

const fetchPuzzles = async (page: number = 1, difficulty: DifficultyLevel | '' = '') => {
  setLoading(true)
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '12'
    })

    if (difficulty) {
      params.append('difficulty', difficulty)
    }

    const response = await fetch(`/api/puzzles/brainteasers?${params}`)
    const data = await response.json()

    if (data.success) {
      setPuzzles(data.data.puzzles)
      setTotalPages(data.data.pagination.pages)
    } else {
      setError(data.error || 'Failed to load puzzles')
    }
  } catch (err) {
    setError('Failed to load puzzles')
  } finally {
    setLoading(false)
  }
}

useEffect(() => {
  fetchPuzzles(currentPage, selectedDifficulty)
}, [currentPage, selectedDifficulty])

const handleDifficultyChange = (difficulty: DifficultyLevel | '') => {
  setSelectedDifficulty(difficulty)
  setCurrentPage(1)
}

const getStatusBadge = (puzzle: PuzzleWithProgress) => {
  const progress = puzzle.userProgress
  if (!progress) return null

  switch (progress.status) {
    case 'completed':
      return (
        <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
          <Trophy className="h-3 w-3" />
          <span>Completed</span>
        </div>
      )
    case 'in_progress':
      return (
        <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
          <Clock className="h-3 w-3" />
          <span>In Progress</span>
        </div>
      )
    default:
      return null
  }
}   

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const formatScore = (score: number) => {
  return score.toLocaleString()
}

const getDifficultyColor = (difficulty: DifficultyLevel) => {
  switch (difficulty) {
    case DifficultyLevel.EASY:
      return 'bg-green-100 text-green-800'
    case DifficultyLevel.MEDIUM:
      return 'bg-yellow-100 text-yellow-800'
    case DifficultyLevel.HARD:
      return 'bg-orange-100 text-orange-800'
    case DifficultyLevel.EXPERT:
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100'
  }
}

return (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    {/* Header */}
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              <ChevronLeft className="h-6 w-6" />
            </Link>
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Brain Teasers</h1>
                <p className="text-sm text-gray-600">Logic and reasoning puzzles</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <select
              value={selectedDifficulty}
              onChange={(e) => handleDifficultyChange(e.target.value as DifficultyLevel | '')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {difficulties.map((diff) => (
                <option key={diff.value} value={diff.value}>
                  {diff.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>

    {/* Sign-in prompt for non-authenticated users */}
    {!session && (
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-800">
                  <strong>Playing as guest.</strong> Sign in to save your progress and track your achievements.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/auth/signin"
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Main Content */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-24 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : puzzles.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No brain teasers found</h3>
          <p className="text-gray-600">
            {selectedDifficulty 
              ? `No ${selectedDifficulty} level brain teasers available yet.`
              : 'No brain teaser puzzles available yet.'
            }
          </p>
        </div>
      ) : (
        <>
          {/* Puzzles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {puzzles.sort((a, b) => (a.title || '').localeCompare(b.title || '')).map((puzzle) => {
              return (
                <Link
                  key={puzzle._id}
                  href={`/puzzles/brainteasers/${puzzle._id}`}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {puzzle.title}
                    </h3>
                    {getStatusBadge(puzzle)}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(puzzle.difficulty)}`}>
                        {puzzle.difficulty}
                      </span>
                    </div>

                    {puzzle.userProgress && (
                      <div className="text-xs text-gray-500 flex items-center justify-between">
                        <span>Attempts: {puzzle.userProgress.attempts}</span>
                        {puzzle.userProgress.timeSpent > 0 && (
                          <span>Time: {formatTime(puzzle.userProgress.timeSpent)}</span>
                        )}
                        {puzzle.userProgress.score && (
                          <span>Score: {formatScore(puzzle.userProgress.score)}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 text-blue-600 text-sm font-medium group-hover:text-blue-700">
                    {puzzle.userProgress?.status === 'completed' ? 'Play Again' : 'Start Puzzle'} →
                  </div>
                </Link>
              )
            })}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center space-x-1 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center space-x-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = currentPage - 2 + i
                  if (pageNum < 1 || pageNum > totalPages) return null
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center space-x-1 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  </div>
)
}

