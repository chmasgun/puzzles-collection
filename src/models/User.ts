import mongoose, { Schema } from 'mongoose'
import { IUser } from '@/types'

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  image: {
    type: String,
    default: null
  },
  provider: {
    type: String,
    enum: ['credentials', 'google', 'github'],
    default: 'credentials'
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  }
}, {
  timestamps: true,
  collection: 'puzzle_users', // Custom collection name
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password
      return ret
    }
  }
})

// Index for better query performance
UserSchema.index({ email: 1 })
UserSchema.index({ provider: 1 })

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema) 