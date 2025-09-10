import mongoose, { Schema } from 'mongoose'
import { IPuzzle, PuzzleType, DifficultyLevel } from '@/types'

const PuzzleSchema = new Schema<IPuzzle>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    required: [true, 'Puzzle type is required'],
    enum: Object.values(PuzzleType)
  },
  difficulty: {
    type: String,
    required: [true, 'Difficulty level is required'],
    enum: Object.values(DifficultyLevel)
  },
  data: {
    type: Schema.Types.Mixed,
    required: [true, 'Puzzle data is required']
  },
  solution: {
    type: Schema.Types.Mixed,
    required: [true, 'Solution data is required']
  },
  hints: [{
    type: String,
    trim: true
  }],
  timeLimit: {
    type: Number,
    min: [30, 'Time limit must be at least 30 seconds'],
    max: [3600, 'Time limit cannot exceed 1 hour']
  },
  maxAttempts: {
    type: Number,
    min: [1, 'Must allow at least 1 attempt'],
    max: [10, 'Cannot exceed 10 attempts']
  },
  points: {
    type: Number,
    required: [true, 'Points value is required'],
    min: [1, 'Points must be at least 1'],
    max: [1000, 'Points cannot exceed 1000']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: [true, 'Creator ID is required']
  }
}, {
  timestamps: true,
  collection: 'puzzle_games' // Custom collection name
})

// Indexes for better query performance
PuzzleSchema.index({ type: 1, difficulty: 1 })
PuzzleSchema.index({ isActive: 1 })
PuzzleSchema.index({ tags: 1 })
PuzzleSchema.index({ createdBy: 1 })
PuzzleSchema.index({ createdAt: -1 })

export default mongoose.models.Puzzle || mongoose.model<IPuzzle>('Puzzle', PuzzleSchema) 