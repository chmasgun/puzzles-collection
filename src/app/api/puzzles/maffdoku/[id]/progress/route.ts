import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/mongodb'
import UserProgress from '@/models/UserProgress'
import Puzzle from '@/models/Puzzle'
import { authOptions } from '@/lib/auth'
import { PuzzleType, MaffdokuData, MaffdokuSolution } from '@/types'

interface RouteParams {
  params: {
    id: string
  }
}

// Validate Maffdoku solution
function validateMaffdokuSolution(data: MaffdokuData, userGrid: number[][]): MaffdokuSolution {
  const errors: { row: number; col: number; message: string }[] = []
  const size = data.size
  let isComplete = true

  // Check if all cells are filled
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!userGrid[row] || userGrid[row][col] === null || userGrid[row][col] === 0) {
        isComplete = false
      }
    }
  }

  if (!isComplete) {
    return {
      grid: userGrid,
      validation: { isComplete: false, errors }
    }
  }

  const maxNumber = size === 3 ? 9 : 16 // 1-9 for 3x3, 1-16 for 4x4

  // Check rows - no duplicates and must use numbers 1 to maxNumber
  for (let row = 0; row < size; row++) {
    const seen = new Set<number>()
    for (let col = 0; col < size; col++) {
      const value = userGrid[row][col]
      if (value && (value < 1 || value > maxNumber)) {
        errors.push({ row, col, message: `Invalid number ${value}, must be between 1 and ${maxNumber}` })
      } else if (value && seen.has(value)) {
        errors.push({ row, col, message: `Duplicate ${value} in row ${row + 1}` })
      } else if (value) {
        seen.add(value)
      }
    }
  }

  // Check columns - no duplicates and must use numbers 1 to maxNumber
  for (let col = 0; col < size; col++) {
    const seen = new Set<number>()
    for (let row = 0; row < size; row++) {
      const value = userGrid[row][col]
      if (value && seen.has(value)) {
        errors.push({ row, col, message: `Duplicate ${value} in column ${col + 1}` })
      } else if (value) {
        seen.add(value)
      }
    }
  }

  // Validate sum and product constraints
  if (isComplete) {
    // Check column sums (first row constraint)
    for (let col = 0; col < size; col++) {
      const actualSum = userGrid.reduce((sum, row) => sum + row[col], 0)
      const expectedSum = data.constraints.columnSums[col]
      if (actualSum !== expectedSum) {
        errors.push({ 
          row: 0, 
          col, 
          message: `Column ${col + 1} sum is ${actualSum}, expected ${expectedSum}` 
        })
      }
    }

    // Check row sums (first column constraint)
    for (let row = 0; row < size; row++) {
      const actualSum = userGrid[row].reduce((sum, val) => sum + val, 0)
      const expectedSum = data.constraints.rowSums[row]
      if (actualSum !== expectedSum) {
        errors.push({ 
          row, 
          col: 0, 
          message: `Row ${row + 1} sum is ${actualSum}, expected ${expectedSum}` 
        })
      }
    }

    // Check column products (last row constraint)
    for (let col = 0; col < size; col++) {
      const actualProduct = userGrid.reduce((prod, row) => prod * row[col], 1)
      const expectedProduct = data.constraints.columnProducts[col]
      if (actualProduct !== expectedProduct) {
        errors.push({ 
          row: size - 1, 
          col, 
          message: `Column ${col + 1} product is ${actualProduct}, expected ${expectedProduct}` 
        })
      }
    }

    // Check row products (last column constraint)
    for (let row = 0; row < size; row++) {
      const actualProduct = userGrid[row].reduce((prod, val) => prod * val, 1)
      const expectedProduct = data.constraints.rowProducts[row]
      if (actualProduct !== expectedProduct) {
        errors.push({ 
          row, 
          col: size - 1, 
          message: `Row ${row + 1} product is ${actualProduct}, expected ${expectedProduct}` 
        })
      }
    }
  }

  // No cage validation needed - constraints are handled above

  return {
    grid: userGrid,
    validation: {
      isComplete: errors.length === 0,
      errors
    }
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { currentState, timeSpent, hintsUsed } = body

    await dbConnect()

    // Verify puzzle exists and is Maffdoku
    const puzzle = await Puzzle.findOne({
      _id: params.id,
      type: PuzzleType.MAFFDOKU,
      isActive: true
    })

    if (!puzzle) {
      return NextResponse.json(
        { success: false, error: 'Puzzle not found' },
        { status: 404 }
      )
    }

    // Validate the current solution
    const validation = validateMaffdokuSolution(puzzle.data as MaffdokuData, currentState.grid)
    const isCompleted = validation.validation.isComplete

    // Calculate score based on completion, time, and hints used
    let score = 0
    if (isCompleted) {
      const baseScore = puzzle.points || 100
      const timeBonus = Math.max(0, baseScore * 0.5 - (timeSpent / 60) * 5) // Bonus for speed
      const hintPenalty = (hintsUsed || 0) * 10 // Penalty for hints
      score = Math.max(10, Math.round(baseScore + timeBonus - hintPenalty))
    }

    // Update or create progress
    const progress = await UserProgress.findOneAndUpdate(
      {
        userId: session.user.id,
        puzzleId: params.id
      },
      {
        status: isCompleted ? 'completed' : 'in_progress',
        currentState: {
          ...currentState,
          validation: validation.validation
        },
        timeSpent: timeSpent || 0,
        hintsUsed: hintsUsed || 0,
        score: isCompleted ? score : undefined,
        completedAt: isCompleted ? new Date() : undefined,
        $inc: { attempts: 1 }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        progress,
        validation: validation.validation,
        isCompleted,
        score: isCompleted ? score : undefined
      },
      message: isCompleted ? 'Puzzle completed successfully!' : 'Progress saved'
    })

  } catch (error) {
    console.error('Error saving Maffdoku progress:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save progress' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    await dbConnect()

    const progress = await UserProgress.findOne({
      userId: session.user.id,
      puzzleId: params.id
    }).lean()

    return NextResponse.json({
      success: true,
      data: progress
    })

  } catch (error) {
    console.error('Error fetching Maffdoku progress:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch progress' },
      { status: 500 }
    )
  }
} 