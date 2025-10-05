import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/mongodb'
import Puzzle from '@/models/Puzzle'
import UserProgress from '@/models/UserProgress'
import { authOptions } from '@/lib/auth'
import { PuzzleType } from '@/types'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect()
    
    const puzzle = await Puzzle.findOne({
      _id: params.id,
      type: PuzzleType.MAFFDOKU,
      isActive: true
    }).lean()

    if (!puzzle) {
      return NextResponse.json(
        { success: false, error: 'Puzzle not found' },
        { status: 404 }
      )
    }

    // Get user session to include progress
    const session = await getServerSession(authOptions)
    let puzzleWithProgress = puzzle

    if (session?.user?.id) {
      const userProgress = await UserProgress.findOne({
        userId: session.user.id,
        puzzleId: params.id
      }).lean()

      puzzleWithProgress = {
        ...puzzle,
        userProgress: userProgress || null
      } as any
    }

    return NextResponse.json({
      success: true,
      data: puzzleWithProgress
    })

  } catch (error) {
    console.error('Error fetching Maffdoku puzzle:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch puzzle' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    await dbConnect()

    const puzzle = await Puzzle.findOneAndUpdate(
      {
        _id: params.id,
        type: PuzzleType.MAFFDOKU,
        createdBy: session.user.id // Only allow creator to update
      },
      body,
      { new: true, runValidators: true }
    )

    if (!puzzle) {
      return NextResponse.json(
        { success: false, error: 'Puzzle not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: puzzle,
      message: 'Puzzle updated successfully'
    })

  } catch (error) {
    console.error('Error updating Maffdoku puzzle:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update puzzle' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    await dbConnect()

    const puzzle = await Puzzle.findOneAndUpdate(
      {
        _id: params.id,
        type: PuzzleType.MAFFDOKU,
        createdBy: session.user.id
      },
      { isActive: false }, // Soft delete
      { new: true }
    )

    if (!puzzle) {
      return NextResponse.json(
        { success: false, error: 'Puzzle not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Puzzle deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting Maffdoku puzzle:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete puzzle' },
      { status: 500 }
    )
  }
} 