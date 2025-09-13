import { Document } from 'mongoose'

// User related types
export interface IUser extends Document {
  _id: string
  email: string
  name: string
  image?: string
  provider: 'credentials' | 'google' | 'github'
  password?: string
  createdAt: Date
  updatedAt: Date
}

// Puzzle related types
export enum PuzzleType {
  WORDLE = 'wordle',
  SUDOKU = 'sudoku',
  MAFFDOKU = 'maffdoku',
  PATTERN_MATCHING = 'pattern_matching',
  LOGIC_PUZZLE = 'logic_puzzle',
  MATH_PUZZLE = 'math_puzzle'
}

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert'
}

// Maffdoku specific types
export interface MaffdokuCell {
  value: number | null
  isGiven: boolean
  isValid: boolean
  isStarterHint?: boolean // New field for starter hints
}

export interface MaffdokuConstraints {
  columnSums: number[] // First row shows sum of each column
  rowSums: number[] // First column shows sum of each row  
  columnProducts: number[] // Last row shows product of each column
  rowProducts: number[] // Last column shows product of each row
}

export interface MaffdokuVisibility {
  columnSums: boolean[] // Which column sums to show
  rowSums: boolean[] // Which row sums to show
  columnProducts: boolean[] // Which column products to show
  rowProducts: boolean[] // Which row products to show
}

export interface MaffdokuData {
  grid: MaffdokuCell[][]
  size: number // 3x3 or 4x4 (core grid, display will be size+2 x size+2)
  constraints: MaffdokuConstraints
  visibility: MaffdokuVisibility // Which constraints to show to players
}

export interface MaffdokuSolution {
  grid: number[][]
  validation: {
    isComplete: boolean
    errors: { row: number; col: number; message: string }[]
  }
}

export interface IPuzzle extends Document {
  _id: string
  title: string
  description: string
  type: PuzzleType
  difficulty: DifficultyLevel
  data: Record<string, any> // JSON data specific to puzzle type
  solution: Record<string, any> // Solution data
  hints?: string[]
  timeLimit?: number // in seconds
  maxAttempts?: number
  points: number
  tags: string[]
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// User progress and statistics
export interface IUserProgress extends Document {
  _id: string
  userId: string
  puzzleId: string
  status: 'not_started' | 'in_progress' | 'completed' | 'failed'
  currentState?: Record<string, any> // Current puzzle state
  attempts: number
  hintsUsed: number
  timeSpent: number // in seconds
  score?: number
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IUserStats extends Document {
  _id: string
  userId: string
  totalPuzzlesSolved: number
  totalScore: number
  averageTime: number
  currentStreak: number
  longestStreak: number
  puzzleTypeStats: {
    [key in PuzzleType]?: {
      solved: number
      totalAttempts: number
      averageTime: number
      bestScore: number
    }
  }
  difficultyStats: {
    [key in DifficultyLevel]?: {
      solved: number
      totalAttempts: number
    }
  }
  lastActivityDate: Date
  createdAt: Date
  updatedAt: Date
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Puzzle component props
export interface PuzzleComponentProps {
  puzzle: IPuzzle
  userProgress?: IUserProgress
  onComplete: (score: number, timeSpent: number) => void
  onSave: (currentState: Record<string, any>) => void
}

// Authentication types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials extends LoginCredentials {
  name: string
  confirmPassword: string
} 