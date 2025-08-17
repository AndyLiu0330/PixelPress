# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The most import key: thinks hard, answer short
## Project Overview

PixelPress is a lightweight and easy-to-use image tool that supports compression and format conversion for various image types. Users can simply upload an image to quickly reduce its file size, saving storage space while maintaining clarity. It can also convert images to common formats such as JPEG, PNG, and WebP, making them convenient to use across different platforms and devices.

### Core Features
- Image compression with quality preservation
- Format conversion between JPEG, PNG, WebP, and other common formats
- File size optimization for storage efficiency
- Cross-platform compatibility

## Preferred Tech Stack

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **State Management**: Zustand (for simple state) or Context API
- **UI Components**: Shadcn/ui or Radix UI

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Image Processing**: Sharp (for server-side processing)
- **File Upload**: Multer

### Target Platform
- **Primary**: Web application (browser-based)
- **Secondary**: CLI tool (optional, for batch processing)
- The main focus is a web interface with drag-and-drop functionality

## Project Structure

```
PixelPress/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── utils/        # Utility functions
│   │   ├── styles/       # Global styles
│   │   └── App.tsx       # Main App component
│   ├── public/           # Static assets
│   └── package.json
├── server/                # Backend Node.js application
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Express middleware
│   │   ├── utils/        # Utility functions
│   │   └── index.ts      # Server entry point
│   └── package.json
├── shared/                # Shared types/interfaces
│   └── types/
└── package.json          # Root package.json for workspace
```

## Development Commands

```bash
# Root level (using npm workspaces)
npm install              # Install all dependencies
npm run dev             # Run both client and server in development
npm run build           # Build both client and server
npm run test            # Run all tests

# Client specific
cd client && npm run dev    # Run frontend only (port 5173)
cd client && npm run build  # Build frontend

# Server specific  
cd server && npm run dev    # Run backend only (port 3000)
cd server && npm run build  # Build backend
```

## Environment Variables

```bash
# Server (.env)
PORT=3000
NODE_ENV=development|production
UPLOAD_DIR=./temp/uploads
MAX_FILE_SIZE=52428800  # 50MB in bytes
CLEANUP_INTERVAL=3600000  # 1 hour in ms

# Client (.env)
VITE_API_URL=http://localhost:3000
```

## API Endpoints Structure

```
POST   /api/upload          # Upload image for processing
POST   /api/compress        # Compress uploaded image
POST   /api/convert         # Convert image format
GET    /api/download/:id    # Download processed image
DELETE /api/image/:id       # Delete uploaded/processed image
```

### Error Response Format
```json
{
  "error": true,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

### Success Response Format
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully"
}
```

## Technical Considerations

### Image Processing
- Maximum file size: 50MB per image
- Supported input formats: JPEG, PNG, WebP, GIF, BMP, TIFF
- Supported output formats: JPEG, PNG, WebP
- Use streaming for large files to optimize memory usage
- Implement queue system for batch processing

### Frontend
- Implement drag-and-drop zone for image upload
- Show real-time compression preview
- Display before/after file size comparison
- Support batch upload and processing
- Responsive design for mobile devices

### Backend
- Use temporary storage for processing (auto-cleanup after 1 hour)
- Implement rate limiting (10 requests per minute per IP)
- Add request validation middleware
- Use environment variables for configuration
- Implement proper error handling and logging

## Code Conventions

- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Use async/await over callbacks
- Implement proper error boundaries in React
- Use semantic HTML and ARIA labels for accessibility
- Write unit tests for utility functions
- Use environment variables for all configurations
- For every new feature or change, create a corresponding test file:
  - Place all test files in the /test folder, following the same relative structure as the source files
  - Before creating a new test file, check if a test file for that feature or module already exists; if it does, update it instead of creating a duplicate
  - All tests must follow the project's preferred testing framework and conventions
  - Tests should cover both expected behavior and edge cases