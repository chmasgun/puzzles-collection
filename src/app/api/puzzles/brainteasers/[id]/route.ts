import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/mongodb'
import Puzzle from '@/models/Puzzle'
import UserProgress from '@/models/UserProgress'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const puzzleId = params.id
    
    // Get puzzle
    const puzzle = await Puzzle.findById(puzzleId).lean()
    if (!puzzle) {
      return NextResponse.json(
        { success: false, error: 'Puzzle not found' },
        { status: 404 }
      )
    }

    // Get user session and progress
    const session = await getServerSession(authOptions)
    let userProgress = null
    
    if (session?.user?.id) {
      userProgress = await UserProgress.findOne({
        userId: session.user.id,
        puzzleId: puzzleId
      }).lean()
    }

    return NextResponse.json({
      success: true,
      data: {
        puzzle,
        userProgress
      }
    })
  } catch (error) {
    console.error('Error fetching brainteaser puzzle:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch puzzle' },
      { status: 500 }
    )
  }
}
