'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, 
  Clock, 
  Trophy, 
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import { MaffdokuData, MaffdokuCell } from '@/types'

interface Puzzle {
  _id: string
  title: string
  description: string
  difficulty: string
  data: MaffdokuData
  solution: { grid: number[][] }
  timeLimit?: number
  points: number
  userProgress?: {
    isCompleted: boolean
    currentGrid: number[][]
    timeSpent: number
    score?: number
  }
}

export default function MaffdokuPuzzlePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [playerGrid, setPlayerGrid] = useState<number[][]>([])
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null)
  const [inputBuffer, setInputBuffer] = useState<string>('')
  const [timeSpent, setTimeSpent] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const puzzleId = params.id as string

  // Timer effect
  useEffect(() => {
    if (!puzzle || isCompleted) return

    const interval = setInterval(() => {
      setTimeSpent(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [puzzle, isCompleted])

  // Fetch puzzle data
  useEffect(() => {
    const fetchPuzzle = async () => {
      try {
        const response = await fetch(`/api/puzzles/maffdoku/${puzzleId}`)
        const data = await response.json()
        
        if (data.success) {
          setPuzzle(data.data)
          
          // Initialize player grid from progress or empty
          if (data.data.userProgress?.currentGrid) {
            setPlayerGrid(data.data.userProgress.currentGrid)
            setTimeSpent(data.data.userProgress.timeSpent || 0)
            setIsCompleted(data.data.userProgress.isCompleted || false)
          } else {
            // Initialize empty grid
            const emptyGrid = Array(data.data.data.size).fill(null).map(() =>
              Array(data.data.data.size).fill(0)
            )
            setPlayerGrid(emptyGrid)
          }
        } else {
          console.error('Failed to fetch puzzle:', data.error)
        }
      } catch (error) {
        console.error('Error fetching puzzle:', error)
      } finally {
        setLoading(false)
      }
    }

    if (puzzleId) {
      fetchPuzzle()
    }
  }, [puzzleId])

  // Keyboard input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell || !puzzle || isCompleted) return

      const { row, col } = selectedCell
      const maxNumber = puzzle.data.size === 3 ? 9 : 16

      // Handle number keys (0-9) - build up multi-digit numbers
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault()
        
        if (e.key === '0' && inputBuffer === '') {
          // Clear cell if 0 is pressed with empty buffer
          setCellValue(row, col, 0)
          setInputBuffer('')
        } else {
          // Build up the number
          const newBuffer = inputBuffer + e.key
          const num = parseInt(newBuffer)
          
          if (puzzle.data.size === 3) {
            // For 3x3: only allow 1-9, set immediately
            if (num >= 1 && num <= 9) {
              setCellValue(row, col, num)
              setInputBuffer('')
            } else {
              setInputBuffer('')
            }
          } else {
            // For 4x4: allow 1-16
            if (newBuffer.length === 1) {
              if (num >= 1 && num <= 9) {
                setInputBuffer(newBuffer) // Keep building
              } else {
                setInputBuffer('')
              }
            } else if (newBuffer.length === 2) {
              if (num >= 10 && num <= 16) {
                setCellValue(row, col, num)
                setInputBuffer('')
              } else {
                setInputBuffer('')
              }
            } else {
              setInputBuffer('')
            }
          }
        }
      }
      
      // Handle Enter or Space to confirm current buffer
      else if ((e.key === 'Enter' || e.key === ' ') && inputBuffer !== '') {
        e.preventDefault()
        const num = parseInt(inputBuffer)
        if (num >= 1 && num <= maxNumber) {
          setCellValue(row, col, num)
        }
        setInputBuffer('')
      }
      
      // Handle backspace/delete
      else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        if (inputBuffer !== '') {
          setInputBuffer(inputBuffer.slice(0, -1))
        } else {
          setCellValue(row, col, 0)
        }
      }
      
      // Handle Escape to clear buffer
      else if (e.key === 'Escape') {
        e.preventDefault()
        setInputBuffer('')
      }
      
      // Handle arrow keys for navigation
      else if (e.key === 'ArrowUp' && row > 0) {
        e.preventDefault()
        validatePendingInput()
        setSelectedCell({ row: row - 1, col })
        setInputBuffer('')
      }
      else if (e.key === 'ArrowDown' && row < puzzle.data.size - 1) {
        e.preventDefault()
        validatePendingInput()
        setSelectedCell({ row: row + 1, col })
        setInputBuffer('')
      }
      else if (e.key === 'ArrowLeft' && col > 0) {
        e.preventDefault()
        validatePendingInput()
        setSelectedCell({ row, col: col - 1 })
        setInputBuffer('')
      }
      else if (e.key === 'ArrowRight' && col < puzzle.data.size - 1) {
        e.preventDefault()
        validatePendingInput()
        setSelectedCell({ row, col: col + 1 })
        setInputBuffer('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCell, puzzle, inputBuffer, isCompleted])

  const setCellValue = (row: number, col: number, value: number) => {
    const newGrid = [...playerGrid]
    newGrid[row][col] = value
    setPlayerGrid(newGrid)
    
    // Check if puzzle is complete
    if (newGrid.every(row => row.every(val => val > 0))) {
      checkSolution(newGrid)
    }
  }

  const validatePendingInput = () => {
    if (selectedCell && inputBuffer !== '') {
      const num = parseInt(inputBuffer)
      const maxNumber = puzzle?.data.size === 3 ? 9 : 16
      if (num >= 1 && num <= (maxNumber || 9)) {
        setCellValue(selectedCell.row, selectedCell.col, num)
      }
      setInputBuffer('')
    }
  }

  const handleCellClick = (row: number, col: number) => {
    validatePendingInput()
    setSelectedCell({ row, col })
    setInputBuffer('')
  }

  const checkSolution = async (grid: number[][]) => {
    if (!session?.user?.id || !puzzle) return

    setSaving(true)
    try {
      const response = await fetch(`/api/puzzles/maffdoku/${puzzleId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentGrid: grid,
          timeSpent,
          isCompleted: true
        })
      })

      const data = await response.json()
      
      if (data.success) {
        if (data.data.isCorrect) {
          setIsCompleted(true)
          setErrors([])
        } else {
          setErrors(data.data.errors || ['Some values are incorrect'])
        }
      }
    } catch (error) {
      console.error('Error checking solution:', error)
    } finally {
      setSaving(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!puzzle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Puzzle Not Found</h1>
          <Link href="/puzzles/maffdoku" className="text-purple-600 hover:text-purple-700">
            ← Back to Maffdoku Puzzles
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/puzzles/maffdoku" className="text-gray-600 hover:text-gray-900">
                <ChevronLeft className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{puzzle.title}</h1>
                <p className="text-sm text-gray-600">{puzzle.description}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Timer */}
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="h-5 w-5" />
                <span className="font-mono">{formatTime(timeSpent)}</span>
              </div>
              
              {/* Points */}
              <div className="flex items-center space-x-2 text-gray-600">
                <Trophy className="h-5 w-5" />
                <span>{puzzle.points} pts</span>
              </div>
              
              {/* Status */}
              {isCompleted && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>Completed!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h3 className="font-medium text-red-800">Errors Found:</h3>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Game Grid */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-center">
            <div className="p-4 bg-gray-100 rounded-lg">
              <div 
                className="grid gap-1"
                style={{ 
                  gridTemplateColumns: `repeat(${puzzle.data.size + 2}, 1fr)`,
                  width: 'fit-content'
                }}
              >
                {/* First row: empty corner + column sums + empty corner */}
                <div className="w-12 h-12 border border-gray-300 bg-gray-200"></div>
                {Array.from({ length: puzzle.data.size }).map((_, col) => (
                  <div 
                    key={`sum-col-${col}`} 
                    className={`w-12 h-12 border border-gray-300 flex items-center justify-center text-sm font-bold ${
                      puzzle.data.visibility.columnSums[col] 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-300 text-gray-500'
                    }`}
                  >
                    {puzzle.data.visibility.columnSums[col] ? (puzzle.data.constraints.columnSums[col] || '?') : '·'}
                  </div>
                ))}
                <div className="w-12 h-12 border border-gray-300 bg-gray-200"></div>

                {/* Middle rows: row sum + puzzle cells + row product */}
                {Array.from({ length: puzzle.data.size }).map((_, row) => [
                  <div 
                    key={`sum-row-${row}`} 
                    className={`w-12 h-12 border border-gray-300 flex items-center justify-center text-sm font-bold ${
                      puzzle.data.visibility.rowSums[row] 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-300 text-gray-500'
                    }`}
                  >
                    {puzzle.data.visibility.rowSums[row] ? (puzzle.data.constraints.rowSums[row] || '?') : '·'}
                  </div>,
                  ...Array.from({ length: puzzle.data.size }).map((_, col) => {
                    const isSelected = selectedCell?.row === row && selectedCell?.col === col
                    const hasValue = playerGrid[row] && playerGrid[row][col]
                    const showBuffer = isSelected && inputBuffer !== '' && !hasValue
                    
                    return (
                      <div
                        key={`cell-${row}-${col}`}
                        onClick={() => handleCellClick(row, col)}
                        className={`w-12 h-12 border-2 cursor-pointer flex items-center justify-center text-sm font-medium hover:bg-gray-50 transition-colors ${
                          isSelected 
                            ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' 
                            : 'border-gray-300 bg-white'
                        } ${isCompleted ? 'cursor-not-allowed' : ''}`}
                        title={`Click to select, then type numbers 1-${puzzle.data.size === 3 ? 9 : 16}`}
                      >
                        {hasValue ? (
                          <span className="text-blue-600 font-bold text-lg">{playerGrid[row][col]}</span>
                        ) : showBuffer ? (
                          <span className="text-purple-600 font-bold text-lg">{inputBuffer}_</span>
                        ) : (
                          <span className="text-gray-300 text-xs">·</span>
                        )}
                      </div>
                    )
                  }),
                  <div 
                    key={`prod-row-${row}`} 
                    className={`w-12 h-12 border border-gray-300 flex items-center justify-center text-sm font-bold ${
                      puzzle.data.visibility.rowProducts[row] 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-gray-300 text-gray-500'
                    }`}
                  >
                    {puzzle.data.visibility.rowProducts[row] ? (puzzle.data.constraints.rowProducts[row] || '?') : '·'}
                  </div>
                ])}

                {/* Last row: empty corner + column products + empty corner */}
                <div className="w-12 h-12 border border-gray-300 bg-gray-200"></div>
                {Array.from({ length: puzzle.data.size }).map((_, col) => (
                  <div 
                    key={`prod-col-${col}`} 
                    className={`w-12 h-12 border border-gray-300 flex items-center justify-center text-sm font-bold ${
                      puzzle.data.visibility.columnProducts[col] 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-gray-300 text-gray-500'
                    }`}
                  >
                    {puzzle.data.visibility.columnProducts[col] ? (puzzle.data.constraints.columnProducts[col] || '?') : '·'}
                  </div>
                ))}
                <div className="w-12 h-12 border border-gray-300 bg-gray-200"></div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <div className="space-y-1">
              <div><strong>Goal:</strong> Fill the grid with numbers 1-{puzzle.data.size === 3 ? 9 : 16} (each used exactly once)</div>
              <div><strong>Constraints:</strong> Match the visible sums and products shown around the grid</div>
              <div><strong>Input:</strong> Click cells and type numbers • Use arrow keys to navigate</div>
              {selectedCell && (
                <div className="mt-2 text-xs text-purple-600 font-medium">
                  Selected: Row {selectedCell.row + 1}, Column {selectedCell.col + 1}
                  {inputBuffer && <span className="ml-2 font-bold">Typing: {inputBuffer}_</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 