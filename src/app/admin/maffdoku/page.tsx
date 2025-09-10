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
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null)
  const [inputBuffer, setInputBuffer] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Initialize grid when size changes
  useEffect(() => {
    initializeGrid(form.size)
  }, [form.size])

  // Handle keyboard input for number entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return

      const { row, col } = selectedCell
      const maxNumber = form.size === 3 ? 9 : 16

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
          
          console.log(`Building number: buffer="${inputBuffer}" + key="${e.key}" = "${newBuffer}" (${num})`)
          
          if (form.size === 3) {
            // For 3x3: only allow 1-9, set immediately
            if (num >= 1 && num <= 9) {
              setCellValue(row, col, num)
              setInputBuffer('')
            } else {
              setError(`Invalid number ${num}. Use 1-9 for 3x3 puzzles.`)
              setInputBuffer('')
            }
          } else {
            // For 4x4: allow 1-16
                                        if (newBuffer.length === 1) {
                // First digit typed
                if (num >= 1 && num <= 9) {
                  // Could be complete (1-9) or start of 10-16
                  setInputBuffer(newBuffer) // Just store, don't set yet
                } else {
                  setError(`Invalid first digit ${e.key}. Start with 1-9.`)
                  setInputBuffer('')
                }
              } else if (newBuffer.length === 2) {
                // Second digit typed
                if (num >= 10 && num <= 16) {
                  // Valid double digit (10-16)
                  setCellValue(row, col, num)
                  setInputBuffer('')
                } else {
                  setError(`Invalid number ${num}. Use 1-16 for 4x4 puzzles.`)
                  setInputBuffer('')
                }
              } else {
              // Too many digits
              setError(`Too many digits. Use 1-16 for 4x4 puzzles.`)
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
          // Remove last character from buffer
          setInputBuffer(inputBuffer.slice(0, -1))
        } else {
          // Clear cell
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
      else if (e.key === 'ArrowDown' && row < form.size - 1) {
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
      else if (e.key === 'ArrowRight' && col < form.size - 1) {
        e.preventDefault()
        validatePendingInput()
        setSelectedCell({ row, col: col + 1 })
        setInputBuffer('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCell, form.size, inputBuffer])

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
    setSelectedCell(null)
  }

  const generateRandomPuzzle = () => {
    setIsGenerating(true)
    try {
      const size = form.size
      const newSolutionGrid = generateValidGrid(size)
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

    const generateValidGrid = (size: number): number[][] => {
    // For 3x3: use 9 unique numbers (1-9)
    // For 4x4: use 16 unique numbers (1-16)
    const totalCells = size * size
    const numbers = Array.from({ length: totalCells }, (_, i) => i + 1)
    
    // Shuffle the numbers randomly
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[numbers[i], numbers[j]] = [numbers[j], numbers[i]]
    }
    
    // Fill grid with shuffled unique numbers
    const grid = Array(size).fill(null).map(() => Array(size).fill(0))
    let index = 0
    
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        grid[row][col] = numbers[index]
        index++
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

  const setCellValue = (row: number, col: number, value: number) => {
    const maxNumber = form.size === 3 ? 9 : 16
    
    // Validate input range
    if (value !== 0 && (value < 1 || value > maxNumber)) {
      setError(`Invalid number ${value}. Use 1-${maxNumber} for ${form.size}x${form.size} puzzles.`)
      return
    }
    
    // Check if the number already exists in the grid (unless it's 0 or replacing the same cell)
    if (value !== 0) {
      let numberExists = false
      
      for (let r = 0; r < form.size; r++) {
        for (let c = 0; c < form.size; c++) {
          // Skip the current cell we're trying to update
          if (r === row && c === col) continue
          
          // Check if this exact value already exists elsewhere
          const existingValue = solutionGrid[r]?.[c]
          if (existingValue === value) {
            numberExists = true
            break
          }
        }
        if (numberExists) break
      }
      
      if (numberExists) {
        setError(`Number ${value} already exists in the grid. Each number can only appear once.`)
        return
      }
    }
    
    // Clear any previous errors
    setError('')
    
    const newSolutionGrid = [...solutionGrid]
    if (!newSolutionGrid[row]) {
      newSolutionGrid[row] = Array(form.size).fill(0)
    }
    newSolutionGrid[row][col] = value
    
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

  const handleCellClick = (row: number, col: number) => {
    // First, validate and set any pending input from the previous cell
    if (selectedCell && inputBuffer !== '') {
      const num = parseInt(inputBuffer)
      const maxNumber = form.size === 3 ? 9 : 16
      if (num >= 1 && num <= maxNumber) {
        setCellValue(selectedCell.row, selectedCell.col, num)
      }
    }
    
    // Then select the new cell
    setSelectedCell({ row, col })
    setInputBuffer('') // Clear input buffer when selecting new cell
  }

  const getUsedNumbers = (): Set<number> => {
    const used = new Set<number>()
    for (let r = 0; r < form.size; r++) {
      for (let c = 0; c < form.size; c++) {
        const value = solutionGrid[r]?.[c]
        if (value && value > 0) {
          used.add(value)
        }
      }
    }
    return used
  }

  const getAvailableNumbers = (): number[] => {
    const maxNumber = form.size === 3 ? 9 : 16
    const used = getUsedNumbers()
    const available = []
    for (let i = 1; i <= maxNumber; i++) {
      if (!used.has(i)) {
        available.push(i)
      }
    }
    return available
  }

  const validatePendingInput = () => {
    if (selectedCell && inputBuffer !== '') {
      const num = parseInt(inputBuffer)
      const maxNumber = form.size === 3 ? 9 : 16
      if (num >= 1 && num <= maxNumber) {
        setCellValue(selectedCell.row, selectedCell.col, num)
      }
      setInputBuffer('')
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

  const generatePuzzleHash = (grid: number[][], size: number, visibility: any): string => {
    // 1. Size identifier (3 or 4)
    let hash = size.toString()
    
    // 2. Grid numbers from top-left to bottom-right, left-padded
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const value = grid[row][col]
        hash += value.toString().padStart(2, '0')
      }
    }
    
    // 3. Visibility encoding in consistent order:
    // columnSums, columnProducts, rowSums, rowProducts
    const visibilityArrays = [
      visibility.columnSums,
      visibility.columnProducts, 
      visibility.rowSums,
      visibility.rowProducts
    ]
    
    for (const visArray of visibilityArrays) {
      hash += visArray.map((visible: boolean) => visible ? '1' : '0').join('')
    }
    
    return hash
  }

  const decodePuzzleHash = (hash: string) => {
    const size = parseInt(hash[0])
    
    // Calculate where grid numbers end (size * size * 2 digits + 1 for size)
    const gridNumbersLength = size * size * 2
    const gridNumbers = hash.substring(1, 1 + gridNumbersLength)
    
    // Parse grid numbers (each is 2 digits)
    const numbers = []
    for (let i = 0; i < gridNumbers.length; i += 2) {
      numbers.push(parseInt(gridNumbers.substring(i, i + 2)))
    }
    
    // Parse visibility flags (4 sections of 'size' digits each)
    const visibilityStart = 1 + gridNumbersLength
    const columnSums = hash.substring(visibilityStart, visibilityStart + size).split('').map(c => c === '1')
    const columnProducts = hash.substring(visibilityStart + size, visibilityStart + size * 2).split('').map(c => c === '1')
    const rowSums = hash.substring(visibilityStart + size * 2, visibilityStart + size * 3).split('').map(c => c === '1')
    const rowProducts = hash.substring(visibilityStart + size * 3, visibilityStart + size * 4).split('').map(c => c === '1')
    
    return {
      size,
      gridNumbers: numbers,
      visibility: {
        columnSums,
        columnProducts,
        rowSums,
        rowProducts
      }
    }
  }

  const savePuzzle = async () => {
    if (!solutionGrid.every(row => row.every(val => val > 0))) {
      setError('Please complete the solution grid')
      return
    }

    setIsSaving(true)
    try {
      // Generate unique hash for this puzzle configuration
      const puzzleHash = generatePuzzleHash(solutionGrid, form.size, puzzleData.visibility)
      
      // First, get existing puzzles to check for duplicates and get next ID
      const existingResponse = await fetch('/api/puzzles/maffdoku')
      const existingData = await existingResponse.json()
      console.log('Existing puzzles response:', existingData)
      
      // Check if this exact puzzle already exists
      const puzzles = existingData.success ? (existingData.data?.puzzles || existingData.puzzles || []) : []
      
      if (puzzles.length > 0) {
        const existingHashes = puzzles.map((p: any) => {
          // Try to extract hash from tags or generate from existing data
          const hashTag = p.tags?.find((tag: string) => tag.startsWith('hash:'))
          return hashTag ? hashTag.substring(5) : null
        }).filter(Boolean)
        
        if (existingHashes.includes(puzzleHash)) {
          setError('This exact puzzle configuration already exists! Try changing the grid numbers or constraint visibility.')
          setIsSaving(false)
          return
        }
      }
      
      let nextId = 1
      if (puzzles.length > 0) {
        // Find the maximum ID and increment
        const maxId = Math.max(...puzzles.map((p: any) => {
          const match = p.title?.match(/Maffdoku #(\d+)/)
          return match ? parseInt(match[1]) : 0
        }))
        nextId = maxId + 1
      }

      // Generate title and description based on ID and properties
      const title = `Maffdoku #${nextId}`
      const description = `${form.size}x${form.size} ${form.difficulty.toLowerCase()} puzzle with ${form.points} points`

      const response = await fetch('/api/puzzles/maffdoku', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          difficulty: form.difficulty,
          data: puzzleData,
          solution: { grid: solutionGrid },
          timeLimit: form.timeLimit,
          points: form.points,
          tags: [...form.tags, `hash:${puzzleHash}`]
        })
      })

      const data = await response.json()
      console.log('API Response:', { status: response.status, data })

      if (data.success) {
        setSuccess(`Puzzle saved successfully as "${title}"!`)
        // Reset form
        setForm({
          difficulty: DifficultyLevel.EASY,
          size: 3,
          timeLimit: 300,
          points: 100,
          tags: []
        })
        initializeGrid(3)
      } else {
        console.error('Save failed:', data)
        setError(data.error || data.message || 'Failed to save puzzle')
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Auto-generated:</strong> Title and description will be automatically created based on puzzle ID and settings.
                  </p>
                </div>

                {solutionGrid.every(row => row.every(val => val > 0)) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-green-800 mb-1">
                      <strong>Puzzle Hash:</strong>
                    </p>
                    <code className="text-xs font-mono bg-green-100 px-2 py-1 rounded">
                      {generatePuzzleHash(solutionGrid, form.size, puzzleData.visibility)}
                    </code>
                    <p className="text-xs text-green-600 mt-1">
                      This unique hash prevents duplicate puzzles and encodes all puzzle data.
                    </p>
                  </div>
                )}

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

            {/* Available Numbers */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Numbers</h2>
              <p className="text-sm text-gray-600 mb-3">
                Numbers that haven't been used yet. Each number can only appear once.
              </p>
              <div className={`grid gap-1 mb-4 ${form.size === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                {Array.from({ length: form.size === 3 ? 9 : 16 }, (_, i) => i + 1).map(num => {
                  const isUsed = getUsedNumbers().has(num)
                  return (
                    <div
                      key={num}
                      className={`${form.size === 3 ? 'w-10 h-10' : 'w-9 h-9'} flex items-center justify-center text-xs font-medium rounded border ${
                        isUsed 
                          ? 'bg-gray-200 text-gray-400 border-gray-300 line-through' 
                          : 'bg-green-100 text-green-800 border-green-300'
                      }`}
                    >
                      {num}
                    </div>
                  )
                })}
              </div>
              {form.size === 4 && (
                <div className="text-xs text-gray-500 mt-2">
                  <strong>Tip:</strong> For numbers 10-16, use keys a=10, b=11, c=12, d=13, e=14, f=15, g=16
                </div>
              )}
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
                        onClick={() => {
                          validatePendingInput()
                          setSelectedCell(null)
                          toggleConstraintVisibility('columnSums', col)
                        }}
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
                        onClick={() => {
                          validatePendingInput()
                          setSelectedCell(null)
                          toggleConstraintVisibility('rowSums', row)
                        }}
                        title={`Click to ${puzzleData.visibility.rowSums[row] ? 'hide' : 'show'} row ${row + 1} sum`}
                      >
                        {puzzleData.visibility.rowSums[row] ? (puzzleData.constraints.rowSums[row] || '?') : '·'}
                      </div>,
                      ...Array.from({ length: form.size }).map((_, col) => {
                        const isSelected = selectedCell?.row === row && selectedCell?.col === col
                        const hasValue = solutionGrid[row] && solutionGrid[row][col]
                        const showBuffer = isSelected && inputBuffer !== '' && !hasValue
                        
                        return (
                          <div
                            key={`cell-${row}-${col}`}
                            onClick={() => handleCellClick(row, col)}
                            className={`w-12 h-12 border-2 cursor-pointer flex items-center justify-center text-sm font-medium hover:bg-gray-50 transition-colors ${
                              isSelected 
                                ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' 
                                : 'border-gray-300 bg-white'
                            }`}
                            title={`Click to select, then type numbers 1-${form.size === 3 ? 9 : 16} or 0 to clear`}
                          >
                            {hasValue ? (
                              <span className="text-blue-600 font-bold text-lg">{solutionGrid[row][col]}</span>
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
                        className={`w-12 h-12 border border-gray-300 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors ${
                          puzzleData.visibility.rowProducts[row] 
                            ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                            : 'bg-gray-300 text-gray-500 hover:bg-gray-400'
                        }`}
                        onClick={() => {
                          validatePendingInput()
                          setSelectedCell(null)
                          toggleConstraintVisibility('rowProducts', row)
                        }}
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
                        onClick={() => {
                          validatePendingInput()
                          setSelectedCell(null)
                          toggleConstraintVisibility('columnProducts', col)
                        }}
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
                  <div><strong>Click center cells</strong> to select, then <strong>type numbers 1-{form.size === 3 ? 9 : 16}</strong> (each number only once!)</div>
                  <div><strong>Multi-digit:</strong> Type digits sequentially (e.g., "1" then "2" for "12") • <strong>Click elsewhere</strong> to confirm</div>
                  <div><strong>Arrow keys</strong> navigate • <strong>0</strong> or <strong>Backspace</strong> clears • <strong>Click outer cells</strong> to toggle visibility</div>
                  <div className="flex justify-center space-x-4 text-xs mt-2">
                    <span className="flex items-center"><div className="w-3 h-3 bg-blue-100 border mr-1"></div>Column Sums</span>
                    <span className="flex items-center"><div className="w-3 h-3 bg-green-100 border mr-1"></div>Row Sums</span>
                    <span className="flex items-center"><div className="w-3 h-3 bg-yellow-100 border mr-1"></div>Column Products</span>
                    <span className="flex items-center"><div className="w-3 h-3 bg-red-100 border mr-1"></div>Row Products</span>
                  </div>
                  {selectedCell && (
                    <div className="mt-2 text-xs text-purple-600 font-medium">
                      Selected: Row {selectedCell.row + 1}, Column {selectedCell.col + 1} • Available: {getAvailableNumbers().length} numbers
                      {inputBuffer && <span className="ml-2 font-bold">Typing: {inputBuffer}_</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 