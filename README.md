# Puzzle Collection - Brain Teaser Website

A comprehensive web application for brain teaser puzzles including Wordle variants, Sudoku, pattern matching, logic puzzles, and more. Built with Next.js, MongoDB Atlas, and TypeScript.

## Features

- 🧩 **Multiple Puzzle Types**: Wordle variants, Sudoku, pattern matching, logic puzzles, math challenges
- 🔐 **User Authentication**: Support for email/password, Google, and GitHub login
- 📊 **Progress Tracking**: Monitor solving streaks, scores, and improvement over time
- 🎯 **Difficulty Levels**: Easy, Medium, Hard, and Expert levels
- 📱 **Responsive Design**: Mobile-first approach with modern UI
- ⚡ **Server-Side Rendering**: Fast loading with Next.js App Router
- 🗄️ **MongoDB Integration**: Flexible JSON-based puzzle data storage

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, MongoDB Atlas, Mongoose
- **Authentication**: NextAuth.js with multiple providers
- **State Management**: TanStack Query (React Query)
- **Styling**: Tailwind CSS with custom design system
- **Icons**: Lucide React

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   └── puzzles/       # Puzzle-related APIs
│   ├── auth/              # Authentication pages
│   ├── puzzles/           # Puzzle game pages
│   └── admin/             # Admin panel
├── components/            # Reusable components
│   ├── ui/                # Base UI components
│   ├── puzzles/           # Puzzle-specific components
│   ├── layout/            # Layout components
│   └── providers/         # Context providers
├── lib/                   # Utilities and configurations
│   ├── mongodb.ts         # Database connection
│   └── auth.ts            # NextAuth configuration
├── models/                # MongoDB schemas
│   ├── User.ts            # User model
│   ├── Puzzle.ts          # Puzzle model
│   ├── UserProgress.ts    # Progress tracking
│   └── UserStats.ts       # User statistics
├── types/                 # TypeScript definitions
└── data/                  # Static puzzle data (JSON)
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- MongoDB Atlas account
- (Optional) Google/GitHub OAuth apps for social login

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd puzzles-collection
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # MongoDB Atlas Connection
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority

   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here-change-in-production

   # OAuth Providers (Optional)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret

   # JWT Secret for custom auth
   JWT_SECRET=your-jwt-secret-here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Database Schema

### User Model
```typescript
{
  email: string
  name: string
  image?: string
  provider: 'credentials' | 'google' | 'github'
  password?: string
  createdAt: Date
  updatedAt: Date
}
```

### Puzzle Model
```typescript
{
  title: string
  description: string
  type: PuzzleType
  difficulty: DifficultyLevel
  data: Record<string, any>  // JSON puzzle data
  solution: Record<string, any>
  hints?: string[]
  timeLimit?: number
  maxAttempts?: number
  points: number
  tags: string[]
  isActive: boolean
  createdBy: string
}
```

### User Progress Model
```typescript
{
  userId: string
  puzzleId: string
  status: 'not_started' | 'in_progress' | 'completed' | 'failed'
  currentState?: Record<string, any>
  attempts: number
  hintsUsed: number
  timeSpent: number
  score?: number
  completedAt?: Date
}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `GET/POST /api/auth/[...nextauth]` - NextAuth endpoints

### Puzzles
- `GET /api/puzzles` - Get all puzzles
- `GET /api/puzzles/[id]` - Get specific puzzle
- `POST /api/puzzles` - Create new puzzle (admin)
- `PUT /api/puzzles/[id]` - Update puzzle (admin)

### User Progress
- `GET /api/progress` - Get user progress
- `POST /api/progress` - Save puzzle progress
- `PUT /api/progress/[id]` - Update progress

## Puzzle Types

### 1. Wordle Variants
- Classic 5-letter word guessing
- Custom word lengths
- Theme-based words

### 2. Sudoku
- Classic 9x9 grids
- Different difficulty levels
- Hint system

### 3. Pattern Matching
- Sequence recognition
- Visual patterns
- Logic-based matching

### 4. Logic Puzzles
- Deduction challenges
- Grid-based logic
- Story-based puzzles

### 5. Math Puzzles
- Number sequences
- Mathematical operations
- Calculation challenges

## Development

### Adding New Puzzle Types

1. **Define puzzle type** in `src/types/index.ts`
2. **Create puzzle component** in `src/components/puzzles/`
3. **Add puzzle data structure** to database
4. **Implement game logic** and validation
5. **Add API endpoints** for puzzle management

### Styling Guidelines

- Use Tailwind CSS classes
- Follow the design system in `globals.css`
- Maintain responsive design principles
- Use CSS variables for theming

### Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build
npm run build
```

## Deployment

### MongoDB Atlas Setup
1. Create a MongoDB Atlas cluster
2. Set up database user and network access
3. Get connection string for environment variables

### Vercel Deployment (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
- Update `NEXTAUTH_URL` to your production domain
- Use strong, unique secrets for `NEXTAUTH_SECRET` and `JWT_SECRET`
- Configure OAuth app redirects for production domain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue on GitHub or contact the development team. 