'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  Brain, 
  Clock, 
  Trophy, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  ChevronLeft,
  AlertCircle,
  HelpCircle
} from 'lucide-react'
import { IPuzzle, IUserProgress, DifficultyLevel } from '@/types'

interface PuzzleElement {
  id: string
  type: 'text' | 'number' | 'table'
  isUserInput: boolean
  value: string | number
  tableData?: {
    rows: number
    cols: number
    headers: string[]
    data: (string | number)[][]
    userInputCells?: string[]
    partialCells?: Record<string, {
      given: string
      placeholder: string
    }>
    questionMarkAnswers?: Record<string, string>
  }
}

interface BrainteaserData {
  puzzleType: string
  elements: PuzzleElement[]
}

interface BrainteaserSolution {
  userInputElements: {
    id: string
    correctAnswer: string | number
  }[]
}

export default function BrainteaserPuzzlePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const puzzleId = params.id as string

  const [puzzle, setPuzzle] = useState<IPuzzle | null>(null)
  const [userProgress, setUserProgress] = useState<IUserProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
  const [timeSpent, setTimeSpent] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [feedback, setFeedback] = useState<string[]>([])

  useEffect(() => {
    if (puzzleId) {
      fetchPuzzle()
    }
  }, [puzzleId])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (!isCompleted && session) {
      interval = setInterval(() => {
        setTimeSpent(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isCompleted, session])

  const fetchPuzzle = async () => {
    try {
      const response = await fetch(`/api/puzzles/brainteasers/${puzzleId}`)
      const data = await response.json()

      if (data.success) {
        setPuzzle(data.data.puzzle)
        if (data.data.userProgress) {
          setUserProgress(data.data.userProgress)
          setUserAnswers(data.data.userProgress.currentState || {})
          setTimeSpent(data.data.userProgress.timeSpent || 0)
          setIsCompleted(data.data.userProgress.isCompleted || false)
        }
      } else {
        setError(data.error || 'Failed to fetch puzzle')
      }
    } catch (err) {
      setError('Failed to fetch puzzle')
    } finally {
      setLoading(false)
    }
  }

  const saveProgress = async (completed = false) => {
    if (!session || !puzzle) return

    try {
      await fetch(`/api/puzzles/brainteasers/${puzzleId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentState: userAnswers,
          timeSpent,
          isCompleted: completed || isCompleted
        })
      })
    } catch (err) {
      console.error('Failed to save progress:', err)
    }
  }

  const handleAnswerChange = (elementId: string, value: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [elementId]: value
    }))
  }

  const handleCellAnswerChange = (elementId: string, cellKey: string, value: string) => {
    const answerKey = `${elementId}-${cellKey}`
    setUserAnswers(prev => ({
      ...prev,
      [answerKey]: value
    }))
  }

  const checkSolution = async () => {
    if (!puzzle) return

    const puzzleData = puzzle.data as BrainteaserData
    const solution = puzzle.solution as BrainteaserSolution

    const feedback: string[] = []
    let correctCount = 0
    let totalCount = 0

    // Check sequence elements
    const sequenceElements = puzzleData.elements.filter(e => e.isUserInput)
    for (const element of sequenceElements) {
      totalCount++
      const userAnswer = userAnswers[element.id]
      if (userAnswer === element.value.toString()) {
        correctCount++
        feedback.push(`✓ Correct: ${userAnswer}`)
      } else {
        feedback.push(`✗ Incorrect: Expected ${element.value}, got ${userAnswer || 'empty'}`)
      }
    }

    // Check table elements
    const tableElements = puzzleData.elements.filter(e => e.type === 'table')
    for (const element of tableElements) {
      // Check full user input cells
      if (element.tableData?.userInputCells) {
        for (const cellKey of element.tableData.userInputCells) {
          totalCount++
          const [row, col] = cellKey.split('-').map(Number)
          const correctAnswer = element.tableData?.data[row]?.[col]
          const answerKey = `${element.id}-${cellKey}`
          const userAnswer = userAnswers[answerKey]
          
          if (userAnswer === correctAnswer?.toString()) {
            correctCount++
            feedback.push(`✓ Correct: ${userAnswer}`)
          } else {
            feedback.push(`✗ Incorrect: Expected ${correctAnswer}, got ${userAnswer || 'empty'}`)
          }
        }
      }
      
      // Check partial input cells
      if (element.tableData?.partialCells) {
        for (const [cellKey, partialData] of Object.entries(element.tableData.partialCells)) {
          totalCount++
          const [row, col] = cellKey.split('-').map(Number)
          const fullAnswer = element.tableData?.data[row]?.[col] || ''
          const correctUserInput = fullAnswer.toString().replace(partialData.given, '')
          const answerKey = `${element.id}-${cellKey}-partial`
          const userAnswer = userAnswers[answerKey]
          
          if (userAnswer === correctUserInput) {
            correctCount++
            feedback.push(`✓ Correct: ${partialData.given}${userAnswer}`)
          } else {
            feedback.push(`✗ Incorrect: Expected "${correctUserInput}", got "${userAnswer || 'empty'}"`)
          }
        }
      }
      
      // Check question mark cells
      if (element.tableData?.questionMarkAnswers) {
        for (const [cellKey, correctAnswer] of Object.entries(element.tableData.questionMarkAnswers)) {
          totalCount++
          const answerKey = `${element.id}-${cellKey}-question`
          const userAnswer = userAnswers[answerKey]
          
          
          if (userAnswer === correctAnswer) {
            correctCount++
            feedback.push(`✓ Correct: ${userAnswer}`)
          } else {
            feedback.push(`✗ Incorrect: Expected "${correctAnswer}", got "${userAnswer || 'empty'}"`)
          }
        }
      }
    }

    setFeedback(feedback)
    setIsCorrect(correctCount === totalCount && totalCount > 0)
    setShowResult(true)

    if (correctCount === totalCount && totalCount > 0) {
      setIsCompleted(true)
      await saveProgress(true)
    }
  }

  const resetPuzzle = () => {
    setUserAnswers({})
    setTimeSpent(0)
    setIsCompleted(false)
    setShowResult(false)
    setIsCorrect(false)
    setFeedback([])
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case DifficultyLevel.EASY: return 'bg-green-100 text-green-800'
      case DifficultyLevel.MEDIUM: return 'bg-yellow-100 text-yellow-800'
      case DifficultyLevel.HARD: return 'bg-orange-100 text-orange-800'
      case DifficultyLevel.EXPERT: return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !puzzle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Puzzle Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'This puzzle could not be found.'}</p>
          <Link 
            href="/puzzles/brainteasers" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Brain Teasers
          </Link>
        </div>
      </div>
    )
  }

  const puzzleData = puzzle.data as BrainteaserData

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/puzzles/brainteasers" className="text-gray-600 hover:text-gray-900">
                <ChevronLeft className="h-6 w-6" />
              </Link>
              <div className="flex items-center space-x-3">
                <Brain className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {puzzle.title || 'Brain Teaser'}
                  </h1>
                  {puzzle.description && (
                    <p className="text-sm text-gray-600">{puzzle.description}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(puzzle.difficulty)}`}>
                {puzzle.difficulty}
              </span>
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{formatTime(timeSpent)}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Trophy className="h-4 w-4" />
                <span>{puzzle.points} pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Puzzle Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Sequence Puzzle */}
          {puzzleData.puzzleType === 'sequence' && (
            <div className="space-y-6">
              <div className="flex items-center justify-center space-x-4 flex-wrap">
                {puzzleData.elements.map((element, index) => (
                  <div key={element.id} className="flex items-center space-x-2">
                    {element.isUserInput ? (
                      <input
                        type="number"
                        value={userAnswers[element.id] || ''}
                        onChange={(e) => handleAnswerChange(element.id, e.target.value)}
                        className="w-16 h-12 text-center text-lg font-semibold rounded-lg border-2 border-blue-400 bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="?"
                        disabled={isCompleted}
                      />
                    ) : (
                      <div className="w-16 h-12 flex items-center justify-center text-lg font-semibold bg-gray-100 rounded-lg border-2 border-gray-300">
                        {element.value}
                      </div>
                    )}
                    {index < puzzleData.elements.length - 1 && (
                      <span className="text-gray-400 text-lg">-</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table/Grid Puzzle */}
          {(puzzleData.puzzleType === 'tabular' || puzzleData.puzzleType === 'grid') && (
            <div className="space-y-6">
              {puzzleData.elements.map((element) => (
                element.type === 'table' && element.tableData && (
                  <div key={element.id} className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 table-fixed">
                      <tbody>
                        {Array.from({ length: element.tableData.rows }).map((_, rowIndex) => (
                          <tr key={rowIndex}>
                            {Array.from({ length: element.tableData?.cols || 0 }).map((_, colIndex) => {
                              const cellKey = `${rowIndex}-${colIndex}`
                              const isUserInput = element.tableData?.userInputCells?.includes(cellKey)
                              const isPartial = element.tableData?.partialCells?.[cellKey]
                              const cellValue = element.tableData?.data[rowIndex]?.[colIndex]
                              const cellStr = cellValue?.toString() || ''
                              const isQuestionMark = cellStr === '?'
                              const hasQuestionMark = cellStr.includes('?') && cellStr !== '?'
                              
                              
                              return (
                                <td key={colIndex} className="border border-gray-300 px-4 py-2 text-center" style={{ width: `${100 / (element.tableData?.cols || 1)}%` }}>
                                  {isQuestionMark ? (
                                    <input
                                      type="text"
                                      value={userAnswers[`${element.id}-${cellKey}-question`] || ''}
                                      onChange={(e) => handleCellAnswerChange(element.id, `${cellKey}-question`, e.target.value)}
                                      className="bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded py-1 text-center"
                                      placeholder="?"
                                      disabled={isCompleted}
                                      style={{ 
                                        width: `${Math.max(8, (element.tableData?.questionMarkAnswers?.[cellKey]?.length || 1) * 8 + 8)}px` 
                                      }}
                                    />
                                  ) : hasQuestionMark ? (
                                    <div className="flex items-center justify-center flex-wrap w-full">
                                      {cellStr.split('?').map((part, index) => (
                                        <div key={index} className="flex items-center">
                                          {part && <span className="font-medium">{part}</span>}
                                          {index < cellStr.split('?').length - 1 && (
                                            <input
                                              type="text"
                                              value={userAnswers[`${element.id}-${cellKey}-question`] || ''}
                                              onChange={(e) => handleCellAnswerChange(element.id, `${cellKey}-question`, e.target.value)}
                                              className="bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded py-1 text-center"
                                              placeholder="?"
                                              disabled={isCompleted}
                                              style={{ 
                                                width: `${Math.max(8, (element.tableData?.questionMarkAnswers?.[cellKey]?.length || 1) * 8 + 8)}px` 
                                              }}
                                            />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : isPartial ? (
                                    <div className="flex items-center justify-center w-full">
                                      <span className="font-medium">{isPartial.given}</span>
                                      <input
                                        type="text"
                                        value={userAnswers[`${element.id}-${cellKey}-partial`] || ''}
                                        onChange={(e) => handleCellAnswerChange(element.id, `${cellKey}-partial`, e.target.value)}
                                        className="bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-green-500 rounded ml-1 py-1 text-center"
                                        placeholder={isPartial.placeholder}
                                        disabled={isCompleted}
                                        style={{ 
                                          width: `${Math.max(8, (isPartial.placeholder?.length || 4) * 8 + 8)}px` 
                                        }}
                                      />
                                    </div>
                                  ) : isUserInput ? (
                                    <input
                                      type="text"
                                      value={userAnswers[`${element.id}-${cellKey}`] || ''}
                                      onChange={(e) => handleCellAnswerChange(element.id, cellKey, e.target.value)}
                                      className="w-12 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded py-1 text-center"
                                      placeholder="?"
                                      disabled={isCompleted}
                                    />
                                  ) : (
                                    <span className="inline-block font-medium align-middle">
                                      {cellValue}
                                    </span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <button
                onClick={resetPuzzle}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </button>
              {!session && (
                <div className="flex items-center space-x-2 text-sm text-amber-600">
                  <HelpCircle className="h-4 w-4" />
                  <span>Sign in to save progress</span>
                </div>
              )}
            </div>
            
            <button
              onClick={checkSolution}
              disabled={isCompleted}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isCompleted ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Completed!</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Check Solution</span>
                </>
              )}
            </button>
          </div>

          {/* Result */}
          {showResult && (
            <div className={`mt-6 p-4 rounded-lg ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center space-x-2 mb-3">
                {isCorrect ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <h3 className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                  {isCorrect ? 'Congratulations!' : 'Not quite right'}
                </h3>
              </div>
              <div className="space-y-1">
                {feedback.map((item, index) => (
                  <p key={index} className={`text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    {item}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
