import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/mongodb'
import UserProgress from '@/models/UserProgress'
import { authOptions } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const puzzleId = params.id
    const body = await request.json()
    const {
      currentState,
      timeSpent,
      isCompleted,
      score
    } = body

    // Find existing progress or create new
    let userProgress = await UserProgress.findOne({
      userId: session.user.id,
      puzzleId: puzzleId
    })

    const progressData = {
      userId: session.user.id,
      puzzleId: puzzleId,
      currentState: currentState || {},
      timeSpent: timeSpent || 0,
      isCompleted: isCompleted || false,
      score: score || 0,
      status: isCompleted ? 'completed' : 'in_progress',
      completedAt: isCompleted ? new Date() : undefined,
      attempts: userProgress ? userProgress.attempts + 1 : 1
    }

    if (userProgress) {
      // Update existing progress
      Object.assign(userProgress, progressData)
      await userProgress.save()
    } else {
      // Create new progress
      userProgress = new UserProgress(progressData)
      await userProgress.save()
    }

    return NextResponse.json({
      success: true,
      data: { userProgress }
    })
  } catch (error) {
    console.error('Error saving brainteaser progress:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save progress' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const puzzleId = params.id
    
    const userProgress = await UserProgress.findOne({
      userId: session.user.id,
      puzzleId: puzzleId
    }).lean()

    return NextResponse.json({
      success: true,
      data: { userProgress }
    })
  } catch (error) {
    console.error('Error fetching brainteaser progress:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch progress' },
      { status: 500 }
    )
  }
}
