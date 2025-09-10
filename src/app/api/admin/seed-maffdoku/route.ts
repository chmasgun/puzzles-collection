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
    console.error('Error in seed endpoint:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to seed puzzles' },
      { status: 500 }
    )
  }
} 