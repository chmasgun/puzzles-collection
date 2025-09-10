'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Grid2x2X, 
  Save, 
  ChevronLeft, 
  RefreshCw,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react'
import { DifficultyLevel, MaffdokuData, MaffdokuCell, PuzzleType } from '@/types'

interface PuzzleForm {
  title: string
  description: string
  difficulty: DifficultyLevel
  size: 3 | 4
  timeLimit?: number
  points: number
  tags: string[]
}

export default function MaffdokuAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [form, setForm] = useState<PuzzleForm>({
    title: '',
    description: '',
    difficulty: DifficultyLevel.EASY,
    size: 3,
    timeLimit: 300, // 5 minutes default
    points: 100,
    tags: []
  })

  const [puzzleData, setPuzzleData] = useState<MaffdokuData>({
    grid: [],
    size: 3,
    constraints: {
      columnSums: [],
      rowSums: [],
      columnProducts: [],
      rowProducts: []
    },
    visibility: {
      columnSums: [],
      rowSums: [],
      columnProducts: [],
      rowProducts: []
    }
  })

  const [solutionGrid, setSolutionGrid] = useState<number[][]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Initialize grid when size changes
  useEffect(() => {
    initializeGrid(form.size)
  }, [form.size])

  const initializeGrid = (size: number) => {
    const newGrid: MaffdokuCell[][] = Array(size).fill(null).map(() =>
      Array(size).fill(null).map(() => ({
        value: null,
        isGiven: false,
        isValid: true
      }))
    )

    const newSolutionGrid: number[][] = Array(size).fill(null).map(() =>
      Array(size).fill(0)
    )

    setPuzzleData({
      grid: newGrid,
      size,
      constraints: {
        columnSums: Array(size).fill(0),
        rowSums: Array(size).fill(0),
        columnProducts: Array(size).fill(0),
        rowProducts: Array(size).fill(0)
      },
      visibility: {
        columnSums: Array(size).fill(true),
        rowSums: Array(size).fill(true),
        columnProducts: Array(size).fill(true),
        rowProducts: Array(size).fill(true)
      }
    })
    setSolutionGrid(newSolutionGrid)
  }

  const generateRandomPuzzle = () => {
    setIsGenerating(true)
    try {
      const size = form.size
      const newSolutionGrid = generateValidSudoku(size)
      const newGrid = createPuzzleFromSolution(newSolutionGrid, size)
      const newConstraints = calculateConstraints(newSolutionGrid, size)
      const newVisibility = generateDefaultVisibility(size)

      setPuzzleData({
        grid: newGrid,
        size,
        constraints: newConstraints,
        visibility: newVisibility
      })
      setSolutionGrid(newSolutionGrid)
      setSuccess('Random puzzle generated successfully!')
    } catch (err) {
      setError('Failed to generate puzzle')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateDefaultVisibility = (size: number) => {
    return {
      columnSums: Array(size).fill(true),
      rowSums: Array(size).fill(true),
      columnProducts: Array(size).fill(true),
      rowProducts: Array(size).fill(true)
    }
  }

  const calculateConstraints = (solutionGrid: number[][], size: number) => {
    const columnSums = Array(size).fill(0)
    const rowSums = Array(size).fill(0)
    const columnProducts = Array(size).fill(1)
    const rowProducts = Array(size).fill(1)

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const value = solutionGrid[row][col]
        columnSums[col] += value
        rowSums[row] += value
        columnProducts[col] *= value
        rowProducts[row] *= value
      }
    }

    return {
      columnSums,
      rowSums,
      columnProducts,
      rowProducts
    }
  }

  const generateValidSudoku = (size: number): number[][] => {
    // For 3x3 and 4x4 grids, create random valid grids
    // Numbers 1-9 for 3x3, 1-16 for 4x4
    const maxNumber = size === 3 ? 9 : 16
    const grid = Array(size).fill(null).map(() => Array(size).fill(0))
    
    // Simple backtracking approach for small grids
    if (fillGrid(grid, 0, 0, size, maxNumber)) {
      return grid
    }
    
    // Fallback: create a simple valid grid
    return createSimpleValidGrid(size, maxNumber)
  }

  const fillGrid = (grid: number[][], row: number, col: number, size: number, maxNumber: number): boolean => {
    if (row === size) return true
    if (col === size) return fillGrid(grid, row + 1, 0, size, maxNumber)
    
    const numbers = Array.from({ length: maxNumber }, (_, i) => i + 1)
    // Shuffle for randomness
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[numbers[i], numbers[j]] = [numbers[j], numbers[i]]
    }
    
    for (const num of numbers) {
      if (isValidPlacement(grid, row, col, num, size)) {
        grid[row][col] = num
        if (fillGrid(grid, row, col + 1, size, maxNumber)) return true
        grid[row][col] = 0
      }
    }
    
    return false
  }

  const isValidPlacement = (grid: number[][], row: number, col: number, num: number, size: number): boolean => {
    // Check row
    for (let c = 0; c < size; c++) {
      if (grid[row][c] === num) return false
    }
    
    // Check column
    for (let r = 0; r < size; r++) {
      if (grid[r][col] === num) return false
    }
    
    return true
  }

  const createSimpleValidGrid = (size: number, maxNumber: number): number[][] => {
    const grid = Array(size).fill(null).map(() => Array(size).fill(0))
    
    // Create a simple valid grid using random numbers
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        let num
        do {
          num = Math.floor(Math.random() * maxNumber) + 1
        } while (grid[row].includes(num) || grid.some(r => r[col] === num))
        
        grid[row][col] = num
      }
    }
    
    return grid
  }

  const createPuzzleFromSolution = (solution: number[][], size: number): MaffdokuCell[][] => {
    return Array(size).fill(null).map(() =>
      Array(size).fill(null).map(() => ({
        value: null, // Start with empty cells
        isGiven: false,
        isValid: true
      }))
    )
  }

  const handleCellValueChange = (row: number, col: number) => {
    // Cycle through numbers 1 to maxNumber, then back to 0 (empty)
    const maxNumber = form.size === 3 ? 9 : 16
    const currentValue = solutionGrid[row]?.[col] || 0
    const nextValue = currentValue >= maxNumber ? 0 : currentValue + 1
    
    const newSolutionGrid = [...solutionGrid]
    if (!newSolutionGrid[row]) {
      newSolutionGrid[row] = Array(form.size).fill(0)
    }
    newSolutionGrid[row][col] = nextValue
    
    setSolutionGrid(newSolutionGrid)
    
    // Recalculate constraints when solution changes
    if (newSolutionGrid.every(row => row.every(val => val > 0))) {
      const newConstraints = calculateConstraints(newSolutionGrid, form.size)
      setPuzzleData(prev => ({
        ...prev,
        constraints: newConstraints
      }))
    }
  }

  const toggleConstraintVisibility = (type: 'columnSums' | 'rowSums' | 'columnProducts' | 'rowProducts', index: number) => {
    setPuzzleData(prev => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        [type]: prev.visibility[type].map((visible, i) => i === index ? !visible : visible)
      }
    }))
  }

  const savePuzzle = async () => {
    if (!form.title || !form.description) {
      setError('Please fill in title and description')
      return
    }

    if (!solutionGrid.every(row => row.every(val => val > 0))) {
      setError('Please complete the solution grid')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/puzzles/maffdoku', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          difficulty: form.difficulty,
          data: puzzleData,
          solution: { grid: solutionGrid },
          timeLimit: form.timeLimit,
          points: form.points,
          tags: form.tags
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Puzzle saved successfully!')
        // Reset form
        setForm({
          title: '',
          description: '',
          difficulty: DifficultyLevel.EASY,
          size: 3,
          timeLimit: 300,
          points: 100,
          tags: []
        })
        initializeGrid(3)
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
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
              <Link href="/puzzles/maffdoku" className="text-gray-600 hover:text-gray-900">
                <ChevronLeft className="h-6 w-6" />
              </Link>
              <div className="flex items-center space-x-3">
                <Settings className="h-8 w-8 text-purple-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Maffdoku Admin</h1>
                  <p className="text-sm text-gray-600">Create and manage Maffdoku puzzles</p>
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
            {/* Basic Settings */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Puzzle Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter puzzle title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter puzzle description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={form.difficulty}
                      onChange={(e) => setForm({ ...form, difficulty: e.target.value as DifficultyLevel })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value={DifficultyLevel.EASY}>Easy</option>
                      <option value={DifficultyLevel.MEDIUM}>Medium</option>
                      <option value={DifficultyLevel.HARD}>Hard</option>
                      <option value={DifficultyLevel.EXPERT}>Expert</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grid Size
                    </label>
                    <select
                      value={form.size}
                      onChange={(e) => setForm({ ...form, size: Number(e.target.value) as 3 | 4 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value={3}>3x3</option>
                      <option value={4}>4x4</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Limit (seconds)
                    </label>
                    <input
                      type="number"
                      value={form.timeLimit || ''}
                      onChange={(e) => setForm({ ...form, timeLimit: Number(e.target.value) || undefined })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Points
                    </label>
                    <input
                      type="number"
                      value={form.points}
                      onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <button
                  onClick={generateRandomPuzzle}
                  disabled={isGenerating}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span>Generate Random Puzzle</span>
                </button>
              </div>
            </div>

            {/* Constraint Visibility Controls */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Constraint Visibility</h2>
              <p className="text-sm text-gray-600 mb-4">
                Toggle which constraints are visible to players. Fewer visible constraints = higher difficulty.
              </p>
              
              <div className="space-y-3">
                {/* Column Sums */}
                <div>
                  <h3 className="text-sm font-medium text-blue-800 mb-2">Column Sums (Top)</h3>
                  <div className="flex space-x-1">
                    {Array.from({ length: form.size }).map((_, index) => (
                      <button
                        key={`col-sum-${index}`}
                        onClick={() => toggleConstraintVisibility('columnSums', index)}
                        className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                          puzzleData.visibility.columnSums[index]
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                        title={`Column ${index + 1} sum: ${puzzleData.constraints.columnSums[index] || '?'}`}
                      >
                        {puzzleData.visibility.columnSums[index] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row Sums */}
                <div>
                  <h3 className="text-sm font-medium text-green-800 mb-2">Row Sums (Left)</h3>
                  <div className="flex space-x-1">
                    {Array.from({ length: form.size }).map((_, index) => (
                      <button
                        key={`row-sum-${index}`}
                        onClick={() => toggleConstraintVisibility('rowSums', index)}
                        className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                          puzzleData.visibility.rowSums[index]
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                        title={`Row ${index + 1} sum: ${puzzleData.constraints.rowSums[index] || '?'}`}
                      >
                        {puzzleData.visibility.rowSums[index] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Column Products */}
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 mb-2">Column Products (Bottom)</h3>
                  <div className="flex space-x-1">
                    {Array.from({ length: form.size }).map((_, index) => (
                      <button
                        key={`col-prod-${index}`}
                        onClick={() => toggleConstraintVisibility('columnProducts', index)}
                        className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                          puzzleData.visibility.columnProducts[index]
                            ? 'bg-yellow-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                        title={`Column ${index + 1} product: ${puzzleData.constraints.columnProducts[index] || '?'}`}
                      >
                        {puzzleData.visibility.columnProducts[index] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row Products */}
                <div>
                  <h3 className="text-sm font-medium text-red-800 mb-2">Row Products (Right)</h3>
                  <div className="flex space-x-1">
                    {Array.from({ length: form.size }).map((_, index) => (
                      <button
                        key={`row-prod-${index}`}
                        onClick={() => toggleConstraintVisibility('rowProducts', index)}
                        className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                          puzzleData.visibility.rowProducts[index]
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                        title={`Row ${index + 1} product: ${puzzleData.constraints.rowProducts[index] || '?'}`}
                      >
                        {puzzleData.visibility.rowProducts[index] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Puzzle Grid */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Puzzle Grid</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={savePuzzle}
                    disabled={isSaving}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
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

              {/* Grid Display with Outer Constraints */}
              <div className="flex justify-center">
                <div className="p-4 bg-gray-100 rounded-lg">
                  <div 
                    className="grid gap-1"
                    style={{ 
                      gridTemplateColumns: `repeat(${form.size + 2}, 1fr)`,
                      width: 'fit-content'
                    }}
                  >
                    {/* First row: empty corner + column sums + empty corner */}
                    <div className="w-12 h-12 border border-gray-300 bg-gray-200"></div>
                    {Array.from({ length: form.size }).map((_, col) => (
                      <div 
                        key={`sum-col-${col}`} 
                        className={`w-12 h-12 border border-gray-300 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors ${
                          puzzleData.visibility.columnSums[col] 
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                            : 'bg-gray-300 text-gray-500 hover:bg-gray-400'
                        }`}
                        onClick={() => toggleConstraintVisibility('columnSums', col)}
                        title={`Click to ${puzzleData.visibility.columnSums[col] ? 'hide' : 'show'} column ${col + 1} sum`}
                      >
                        {puzzleData.visibility.columnSums[col] ? (puzzleData.constraints.columnSums[col] || '?') : '·'}
                      </div>
                    ))}
                    <div className="w-12 h-12 border border-gray-300 bg-gray-200"></div>

                    {/* Middle rows: row sum + puzzle cells + row product */}
                    {Array.from({ length: form.size }).map((_, row) => [
                      <div 
                        key={`sum-row-${row}`} 
                        className={`w-12 h-12 border border-gray-300 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors ${
                          puzzleData.visibility.rowSums[row] 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-300 text-gray-500 hover:bg-gray-400'
                        }`}
                        onClick={() => toggleConstraintVisibility('rowSums', row)}
                        title={`Click to ${puzzleData.visibility.rowSums[row] ? 'hide' : 'show'} row ${row + 1} sum`}
                      >
                        {puzzleData.visibility.rowSums[row] ? (puzzleData.constraints.rowSums[row] || '?') : '·'}
                      </div>,
                      ...Array.from({ length: form.size }).map((_, col) => {
                        return (
                          <div
                            key={`cell-${row}-${col}`}
                            onClick={() => handleCellValueChange(row, col)}
                            className="w-12 h-12 border-2 border-gray-300 bg-white cursor-pointer flex items-center justify-center text-sm font-medium hover:bg-gray-50 transition-colors"
                            title={`Click to cycle through numbers (current: ${solutionGrid[row]?.[col] || 'empty'})`}
                          >
                            {solutionGrid[row] && solutionGrid[row][col] ? (
                              <span className="text-blue-600 font-bold text-lg">{solutionGrid[row][col]}</span>
                            ) : (
                              <span className="text-gray-300 text-xs">·</span>
                            )}
                          </div>
                        )
                      }),
                      <div 
                        key={`prod-row-${row}`} 
                        className={`w-12 h-12 border border-gray-300 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors ${
                          puzzleData.visibility.rowProducts[row] 
                            ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                            : 'bg-gray-300 text-gray-500 hover:bg-gray-400'
                        }`}
                        onClick={() => toggleConstraintVisibility('rowProducts', row)}
                        title={`Click to ${puzzleData.visibility.rowProducts[row] ? 'hide' : 'show'} row ${row + 1} product`}
                      >
                        {puzzleData.visibility.rowProducts[row] ? (puzzleData.constraints.rowProducts[row] || '?') : '·'}
                      </div>
                    ])}

                    {/* Last row: empty corner + column products + empty corner */}
                    <div className="w-12 h-12 border border-gray-300 bg-gray-200"></div>
                    {Array.from({ length: form.size }).map((_, col) => (
                      <div 
                        key={`prod-col-${col}`} 
                        className={`w-12 h-12 border border-gray-300 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors ${
                          puzzleData.visibility.columnProducts[col] 
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                            : 'bg-gray-300 text-gray-500 hover:bg-gray-400'
                        }`}
                        onClick={() => toggleConstraintVisibility('columnProducts', col)}
                        title={`Click to ${puzzleData.visibility.columnProducts[col] ? 'hide' : 'show'} column ${col + 1} product`}
                      >
                        {puzzleData.visibility.columnProducts[col] ? (puzzleData.constraints.columnProducts[col] || '?') : '·'}
                      </div>
                    ))}
                    <div className="w-12 h-12 border border-gray-300 bg-gray-200"></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center text-sm text-gray-600">
                <div className="space-y-1">
                  <div><strong>Click center cells</strong> to cycle through numbers 1-{form.size === 3 ? 9 : 16}</div>
                  <div><strong>Click outer cells</strong> to toggle constraint visibility for difficulty control</div>
                  <div className="flex justify-center space-x-4 text-xs mt-2">
                    <span className="flex items-center"><div className="w-3 h-3 bg-blue-100 border mr-1"></div>Column Sums</span>
                    <span className="flex items-center"><div className="w-3 h-3 bg-green-100 border mr-1"></div>Row Sums</span>
                    <span className="flex items-center"><div className="w-3 h-3 bg-yellow-100 border mr-1"></div>Column Products</span>
                    <span className="flex items-center"><div className="w-3 h-3 bg-red-100 border mr-1"></div>Row Products</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 