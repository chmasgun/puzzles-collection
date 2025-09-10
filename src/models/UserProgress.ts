import mongoose, { Schema } from 'mongoose'
import { IUserProgress } from '@/types'

const UserProgressSchema = new Schema<IUserProgress>({
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    ref: 'User'
  },
  puzzleId: {
    type: String,
    required: [true, 'Puzzle ID is required'],
    ref: 'Puzzle'
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['not_started', 'in_progress', 'completed', 'failed'],
    default: 'not_started'
  },
  currentState: {
    type: Schema.Types.Mixed,
    default: null
  },
  attempts: {
    type: Number,
    default: 0,
    min: [0, 'Attempts cannot be negative']
  },
  hintsUsed: {
    type: Number,
    default: 0,
    min: [0, 'Hints used cannot be negative']
  },
  timeSpent: {
    type: Number,
    default: 0,
    min: [0, 'Time spent cannot be negative']
  },
  score: {
    type: Number,
    min: [0, 'Score cannot be negative']
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'puzzle_user_progress' // Custom collection name
})

// Compound index for unique user-puzzle combination
UserProgressSchema.index({ userId: 1, puzzleId: 1 }, { unique: true })
UserProgressSchema.index({ userId: 1, status: 1 })
UserProgressSchema.index({ puzzleId: 1 })
UserProgressSchema.index({ completedAt: -1 })

export default mongoose.models.UserProgress || mongoose.model<IUserProgress>('UserProgress', UserProgressSchema) 