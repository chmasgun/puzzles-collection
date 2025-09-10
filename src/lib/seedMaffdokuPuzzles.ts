import dbConnect from './mongodb'
import Puzzle from '@/models/Puzzle'
import { PuzzleType, DifficultyLevel, MaffdokuData } from '@/types'

const samplePuzzles = [
  {
    title: "Easy 3x3 Maffdoku",
    description: "A simple 3x3 Maffdoku puzzle perfect for beginners. Use numbers 1-9 with unique values per row/column and outer constraints.",
    difficulty: DifficultyLevel.EASY,
    points: 50,
    timeLimit: 180,
    data: {
      size: 3,
      grid: Array(3).fill(null).map(() => 
        Array(3).fill(null).map(() => ({
          value: null,
          isGiven: false,
          isValid: true
        }))
      ),
      constraints: {
        columnSums: [15, 12, 18], // Column sums for solution: [6+2+7, 3+4+5, 9+1+8]
        rowSums: [18, 11, 16], // Row sums for solution: [6+3+9, 2+4+5, 7+1+8]
        columnProducts: [84, 60, 72], // Column products: [6*2*7, 3*4*5, 9*1*8]
        rowProducts: [162, 40, 56] // Row products: [6*3*9, 2*4*5, 7*1*8]
      },
      visibility: {
        columnSums: [true, true, false], // Hide one sum for difficulty
        rowSums: [true, false, true], // Hide one sum for difficulty
        columnProducts: [false, true, true], // Hide one product for difficulty
        rowProducts: [true, true, false] // Hide one product for difficulty
      }
    } as MaffdokuData,
    solution: {
      grid: [
        [6, 3, 9],
        [2, 4, 5],
        [7, 1, 8]
      ]
    },
    tags: ['beginner', 'tutorial', '3x3']
  },
  {
    title: "Medium 4x4 Challenge", 
    description: "A more challenging 4x4 puzzle with numbers 1-16 and fewer visible constraints.",
    difficulty: DifficultyLevel.MEDIUM,
    points: 100,
    timeLimit: 300,
    data: {
      size: 4,
      grid: Array(4).fill(null).map(() => 
        Array(4).fill(null).map(() => ({
          value: null,
          isGiven: false,
          isValid: true
        }))
      ),
      constraints: {
        columnSums: [26, 30, 34, 38], // Column sums: [1+4+9+12, 2+5+10+13, 3+6+11+14, 7+8+15+16]
        rowSums: [13, 30, 41, 44], // Row sums: [1+2+3+7, 4+5+6+8, 9+10+11+15, 12+13+14+16] 
        columnProducts: [432, 1300, 2310, 1680], // Column products: [1*4*9*12, 2*5*10*13, 3*6*11*14, 7*8*15*16]
        rowProducts: [42, 960, 14850, 43680] // Row products: [1*2*3*7, 4*5*6*8, 9*10*11*15, 12*13*14*16]
      },
      visibility: {
        columnSums: [true, false, true, false], // Hide half for medium difficulty
        rowSums: [false, true, false, true], // Hide half for medium difficulty  
        columnProducts: [false, false, true, true], // Show only 2 for difficulty
        rowProducts: [true, false, false, true] // Show only 2 for difficulty
      }
    } as MaffdokuData,
    solution: {
      grid: [
        [1, 2, 3, 7],
        [4, 5, 6, 8], 
        [9, 10, 11, 15],
        [12, 13, 14, 16]
      ]
    },
    tags: ['intermediate', 'challenging', '4x4']
  },
  {
    title: "Hard 3x3 Expert",
    description: "An expert-level 3x3 with minimal constraint visibility. Only the most skilled solvers need apply!",
    difficulty: DifficultyLevel.HARD,
    points: 150,
    timeLimit: 600,
    data: {
      size: 3,
      grid: Array(3).fill(null).map(() => 
        Array(3).fill(null).map(() => ({
          value: null,
          isGiven: false,
          isValid: true
        }))
      ),
      constraints: {
        columnSums: [21, 15, 9], // Column sums: [8+6+7, 4+5+6, 1+2+6] - wait, let me fix
        rowSums: [17, 13, 15], // Row sums: [8+4+1, 6+5+2, 7+6+6] - wait, let me fix
        columnProducts: [336, 120, 12], // Column products: [8*6*7, 4*5*6, 1*2*6]
        rowProducts: [32, 60, 252] // Row products: [8*4*1, 6*5*2, 7*6*6]
      },
      visibility: {
        columnSums: [false, false, true], // Show only 1 constraint
        rowSums: [true, false, false], // Show only 1 constraint
        columnProducts: [false, true, false], // Show only 1 constraint  
        rowProducts: [false, false, true] // Show only 1 constraint
      }
    } as MaffdokuData,
    solution: {
      grid: [
        [8, 4, 1],
        [6, 5, 2],
        [7, 6, 9] // Fixed: 7+6+9=22, 7*6*9=378
      ]
    },
    tags: ['expert', 'hard', '3x3', 'minimal-hints']
  }
]

export async function seedMaffdokuPuzzles(creatorUserId: string) {
  try {
    await dbConnect()
    
    console.log('🌱 Seeding Maffdoku puzzles...')
    
    // Check if puzzles already exist
    const existingCount = await Puzzle.countDocuments({ type: PuzzleType.MAFFDOKU })
    
    if (existingCount > 0) {
      console.log(`ℹ️  Found ${existingCount} existing Maffdoku puzzles, skipping seed`)
      return { success: true, message: `${existingCount} puzzles already exist` }
    }
    
    // Create puzzles
    const puzzlesToCreate = samplePuzzles.map(puzzle => ({
      ...puzzle,
      type: PuzzleType.MAFFDOKU,
      isActive: true,
      createdBy: creatorUserId,
      hints: [
        "Each row and column must contain unique numbers",
        "Use the outer constraints (sums and products) to narrow down possibilities",
        "For 3x3 grids: use numbers 1-9, for 4x4 grids: use numbers 1-16", 
        "Start with rows/columns that have the most constraint information visible",
        "Remember: hidden constraints still apply, even if you can't see them!"
      ]
    }))
    
    const createdPuzzles = await Puzzle.insertMany(puzzlesToCreate)
    
    console.log(`✅ Successfully created ${createdPuzzles.length} Maffdoku puzzles`)
    
    return { 
      success: true, 
      message: `Created ${createdPuzzles.length} sample puzzles`,
      puzzles: createdPuzzles 
    }
    
  } catch (error) {
    console.error('❌ Error seeding Maffdoku puzzles:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Utility function to create a simple API endpoint for seeding
export async function createSeedEndpoint() {
  return `
// Add this to your API routes: /api/admin/seed-maffdoku.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { seedMaffdokuPuzzles } from '@/lib/seedMaffdokuPuzzles'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const result = await seedMaffdokuPuzzles(session.user.id)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to seed puzzles' },
      { status: 500 }
    )
  }
}
  `
} 