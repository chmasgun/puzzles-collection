import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/mongodb'
import Puzzle from '@/models/Puzzle'
import UserProgress from '@/models/UserProgress'
import { authOptions } from '@/lib/auth'
import { DifficultyLevel, PuzzleType } from '@/types'

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
      type: PuzzleType.BRAINTEASERS,    
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
    console.error('Error fetching Brainteasers puzzles:', error)    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch puzzles' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      difficulty,
      data,
      solution,
      timeLimit,
      points,
      tags
    } = body

    console.log('PuzzleType enum values:', Object.values(PuzzleType))
    console.log('Using puzzle type:', PuzzleType.BRAINTEASERS)

    // Create new puzzle
    const puzzle = new Puzzle({
      title: title || 'Untitled Brain Teaser',
      description: description || '',
      type: PuzzleType.BRAINTEASERS,
      difficulty: difficulty || DifficultyLevel.MEDIUM,
      data,
      solution,
      timeLimit: timeLimit || 300,
      points: points || 100,
      tags: tags || [],
      createdBy: session.user.id,
      isActive: true
    })

    await puzzle.save()

    return NextResponse.json({
      success: true,
      data: { puzzleId: puzzle._id }
    })
  } catch (error) {
    console.error('Error creating Brainteasers puzzle:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create puzzle' },
      { status: 500 }
    )
  }
}