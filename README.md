# Chronify - Intelligent Offline-First Task Management System

[![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-green.svg)](https://mongodb.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple.svg)](https://web.dev/progressive-web-apps/)
[![Firebase](https://img.shields.io/badge/Auth-Firebase-orange.svg)](https://firebase.google.com/)

> **A powerful, offline-first Progressive Web App for task and reminder management with AI-powered features and seamless synchronization.**

---

## Overview

Chronify is an intelligent task management system designed specifically for users in areas with unreliable internet connectivity. It provides a complete offline-first experience with automatic synchronization, AI-powered task creation, and integrated calendar management.

### Key Highlights

- **Offline-First Architecture**: Works completely offline with automatic sync when online
- **AI-Powered**: Intelligent task creation from emails and natural language
- **Progressive Web App**: Installable, responsive, with native app-like experience  
- **Secure Authentication**: Firebase-based authentication with Google OAuth
- **Advanced Analytics**: Task completion tracking and productivity insights
- **Smart Organization**: Folder-based task categorization
- **Real-time Sync**: Conflict resolution and multi-device synchronization

---

## Future Roadmap

### Current Implementation
- **Core task management**: Complete CRUD operations for tasks with full offline capability, including creation, editing, deletion, and status management with persistent local storage
- **Offline-first architecture**: Comprehensive offline functionality using IndexedDB and localStorage with intelligent sync queuing and conflict resolution mechanisms
- **Firebase authentication**: Secure user authentication system with Google OAuth integration and token-based API security for all server communications
- **PWA implementation**: Full Progressive Web App capabilities including service worker caching, installable app experience, and native-like performance across devices

### Next Phase Development
- **Real-time collaboration**: Multi-user workspace functionality allowing team members to collaborate on shared task lists with live updates, comments, and activity feeds
- **Advanced AI features**: Enhanced artificial intelligence capabilities including natural language task parsing, smart deadline suggestions, priority recommendations, and automated task categorization based on content analysis
- **Voice-based AI Assistant**: Integrated voice control system for hands-free task management, allowing users to create, update, and query tasks using natural speech commands
- **Calendar integration**: Deep integration with Google Calendar, Outlook, and other calendar systems for seamless scheduling, meeting detection, and deadline synchronization
- **Push notifications**: Comprehensive notification system with customizable alerts for due dates, reminders, team updates, and productivity insights delivered across all user devices

### Future Expansion
- **Mobile apps (React Native)**: Native mobile applications for iOS and Android platforms providing enhanced mobile experience with device-specific features like location-based reminders and camera integration
- **Team workspaces**: Enterprise-level collaboration features including role-based permissions, department organization, project templates, and advanced reporting for team productivity analysis
- **Advanced analytics**: Comprehensive productivity tracking with detailed insights, performance metrics, time tracking, goal setting, and personalized recommendations for workflow optimization
- **Third-party integrations**: Extensive API ecosystem connecting with popular productivity tools like Slack, Microsoft Teams, Jira, Trello, GitHub, and other workflow management platforms

---

## Tech Stack

### Frontend
- **Framework**: React 19.1.1 with Hooks & Context API
- **Build Tool**: Vite 7.1.7 for fast development and optimized builds
- **Styling**: Tailwind CSS 4.1.13 for utility-first styling
- **Animations**: Framer Motion 12.23.24 for smooth interactions
- **Routing**: React Router DOM 6.14.1 for client-side routing
- **PWA**: Service Worker, Web App Manifest, offline caching
- **Storage**: IndexedDB via custom OfflineStorage service

### Backend
- **Runtime**: Node.js with Express.js 5.1.0
- **Database**: MongoDB 6.20.0 with Mongoose 8.18.1 ODM
- **Authentication**: Firebase Admin SDK for token verification
- **External APIs**: 
  - Google APIs 164.1.0 (Calendar, Gmail integration)
  - AI services for task generation
- **Scheduling**: Node-cron 4.2.1 for background tasks
- **CORS**: Configured for cross-origin requests

### Infrastructure & Services
- **Authentication**: Firebase Authentication with Google OAuth
- **Database**: MongoDB Atlas (cloud) or local MongoDB
- **AI Integration**: Gemini API for intelligent task processing
- **Email Integration**: Gmail API for parsing meeting invitations
- **Deployment**: Node.js server with static file serving

---

## Features

### Core Task Management
- **Task CRUD Operations**: Create, read, update, delete tasks
- **Folder Organization**: Organize tasks into custom folders
- **Priority Levels**: High, Medium, Low priority assignments
- **Due Date Management**: Set and track task deadlines
- **Status Toggle**: Modern ON/OFF toggle for task completion

### Offline-First Capabilities
- **Complete Offline Functionality**: All operations work without internet
- **Progressive Web App**: Installable with native app experience
- **Automatic Synchronization**: Smart sync when connection is restored
- **Conflict Resolution**: Handles simultaneous edits across devices
- **Sync Status Tracking**: Visual indicators for sync status

### AI-Powered Features
- **Intelligent Task Creation**: AI generates tasks from natural language
- **Email Integration**: Automatically creates tasks from Gmail
- **Meeting Detection**: Parses meeting invitations into calendar tasks
- **Smart Categorization**: AI suggests appropriate folders and priorities

### User Experience
- **Modern UI/UX**: Clean, intuitive interface with smooth animations
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Loading States**: Smooth loading indicators and skeleton screens
- **Search Functionality**: Find tasks quickly across all folders
- **Dashboard Analytics**: Visual insights into productivity

### Security & Authentication
- **Firebase Authentication**: Secure user authentication
- **Google OAuth**: Sign in with Google account
- **User Profiles**: Personalized user management
- **Token-based API Security**: JWT token verification

---

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Firebase project with Authentication enabled
- Google Cloud Console project (for Gmail/Calendar APIs)

### 1. Clone Repository
```bash
git clone https://github.com/parthnarkar/chronify.git
cd chronify
```

### 2. Backend Setup
```bash
cd server
npm install

# Create .env file
cp .env.example .env
# Edit .env with your configuration
```

### 3. Frontend Setup
```bash
cd ../client
npm install

# Create .env file
cp .env.example .env
# Edit .env with your Firebase configuration
```

### 4. Database Setup
```bash
# Start MongoDB locally or use MongoDB Atlas
# The app will automatically create required collections
```

### 5. Start Development Servers
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend  
cd client
npm run dev
```

### 6. Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

---

## Configuration Guide

### Environment Variables

#### Backend (.env)
```env
# Database
MONGODB_URI=mongodb://localhost:27017/chronify
# or MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/chronify

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Google APIs
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# AI Services
GEMINI_API_KEY=your-gemini-api-key

# Server
PORT=3000
NODE_ENV=development
```

#### Frontend (.env)
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# API Configuration
VITE_API_BASE_URL=http://localhost:3000
```

### Firebase Setup
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Google provider
3. Generate service account key for Admin SDK
4. Add your domain to authorized domains

### Google APIs Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Gmail API and Google Calendar API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs

---

## API Documentation

### Authentication
All API endpoints require Firebase authentication token in headers:
```javascript
headers: {
  'X-Client-Uid': 'firebase-user-uid',
  'Authorization': 'Bearer firebase-id-token'
}
```

### Task Endpoints

#### GET /api/tasks
Get all tasks for authenticated user
```javascript
// Response
{
  "tasks": [
    {
      "_id": "64f5a1b2c3d4e5f6a7b8c9d0",
      "title": "Complete project documentation",
      "description": "Write comprehensive README and API docs",
      "currentStatus": "Pending",
      "priority": "high",
      "dueDate": "2025-10-30T00:00:00.000Z",
      "folder": "64f5a1b2c3d4e5f6a7b8c9d1",
      "owner": "firebase-user-uid",
      "metadata": {
        "aiGenerated": false,
        "type": "regular"
      },
      "createdAt": "2025-10-26T10:30:00.000Z",
      "updatedAt": "2025-10-26T10:30:00.000Z"
    }
  ]
}
```

#### POST /api/tasks
Create new task
```javascript
// Request Body
{
  "title": "New Task",
  "description": "Task description",
  "priority": "medium",
  "dueDate": "2025-10-30T00:00:00.000Z",
  "folder": "folder-id"
}

// Response
{
  "_id": "generated-task-id",
  "title": "New Task",
  // ... other task fields
}
```

#### PUT /api/tasks/:id
Update existing task
```javascript
// Request Body (partial update)
{
  "currentStatus": "Completed",
  "priority": "high"
}

// Response
{
  "_id": "task-id",
  "title": "Updated Task",
  // ... updated task fields
}
```

#### DELETE /api/tasks/:id
Delete task (soft delete)
```javascript
// Response
{
  "message": "Task deleted successfully",
  "deletedTask": { /* task object */ }
}
```

### Folder Endpoints

#### GET /api/folders
Get all folders with task counts
```javascript
// Response
{
  "folders": [
    {
      "_id": "folder-id",
      "name": "Work Projects",
      "icon": "💼",
      "taskCount": 15,
      "completedCount": 8,
      "pendingCount": 7
    }
  ]
}
```

#### POST /api/folders
Create new folder
```javascript
// Request Body
{
  "name": "Personal Tasks",
  "icon": "🏠"
}
```

#### DELETE /api/folders/folder-with-tasks/:id
Delete folder and all its tasks

#### DELETE /api/folders/only-folder/:id
Delete folder only (moves tasks to default folder)

### Analytics Endpoints

#### GET /api/analytics/user-stats
Get user productivity statistics
```javascript
// Response
{
  "totalTasks": 150,
  "completedTasks": 120,
  "completionRate": 80,
  "tasksThisWeek": 25,
  "tasksThisMonth": 100,
  "productivityScore": 85,
  "streakDays": 7
}
```

---

## Architecture Overview

### Offline-First Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │    │  OfflineStorage  │    │   SyncService   │
│                 │    │                  │    │                 │
│ - Components    │◄──►│ - IndexedDB      │◄──►│ - Auto Sync     │
│ - Context API   │    │ - LocalStorage   │    │ - Conflict Res. │
│ - State Mgmt    │    │ - Cache Layer    │    │ - Queue Mgmt    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Worker                               │
│ - Offline Caching    - Background Sync    - Push Notifications │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Express API   │    │    MongoDB       │    │  External APIs  │
│                 │    │                  │    │                 │
│ - REST Routes   │◄──►│ - Tasks          │    │ - Firebase Auth │
│ - Middleware    │    │ - Folders        │    │ - Google APIs   │
│ - Controllers   │    │ - Users          │    │ - AI Services   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Data Flow
1. **User Action** → React Component
2. **Component** → OfflineDataService
3. **OfflineStorage** → IndexedDB (immediate)
4. **SyncService** → Queue for server sync
5. **Background Sync** → Express API → MongoDB
6. **Conflict Resolution** → Merge changes → Update local storage

---

## Project Structure

```
chronify/
├── client/                          # Frontend React application
│   ├── public/
│   │   ├── manifest.json           # PWA manifest
│   │   ├── sw.js                   # Service worker
│   │   └── icons/                  # PWA icons
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── TaskItem.jsx        # Individual task display
│   │   │   ├── TaskList.jsx        # Task list container
│   │   │   ├── CreateTaskModal.jsx # Task creation modal
│   │   │   ├── FolderList.jsx      # Folder management
│   │   │   └── Navbar.jsx          # Navigation header
│   │   ├── pages/                  # Route components
│   │   │   ├── Dashboard.jsx       # Main dashboard
│   │   │   ├── TaskDetails.jsx     # Task detail view
│   │   │   └── Profile.jsx         # User profile
│   │   ├── context/                # React Context providers
│   │   │   ├── AuthContext.jsx     # Authentication state
│   │   │   └── PWAContext.jsx      # PWA functionality
│   │   ├── services/               # Business logic services
│   │   │   ├── offlineDataService.js    # Main data service
│   │   │   ├── offlineStorage.js        # IndexedDB operations
│   │   │   ├── syncService.js           # Online/offline sync
│   │   │   └── pwaService.js            # PWA utilities
│   │   ├── App.jsx                 # Main app component
│   │   └── main.jsx                # App entry point
│   └── package.json                # Frontend dependencies
│
├── server/                          # Backend Node.js application
│   ├── config/
│   │   ├── db.js                   # MongoDB connection
│   │   └── firebaseAdmin.js        # Firebase admin setup
│   ├── controllers/                # Route handlers
│   │   ├── tasksController.js      # Task CRUD operations
│   │   ├── folderController.js     # Folder management
│   │   └── analyticsController.js  # Analytics endpoints
│   ├── models/                     # Database schemas
│   │   ├── Tasks.js                # Task schema
│   │   ├── Folder.js               # Folder schema
│   │   └── UserSync.js             # Sync metadata
│   ├── routes/                     # Express routes
│   │   ├── tasksRoutes.js          # Task endpoints
│   │   ├── folderRoutes.js         # Folder endpoints
│   │   ├── authRoutes.js           # Authentication
│   │   └── analyticsRoutes.js      # Analytics
│   ├── services/                   # Business logic
│   │   ├── geminiService.js        # AI task generation
│   │   └── googleSyncService.js    # Google APIs integration
│   ├── middleware/
│   │   └── verifyFirebaseToken.js  # Auth middleware
│   ├── server.js                   # Server entry point
│   └── package.json                # Backend dependencies
│
└── README.md                        # This file
```

---

## Development Guide

### Running in Development Mode
```bash
# Start both servers concurrently
npm run dev

# Or separately:
# Backend (Terminal 1)
cd server && npm run dev

# Frontend (Terminal 2)  
cd client && npm run dev
```

### Building for Production
```bash
# Build frontend
cd client
npm run build

# Start production server
cd ../server
npm start
```

### Testing Offline Functionality
1. Open Chrome DevTools
2. Go to Application tab → Service Workers
3. Check "Offline" checkbox
4. Test creating, updating, deleting tasks
5. Go back online to see sync in action

### Database Management
```bash
# Connect to MongoDB shell
mongosh

# Use chronify database
use chronify

# View collections
show collections

# Query tasks
db.tasks.find().pretty()

# Query folders
db.folders.find().pretty()
```

---

## Deployment

### Backend Deployment (Node.js)
```bash
# Production environment variables
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...

# Start production server
npm start
```

### Frontend Deployment (Static Files)
```bash
# Build for production
npm run build

# Serve dist/ folder with any static file server
# Example with serve:
npx serve dist -p 5000
```

### Docker Deployment
```dockerfile
# Dockerfile example
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
```

### Environment-Specific Configurations
- **Development**: Hot reload, debugging enabled
- **Staging**: Production build, test database
- **Production**: Optimized build, production database, SSL

---

## Testing Guide

### Manual Testing Checklist
- [ ] User can register/login with Google
- [ ] Tasks can be created, edited, deleted offline
- [ ] Folders can be managed offline  
- [ ] Data syncs when connection is restored
- [ ] PWA can be installed on mobile/desktop
- [ ] Conflicts are resolved correctly
- [ ] AI task generation works
- [ ] Analytics display correctly

### Performance Testing
- Bundle size optimization
- Offline storage efficiency
- Sync performance with large datasets
- Memory usage monitoring

---

## Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly (offline and online)
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style Guidelines
- Use ESLint configuration provided
- Follow component naming conventions
- Add JSDoc comments for complex functions
- Write meaningful commit messages

---

## Security Considerations

### Authentication Security
- Firebase ID tokens validated on every request
- No sensitive data stored in localStorage
- CORS properly configured
- Rate limiting on API endpoints

### Data Protection
- User data isolated by Firebase UID
- Soft deletes for data recovery
- No PII in logs or error messages
- HTTPS required in production

---

## Troubleshooting

### Common Issues

#### "Tasks not syncing"
- Check network connection
- Verify Firebase authentication
- Check browser console for sync errors
- Clear application data and re-login

#### "PWA not installing"
- Ensure HTTPS in production
- Verify manifest.json is accessible
- Check service worker registration
- Test in Chrome/Edge (best PWA support)

#### "Offline storage full"
- Clear browser storage: DevTools → Application → Storage
- Check IndexedDB quota usage
- Implement data cleanup policies

### Debug Mode
```javascript
// Enable debug logging
localStorage.setItem('chronify_debug', 'true');

// View sync queue
console.log(getSyncService().debugSyncQueue());

// Check storage status
console.log(getOfflineDataService().exportData());
```

---
*Built by Parth Narkar [(@parth.builds)](https://www.instagram.com/parth.builds/)*
