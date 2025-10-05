'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Brain, 
  Save, 
  ChevronLeft, 
  RefreshCw,
  Settings,
  Plus,
  Trash2,
  Type,
  Table,
  X
} from 'lucide-react'
import { DifficultyLevel } from '@/types'

interface PuzzleElement {
  id: string
  type: 'text' | 'number' | 'table'
  isUserInput: boolean // true = player needs to fill (for non-table elements), false = given/visible
  value: string | number
  tableData?: {
    rows: number
    cols: number
    headers: string[]
    data: (string | number)[][]
    userInputCells?: string[] // Array of "row-col" strings
    partialCells?: Record<string, {
      given: string // The given part
      placeholder: string // What to show as placeholder for user input
    }> // Record of "row-col" -> {given, placeholder}
    questionMarkAnswers?: Record<string, string> // Record of "row-col" -> correct answer for "?"
  }
}

interface PuzzleType {
  id: string
  name: string
  description: string
}

interface PuzzleForm {
  difficulty: DifficultyLevel
  timeLimit?: number
  points: number
  tags: string[]
}

export default function BrainteasersAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [form, setForm] = useState<PuzzleForm>({
    difficulty: DifficultyLevel.EASY,
    timeLimit: 300,
    points: 100,
    tags: []
  })

  const puzzleTypes: PuzzleType[] = [
    { id: 'sequence', name: 'Sequence', description: 'Number or pattern sequences' },
    { id: 'tabular', name: 'Tabular', description: 'Table-based puzzles' },
    { id: 'grid', name: 'Grid', description: 'Grid-based puzzles' }
  ]

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [puzzleType, setPuzzleType] = useState<PuzzleType>(puzzleTypes[0])
  
  // Initialize with sequence preset on page load
  useEffect(() => {
    generatePreset('sequence')
  }, [])
  const [elements, setElements] = useState<PuzzleElement[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const generatePreset = (type: string) => {
    setElements([]) // Clear existing elements
    
    switch (type) {
      case 'tabular':
        setElements([
          {
            id: '1',
            type: 'table',
            isUserInput: false,
            value: '',
            tableData: {
              rows: 3,
              cols: 2,
              headers: ['', ''],
              data: [['1', '2'], ['4', '6'], ['', '8']],
              userInputCells: [   '2-0']
            }
          }
        ])
        break
      case 'sequence':
        setElements([
          {
            id: '1',
            type: 'number',
            isUserInput: false,
            value: 2
          },
          {
            id: '2',
            type: 'number',
            isUserInput: false,
            value: 4
          },
          {
            id: '3',
            type: 'number',
            isUserInput: false,
            value: 6
          },
          {
            id: '4',
            type: 'number',
            isUserInput: true,
            value: 8
          }
        ])
        break
      case 'grid':
        setElements([
          {
            id: '1',
            type: 'table',
            isUserInput: false,
            value: '',
            tableData: {
              rows: 3,
              cols: 3,
              headers: ['', '', ''],
              data: [['1', '', '3'], ['', '5', ''], ['7', '', '9']],
              userInputCells: ['0-1', '1-0', '1-2', '2-1']
            }
          }
        ])
        break
    }
  }

  const addElement = (type: 'text' | 'number' | 'table') => {
    const newElement: PuzzleElement = {
      id: Date.now().toString(),
      type,
      isUserInput: true, // Default to user input
      value: type === 'number' ? 0 : '',
      tableData: type === 'table' ? {
        rows: 2,
        cols: 2,
        headers: ['', ''],
        data: [['', ''], ['', '']],
        userInputCells: []
      } : undefined
    }
    setElements([...elements, newElement])
  }

  const updateElement = (id: string, updates: Partial<PuzzleElement>) => {
    setElements(elements.map(element => 
      element.id === id ? { ...element, ...updates } : element
    ))
  }

  const removeElement = (id: string) => {
    setElements(elements.filter(element => element.id !== id))
  }

  const addSequenceElement = () => {
    const newElement: PuzzleElement = {
      id: Date.now().toString(),
      type: 'number',
      isUserInput: true,
      value: 0
    }
    setElements([...elements, newElement])
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const updateTableData = (id: string, updates: Partial<PuzzleElement['tableData']>) => {
    setElements(elements.map(element => 
      element.id === id ? { 
        ...element, 
        tableData: element.tableData ? { ...element.tableData, ...updates } : undefined 
      } : element
    ))
  }

  const savePuzzle = async () => {
    // Title and description are now optional

    if (elements.length === 0) {
      setError('At least one element is required')
      return
    }

    // Validate that tables have at least one user input cell (full, partial, or question mark)
    const tablesWithoutUserInput = elements.filter(e => {
      if (e.type !== 'table') return false
      
      // Check for full user input cells
      const hasFullInput = e.tableData?.userInputCells && e.tableData.userInputCells.length > 0
      
      // Check for partial cells
      const hasPartial = e.tableData?.partialCells && Object.keys(e.tableData.partialCells).length > 0
      
      // Check for question marks
      const hasQuestionMarks = e.tableData?.data.some(row => row.some(cell => cell?.toString().includes('?')))
      
      return !hasFullInput && !hasPartial && !hasQuestionMarks
    })
    
    if (tablesWithoutUserInput.length > 0) {
      setError('Table elements must have at least one user input cell, partial input cell, or question mark (?)')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/puzzles/brainteasers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          difficulty: form.difficulty,
          data: { 
            puzzleType: puzzleType.id,
            elements: elements.map(e => ({
              id: e.id,
              type: e.type,
              isUserInput: e.isUserInput,
              value: e.value,
              tableData: e.tableData
            }))
          },
          solution: { 
            userInputElements: elements.flatMap(e => {
              if (e.isUserInput) {
                // For non-table elements
                return [{
                  id: e.id,
                  correctAnswer: e.value
                }]
              } else if (e.type === 'table') {
                const solutions = []
                
                // Add full user input cells (but not if they contain question marks)
                if (e.tableData?.userInputCells) {
                  solutions.push(...e.tableData.userInputCells.map(cellKey => {
                    const [row, col] = cellKey.split('-').map(Number)
                    const cellValue = e.tableData?.data[row]?.[col] || ''
                    // Only add if it doesn't contain a question mark (question marks are handled separately)
                    if (!cellValue.toString().includes('?')) {
                      return {
                        id: `${e.id}-${cellKey}`,
                        correctAnswer: cellValue
                      }
                    }
                    return null
                  }).filter(Boolean))
                }
                
                // Add partial input cells
                if (e.tableData?.partialCells) {
                  solutions.push(...Object.entries(e.tableData.partialCells).map(([cellKey, partialData]) => {
                    const [row, col] = cellKey.split('-').map(Number)
                    const fullAnswer = e.tableData?.data[row]?.[col] || ''
                    const userInputPart = fullAnswer.toString().replace(partialData.given, '')
                    return {
                      id: `${e.id}-${cellKey}-partial`,
                      correctAnswer: userInputPart
                    }
                  }))
                }
                
                // Add question mark cells (including those in userInputCells that contain ?)
                if (e.tableData?.questionMarkAnswers) {
                  solutions.push(...Object.entries(e.tableData.questionMarkAnswers).map(([cellKey, answer]) => {
                    return {
                      id: `${e.id}-${cellKey}-question`,
                      correctAnswer: answer
                    }
                  }))
                }
                
                // Also check userInputCells for question marks that might not be in questionMarkAnswers yet
                if (e.tableData?.userInputCells) {
                  e.tableData.userInputCells.forEach(cellKey => {
                    const [row, col] = cellKey.split('-').map(Number)
                    const cellValue = e.tableData?.data[row]?.[col] || ''
                    if (cellValue.toString().includes('?') && !e.tableData?.questionMarkAnswers?.[cellKey]) {
                      // This is a question mark cell that needs an answer defined
                      console.warn(`Question mark cell ${cellKey} needs an answer defined`)
                    }
                  })
                }
                
                
                return solutions
              }
              return []
            })
          },
          timeLimit: form.timeLimit,
          points: form.points,
          tags: tags
        })
      })

      const data = await response.json()
      if (data.success) {
        setSuccess('Brain teaser saved successfully!')
        // Reset form
        setTitle('')
        setDescription('')
        setElements([])
        setTags([])
      } else {
        setError(data.error || 'Failed to save puzzle')
      }
    } catch (err) {
      setError('Failed to save puzzle')
    } finally {
      setIsSaving(false)
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/puzzles/brainteasers" className="text-gray-600 hover:text-gray-900">
                <ChevronLeft className="h-6 w-6" />
              </Link>
              <div className="flex items-center space-x-3">
                <Settings className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Brain Teasers Admin</h1>
                  <p className="text-sm text-gray-600">Create and manage brain teaser puzzles</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Puzzle Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Puzzle Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (Optional)</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter puzzle title (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Enter puzzle description (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Puzzle Type</label>
                  <select
                    value={puzzleType.id}
                    onChange={(e) => {
                      const type = puzzleTypes.find(t => t.id === e.target.value)
                      if (type) {
                        setPuzzleType(type)
                        generatePreset(type.id)
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {puzzleTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                    <select
                      value={form.difficulty}
                      onChange={(e) => setForm({ ...form, difficulty: e.target.value as DifficultyLevel })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={DifficultyLevel.EASY}>Easy</option>
                      <option value={DifficultyLevel.MEDIUM}>Medium</option>
                      <option value={DifficultyLevel.HARD}>Hard</option>
                      <option value={DifficultyLevel.EXPERT}>Expert</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                    <input
                      type="number"
                      value={form.points}
                      onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (seconds)</label>
                  <input
                    type="number"
                    value={form.timeLimit || ''}
                    onChange={(e) => setForm({ ...form, timeLimit: Number(e.target.value) || undefined })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (Solution Hints)</label>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add a tag (e.g., 'arithmetic', 'pattern')"
                      />
                      <button
                        onClick={addTag}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                          >
                            <span>{tag}</span>
                            <button
                              onClick={() => removeTag(tag)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      Tags are hidden from players until they solve the puzzle. Use them as solution hints.
                    </p>
                  </div>
                </div>

                <button
                  onClick={savePuzzle}
                  disabled={isSaving}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>Save Puzzle</span>
                </button>
              </div>
            </div>
          </div>

          {/* Puzzle Elements */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Puzzle Elements</h2>
                {puzzleType.id === 'sequence' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={addSequenceElement}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Element</span>
                    </button>
                  </div>
                )}
              </div>

              {elements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No elements yet. Add some to create your puzzle.</p>
                </div>
              ) : puzzleType.id === 'sequence' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-2 flex-wrap">
                    {elements.map((element, index) => (
                      <div key={element.id} className="flex items-center space-x-2">
                        <div className="relative">
                          <input
                            type="number"
                            value={element.value}
                            onChange={(e) => updateElement(element.id, { value: Number(e.target.value) })}
                            className={`w-16 h-12 text-center text-lg font-semibold rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              element.isUserInput 
                                ? 'border-dashed border-blue-400 bg-blue-50' 
                                : 'border-solid border-gray-300 bg-white'
                            }`}
                            placeholder="?"
                          />
                          <button
                            onClick={() => updateElement(element.id, { isUserInput: !element.isUserInput })}
                            className={`absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold ${
                              element.isUserInput 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-300 text-gray-600'
                            }`}
                            title={element.isUserInput ? 'User Input' : 'Given'}
                          >
                            {element.isUserInput ? '?' : '✓'}
                          </button>
                        </div>
                        {index < elements.length - 1 && (
                          <span className="text-gray-400 text-lg">-</span>
                        )}
                        <button
                          onClick={() => removeElement(element.id)}
                          className="text-red-500 hover:text-red-700 ml-1"
                          title="Remove element"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {elements.map((element, index) => (
                    <div key={element.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-900">
                          Element {index + 1} - {element.type.charAt(0).toUpperCase() + element.type.slice(1)}
                        </h3>
                        <button
                          onClick={() => removeElement(element.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {element.type !== 'table' && (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`userInput-${element.id}`}
                                  checked={element.isUserInput}
                                  onChange={(e) => updateElement(element.id, { isUserInput: e.target.checked })}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor={`userInput-${element.id}`} className="text-sm font-medium text-gray-700">
                                  User Input
                                </label>
                              </div>
                              <span className="text-xs text-gray-500">
                                {element.isUserInput ? 'Player must fill this' : 'Given to player'}
                              </span>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {element.isUserInput ? 'Correct Answer' : 'Value'}
                              </label>
                              <input
                                type={element.type === 'number' ? 'number' : 'text'}
                                value={element.value}
                                onChange={(e) => updateElement(element.id, { 
                                  value: element.type === 'number' ? Number(e.target.value) : e.target.value 
                                })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={element.isUserInput ? "Enter the correct answer" : "Enter the value to display"}
                              />
                            </div>
                          </>
                        )}

                        {element.type === 'table' && (
                          <div>
                            <p className="text-sm text-gray-600 mb-3">
                              Click the "?" button on cells that players need to fill. Blue cells are user inputs.
                            </p>
                          </div>
                        )}

                        {element.type === 'table' && element.tableData && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rows</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={element.tableData.rows}
                                  onChange={(e) => {
                                    const newRows = Number(e.target.value)
                                    const currentRows = element.tableData?.rows || 0
                                    const currentCols = element.tableData?.cols || 2
                                    const newData = Array(newRows).fill(null).map((_, i) => {
                                      if (i < currentRows && element.tableData?.data[i]) {
                                        // Keep existing row data
                                        return element.tableData.data[i]
                                      } else {
                                        // Create new row with correct number of columns
                                        return Array(currentCols).fill('')
                                      }
                                    })
                                    // Remove userInputCells that reference deleted rows
                                    const newUserInputCells = (element.tableData?.userInputCells || []).filter(cellKey => {
                                      const [row] = cellKey.split('-').map(Number)
                                      return row < newRows
                                    })
                                    updateTableData(element.id, { 
                                      rows: newRows,
                                      data: newData,
                                      userInputCells: newUserInputCells
                                    })
                                  }}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Columns</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={element.tableData.cols}
                                  onChange={(e) => {
                                    const newCols = Number(e.target.value)
                                    const currentCols = element.tableData?.cols || 0
                                    const newData = (element.tableData?.data || []).map(row => {
                                      if (newCols > currentCols) {
                                        // Adding columns
                                        return [...row, ...Array(newCols - currentCols).fill('')]
                                      } else {
                                        // Removing columns
                                        return row.slice(0, newCols)
                                      }
                                    })
                                    const newHeaders = (element.tableData?.headers || []).slice(0, newCols)
                                    // Remove userInputCells that reference deleted columns
                                    const newUserInputCells = (element.tableData?.userInputCells || []).filter(cellKey => {
                                      const [, col] = cellKey.split('-').map(Number)
                                      return col < newCols
                                    })
                                    updateTableData(element.id, { 
                                      cols: newCols,
                                      data: newData,
                                      headers: newHeaders,
                                      userInputCells: newUserInputCells
                                    })
                                  }}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Table Data</label>
                              <div className="border border-gray-300 rounded-lg overflow-hidden">
                                <table className="w-full">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      {Array.from({ length: element.tableData.cols }).map((_, colIndex) => (
                                        <th key={colIndex} className="px-3 py-2 border-b border-gray-200">
                                          <input
                                            type="text"
                                            value={element.tableData?.headers[colIndex] || ''}
                                            onChange={(e) => {
                                              const newHeaders = [...(element.tableData?.headers || [])]
                                              newHeaders[colIndex] = e.target.value
                                              updateTableData(element.id, { headers: newHeaders })
                                            }}
                                            className="w-full text-center bg-transparent border-none focus:outline-none"
                                            placeholder={`Header ${colIndex + 1}`}
                                          />
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Array.from({ length: element.tableData.rows }).map((_, rowIndex) => (
                                      <tr key={rowIndex}>
                                        {Array.from({ length: element.tableData?.cols || 0 }).map((_, colIndex) => (
                                          <td key={colIndex} className="px-3 py-2 border-b border-gray-200">
                                            <div className="relative">
                                              <input
                                                type="text"
                                                value={element.tableData?.data[rowIndex]?.[colIndex] || ''}
                                                onChange={(e) => {
                                                  const newValue = e.target.value
                                                  const newData = (element.tableData?.data || []).map((row, r) => 
                                                    r === rowIndex 
                                                      ? row.map((cell, c) => c === colIndex ? newValue : cell)
                                                      : row
                                                  )
                                                  
                                                  // Auto-detect question marks and create answer entry
                                                  if (newValue.includes('?') && !element.tableData?.questionMarkAnswers?.[`${rowIndex}-${colIndex}`]) {
                                                    const newAnswers = { ...(element.tableData?.questionMarkAnswers || {}) }
                                                    newAnswers[`${rowIndex}-${colIndex}`] = ''
                                                    updateTableData(element.id, { 
                                                      data: newData,
                                                      questionMarkAnswers: newAnswers
                                                    })
                                                  } else {
                                                    updateTableData(element.id, { data: newData })
                                                  }
                                                }}
                                                className={`w-full text-center bg-transparent border-none focus:outline-none ${
                                                  element.tableData?.data[rowIndex]?.[colIndex]?.toString().includes('?') 
                                                    ? 'bg-yellow-100 border border-yellow-300' 
                                                    : ''
                                                }`}
                                                placeholder="Enter value or ? for user input"
                                              />
                                              <div className="absolute -top-1 -right-1 flex space-x-1">
                                                <button
                                                  onClick={() => {
                                                    const cellKey = `${rowIndex}-${colIndex}`
                                                    const isUserInput = element.tableData?.userInputCells?.includes(cellKey) || false
                                                    const newUserInputCells = isUserInput
                                                      ? (element.tableData?.userInputCells || []).filter(cell => cell !== cellKey)
                                                      : [...(element.tableData?.userInputCells || []), cellKey]
                                                    
                                                    // Remove from partial cells if it was there
                                                    let newPartialCells = { ...(element.tableData?.partialCells || {}) }
                                                    delete newPartialCells[cellKey]
                                                    
                                                    updateTableData(element.id, { 
                                                      userInputCells: newUserInputCells,
                                                      partialCells: newPartialCells
                                                    })
                                                  }}
                                                  className={`w-5 h-5 rounded-full text-xs font-bold ${
                                                    element.tableData?.userInputCells?.includes(`${rowIndex}-${colIndex}`)
                                                      ? 'bg-blue-500 text-white' 
                                                      : 'bg-gray-300 text-gray-600'
                                                  }`}
                                                  title="Full user input"
                                                >
                                                  ?
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    const cellKey = `${rowIndex}-${colIndex}`
                                                    const isPartial = element.tableData?.partialCells?.[cellKey]
                                                    let newPartialCells = { ...(element.tableData?.partialCells || {}) }
                                                    
                                                    if (isPartial) {
                                                      delete newPartialCells[cellKey]
                                                    } else {
                                                      newPartialCells[cellKey] = {
                                                        given: '',
                                                        placeholder: '...'
                                                      }
                                                    }
                                                    
                                                    // Remove from user input cells if it was there
                                                    const newUserInputCells = (element.tableData?.userInputCells || []).filter(cell => cell !== cellKey)
                                                    
                                                    updateTableData(element.id, { 
                                                      partialCells: newPartialCells,
                                                      userInputCells: newUserInputCells
                                                    })
                                                  }}
                                                  className={`w-5 h-5 rounded-full text-xs font-bold ${
                                                    element.tableData?.partialCells?.[`${rowIndex}-${colIndex}`]
                                                      ? 'bg-green-500 text-white' 
                                                      : 'bg-gray-300 text-gray-600'
                                                  }`}
                                                  title="Partial input (given + user input)"
                                                >
                                                  ~
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Question Mark Answers Editor */}
                        {element.type === 'table' && element.tableData && (() => {
                          const questionMarkCells: string[] = []
                          element.tableData.data.forEach((row, rowIndex) => {
                            row.forEach((cell, colIndex) => {
                              if (cell && cell.toString().includes('?')) {
                                questionMarkCells.push(`${rowIndex}-${colIndex}`)
                              }
                            })
                          })
                          return questionMarkCells.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium text-gray-700">Question Mark Answers</h4>
                              <div className="grid grid-cols-1 gap-3">
                                {questionMarkCells.map((cellKey) => (
                                  <div key={cellKey} className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                                    <span className="text-sm font-medium text-gray-600">Cell {cellKey} (?):</span>
                                    <input
                                      type="text"
                                      value={element.tableData?.questionMarkAnswers?.[cellKey] || ''}
                                      onChange={(e) => {
                                        const newAnswers = { ...(element.tableData?.questionMarkAnswers || {}) }
                                        newAnswers[cellKey] = e.target.value
                                        updateTableData(element.id, { questionMarkAnswers: newAnswers })
                                      }}
                                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                                      placeholder="Correct answer for this ?"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}

                        {/* Partial Cells Editor */}
                        {element.type === 'table' && element.tableData?.partialCells && Object.keys(element.tableData.partialCells).length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-gray-700">Partial Input Cells</h4>
                            <div className="grid grid-cols-1 gap-3">
                              {Object.entries(element.tableData.partialCells).map(([cellKey, partialData]) => (
                                <div key={cellKey} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                  <span className="text-sm font-medium text-gray-600">Cell {cellKey}:</span>
                                  <input
                                    type="text"
                                    value={partialData.given}
                                    onChange={(e) => {
                                      const newPartialCells = { ...element.tableData?.partialCells }
                                      newPartialCells[cellKey] = { ...partialData, given: e.target.value }
                                      updateTableData(element.id, { partialCells: newPartialCells })
                                    }}
                                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                                    placeholder="Given part (e.g., 'Hello ')"
                                  />
                                  <span className="text-gray-400">+</span>
                                  <input
                                    type="text"
                                    value={partialData.placeholder}
                                    onChange={(e) => {
                                      const newPartialCells = { ...element.tableData?.partialCells }
                                      newPartialCells[cellKey] = { ...partialData, placeholder: e.target.value }
                                      updateTableData(element.id, { partialCells: newPartialCells })
                                    }}
                                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                                    placeholder="User input placeholder (e.g., 'World')"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
