import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/mongodb'
import Puzzle from '@/models/Puzzle'
import UserProgress from '@/models/UserProgress'
import { authOptions } from '@/lib/auth'
import { PuzzleType, DifficultyLevel } from '@/types'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const { searchParams } = new URL(request.url)
    const difficulty = searchParams.get('difficulty') as DifficultyLevel
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Build query
    const query: any = {
      type: PuzzleType.MAFFDOKU,
      isActive: true
    }

    if (difficulty) {
      query.difficulty = difficulty
    }

    // Get puzzles
    const puzzles = await Puzzle.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Puzzle.countDocuments(query)

    // Get user session to include progress
    const session = await getServerSession(authOptions)
    let puzzlesWithProgress = puzzles

    if (session?.user?.id) {
      const userProgress = await UserProgress.find({
        userId: session.user.id,
        puzzleId: { $in: puzzles.map(p => p._id) }
      }).lean()

      const progressMap = new Map(
        userProgress.map(p => [p.puzzleId.toString(), p])
      )

      puzzlesWithProgress = puzzles.map(puzzle => ({
        ...puzzle,
        userProgress: progressMap.get((puzzle._id as any).toString()) || null
      }))
    }

    return NextResponse.json({
      success: true,
      data: {
        puzzles: puzzlesWithProgress,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error('Error fetching Maffdoku puzzles:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch puzzles' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, description, difficulty, data, solution, hints, timeLimit, points, tags } = body

    await dbConnect()

    const puzzle = await Puzzle.create({
      title,
      description,
      type: PuzzleType.MAFFDOKU,
      difficulty,
      data,
      solution,
      hints: hints || [],
      timeLimit,
      points: points || 100,
      tags: tags || [],
      isActive: true,
      createdBy: session.user.id
    })

    return NextResponse.json({
      success: true,
      data: puzzle,
      message: 'Maffdoku puzzle created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating Maffdoku puzzle:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create puzzle' },
      { status: 500 }
    )
  }
} 