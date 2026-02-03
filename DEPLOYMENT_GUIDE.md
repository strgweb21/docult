# Video Streaming Platform - Deployment Guide

## 📋 Table of Contents
1. [Introduction](#introduction)
2. [Project Overview](#project-overview)
3. [Prerequisites](#prerequisites)
4. [Local Development Setup](#local-development-setup)
5. [Using the Application](#using-the-application)
6. [Project Structure](#project-structure)
7. [Vercel Deployment](#vercel-deployment)
8. [Environment Variables](#environment-variables)
9. [Database Setup](#database-setup)
10. [Troubleshooting](#troubleshooting)
11. [Security Best Practices](#security-best-practices)

---

## 🎯 Introduction

This is a production-ready video streaming platform built with Next.js 16, featuring:
- **Video Management**: Full CRUD operations (Create, Read, Update, Delete)
- **Theater Mode**: Full-screen video player with customizable width
- **Label System**: Filter videos by tags/labels with count indicators
- **Password Protection**: Secure authentication for admin operations
- **Dark Theme**: Clean black & white UI design
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Pagination**: Automatic pagination for large video libraries

---

## 📦 Project Overview

### Technology Stack
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **Database**: SQLite with Prisma ORM
- **State Management**: React Hooks (useState, useEffect, useMemo, useCallback)
- **UI Components**: shadcn/ui (Radix UI primitives)

### Key Features
- ✅ 6-column × 5-row video grid (30 videos per page)
- ✅ Clickable thumbnails with play button overlay
- ✅ Full-screen theater overlay (ESC to close)
- ✅ Adjustable video player width (500px, 820px, 960px)
- ✅ Labels with filter dropdown showing video counts
- ✅ Password-protected admin actions (Add, Edit, Delete)
- ✅ Download and Open Original links
- ✅ Clean black & white minimal design
- ✅ Responsive layout

---

## 🔧 Prerequisites

Before starting, ensure you have:

### Required Software
```bash
# Check if you have these installed
node --version    # Should be 18.x or higher
bun --version    # Should be installed
git --version     # For version control
```

### Installations
```bash
# Install Node.js (if not installed)
# Visit: https://nodejs.org/

# Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# Install Git (if not installed)
# Visit: https://git-scm.com/downloads
```

### Required Accounts
- [Vercel Account](https://vercel.com/signup) (Free tier is sufficient)
- [GitHub Account](https://github.com/signup) (Optional, but recommended)

---

## 💻 Local Development Setup

### Step 1: Clone the Project

If you have the project files locally, skip to Step 2.

```bash
# Navigate to your project directory
cd /path/to/video-streaming-platform

# Or if cloning from git repository
git clone https://github.com/your-username/video-streaming-platform.git
cd video-streaming-platform
```

### Step 2: Install Dependencies

```bash
# Install all project dependencies
bun install

# This will install:
# - Next.js and related packages
# - React and hooks
# - Tailwind CSS
# - Prisma and SQLite
# - shadcn/ui components
# - Lucide icons
```

### Step 3: Setup Database

```bash
# Push the Prisma schema to SQLite database
bun run db:push

# This will:
# - Create the Video table in the database
# - Generate Prisma Client
# - Setup SQLite connection
```

### Step 4: Run Development Server

```bash
# Start the development server
bun run dev

# The application will be available at:
# http://localhost:3000
```

### Step 5: Verify Installation

Open your browser and navigate to `http://localhost:3000`:
- ✅ You should see the Video Stream homepage
- ✅ No console errors
- ✅ Black background with white text
- ✅ Header with "Video Stream" title and Filter dropdown
- ✅ "Add Video" button in header
- ✅ Message: "No videos found. Add your first video to get started!"

---

## 🎬 Using the Application

### Adding Your First Video

1. **Click "Add Video" button** in the header
2. **Fill in the form**:
   - **Title** (required): Enter video title
   - **Embed Link** (required): Use embed format, e.g.:
     - YouTube: `https://www.youtube.com/embed/VIDEO_ID`
     - Vimeo: `https://player.vimeo.com/video/VIDEO_ID`
   - **Thumbnail Link** (required): Direct image URL
   - **Download Link** (optional): Direct file URL
   - **Labels**: Add multiple tags (press Enter or click + button)
3. **Click "Add Video"**
4. **Enter password** when prompted: `jakakarsa0`
5. **Click "Confirm"**

✅ Your video should now appear on the homepage

### Viewing Videos

1. **Browse the grid**: Videos display in 6-column × 5-row layout
2. **Hover over thumbnail**: Shows play button
3. **Click thumbnail**: Opens full-screen theater overlay
4. **Adjust player width**: Click 500px, 820px, or 960px buttons
5. **View video details**: Title and labels displayed on the right sidebar

### Editing Videos

1. **Click on any video thumbnail** to open theater overlay
2. **Click "Edit" button** on the right sidebar
3. **Modify video details** in the dialog
4. **Click "Save Changes"**
5. **Enter password**: `jakakarsa0`
6. **Click "Confirm"**

✅ Video details will be updated immediately

### Deleting Videos

1. **Click on video thumbnail** to open theater overlay
2. **Click "Delete" button** on the right sidebar
3. **Confirm deletion** in the dialog
4. **Enter password**: `jakakarsa0`
5. **Click "Confirm"**

⚠️ **Warning**: This action cannot be undone!

### Filtering by Labels

1. **Click the Filter dropdown** in the header
2. **Select a label**: See video count in parentheses
   - Example: `Tutorial (3)` means 3 videos have "Tutorial" label
3. **View filtered results**: Grid shows only videos with that label
4. **Select "All Labels"** to clear filter

### Using Action Buttons

In the theater overlay right sidebar:
- **Edit**: Modify video details
- **Delete**: Remove video from database
- **Download**: Open download link in new tab (if available)
- **Open Original**: Open embed link in new tab

### Keyboard Shortcuts
- **ESC**: Close full-screen theater overlay

---

## 📁 Project Structure

```
video-streaming-platform/
├── prisma/
│   ├── schema.prisma          # Database schema definition
│   └── db/
│       └── custom.db            # SQLite database file
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── videos/
│   │   │       ├── route.ts                    # GET (list), POST (create)
│   │   │       └── [id]/
│   │   │           └── route.ts                # PUT (update), DELETE
│   │   └── page.tsx                          # Main homepage
│   ├── components/
│   │   └── ui/                                # shadcn/ui components
│   ├── lib/
│   │   ├── db.ts                                # Prisma client
│   │   └── utils.ts                            # Utility functions
│   └── ...
├── db/                          # Database directory (SQLite)
├── .env                         # Environment variables (local)
├── .env.example                 # Example environment variables
├── package.json                 # Dependencies
├── next.config.js             # Next.js configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── DEPLOYMENT_GUIDE.md       # This file
```

### Key Files Explanation

**Database Schema** (`prisma/schema.prisma`):
```prisma
model Video {
  id            String   @id @default(cuid())
  title         String
  embedLink     String
  thumbnailLink String
  downloadLink  String
  labels        String   // JSON string array
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**API Endpoints**:
- `GET /api/videos?page=1&label=tutorial` - List videos with pagination & filter
- `POST /api/videos` - Create new video (password protected)
- `PUT /api/videos/[id]` - Update video (password protected)
- `DELETE /api/videos/[id]` - Delete video (password protected)
- `POST /api/videos/verify-password` - Verify admin password

---

## 🚀 Vercel Deployment

### Step 1: Prepare for Production

#### Create Vercel Account
1. Visit [https://vercel.com/signup](https://vercel.com/signup)
2. Sign up (Free tier is sufficient)
3. Complete email verification

#### Push to GitHub (Recommended)
```bash
# Initialize git repository (if not done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Video streaming platform"

# Create GitHub repository (follow GitHub's instructions)
git remote add origin https://github.com/your-username/video-streaming-platform.git
git push -u origin main
```

### Step 2: Connect Vercel to GitHub

1. **Login to Vercel Dashboard**
2. **Click "Add New..." button**
3. **Select "Project"**
4. **Choose "Import Git Repository"**
5. **Select your video-streaming-platform repository**
6. **Click "Import"**

### Step 3: Configure Project Settings

#### Framework Preset
- **Framework**: Next.js (auto-detected)
- **Root Directory**: `./`
- **Build Command**: `bun run build` (will be detected)
- **Output Directory**: `.next` (will be detected)

#### Environment Variables
Click "Environment Variables" and add:

```bash
# Database URL (SQLite on Vercel)
DATABASE_URL="file:./db/custom.db"

# Optional: Custom password (change from default)
ADMIN_PASSWORD="jakakarsa0"

# Optional: Application environment
NODE_ENV="production"
```

⚠️ **Important**: For SQLite on Vercel, use the `file:` protocol to ensure database is stored in the project directory.

### Step 4: Deploy

1. **Click "Deploy" button**
2. **Wait for build** (~1-3 minutes)
3. **Deployment complete!** Vercel will provide:
   - Production URL: `https://your-project.vercel.app`
   - Automatic updates on git push
   - Preview deployments for each branch

### Step 5: Verify Deployment

1. **Visit your Vercel URL**
2. **Test all features**:
   - ✅ Homepage loads without errors
   - ✅ Can add videos (with password)
   - ✅ Can edit videos (with password)
   - ✅ Can delete videos (with password)
   - ✅ Pagination works
   - ✅ Label filter works
   - ✅ Theater overlay opens correctly
   - ✅ Player width adjustment works

---

## 🔐 Environment Variables

### Local Development (.env)
```env
# Database
DATABASE_URL="file:./db/custom.db"

# Application
NODE_ENV="development"
```

### Production (Vercel Dashboard)
**Required Variables:**
```env
DATABASE_URL="file:./db/custom.db"
```

**Optional Variables:**
```env
NODE_ENV="production"
# Add custom variables as needed
```

### Accessing Environment Variables in Code

```typescript
// Next.js API Routes (Server-side)
const dbUrl = process.env.DATABASE_URL;

// Client-side (Next.js)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

---

## 💾 Database Setup

### SQLite on Vercel

#### Understanding SQLite Limitations
- **Database is ephemeral**: File resets on each deployment
- **No built-in persistence**: Database file not shared between deployments
- **Not suitable for**: Production apps requiring persistent data

#### Better Production Options

### Option 1: Use PostgreSQL with Vercel Postgres (Recommended)

#### Step 1: Create Vercel Postgres Database
1. **Go to Vercel Dashboard**
2. **Click "Storage" → "Databases"**
3. **Click "Create Database"**
4. **Select "Postgres"**
5. **Choose region** (select nearest to your users)
6. **Click "Create"**

#### Step 2: Update Environment Variables
```env
# Update DATABASE_URL in Vercel
DATABASE_URL="postgres://user:password@host:port/database"
```

#### Step 3: Update Prisma Schema
```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}

model Video {
  id            String   @id @default(cuid())
  title         String
  embedLink     String
  thumbnailLink String
  downloadLink  String
  labels        String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

#### Step 4: Regenerate Prisma Client
```bash
# Generate Prisma Client for PostgreSQL
bunx prisma generate

# Or with npx
npx prisma generate
```

### Option 2: Use External Database Service

#### Available Options:
- **Supabase**: PostgreSQL database with generous free tier
- **Neon**: Serverless PostgreSQL
- **PlanetScale**: MySQL database
- **Turso**: Edge SQLite with sync

#### Example: Turso Setup
```bash
# Install Turso CLI
bun install -g turso

# Create database
turso db create video-stream

# Get database URL
turso db show video-stream --url

# Add to Vercel environment variables
DATABASE_URL="libsql://your-database-url"
```

---

## 🐛 Troubleshooting

### Issue 1: Build Fails on Vercel

**Symptoms**: Deployment fails during build process

**Solutions**:
```bash
# 1. Check package.json scripts
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "prisma db push"
  }
}

# 2. Verify Node.js version
node --version  # Should be 18.x or higher

# 3. Check Vercel build logs
# Dashboard → Project → Deployments → Click on failed deployment
```

### Issue 2: Database Connection Errors

**Symptoms**: "Failed to fetch videos" or database errors

**Solutions**:
```bash
# 1. Verify DATABASE_URL is set
# Check Vercel Dashboard → Project → Settings → Environment Variables

# 2. Ensure database path is correct
# For SQLite: file:./db/custom.db
# For Postgres: postgres://user:password@host:port/database

# 3. Check Prisma schema
bun run db:push  # Locally test schema push
```

### Issue 3: Password Not Working

**Symptoms**: "Invalid password" error even with correct password

**Solutions**:
```bash
# 1. Verify password in backend code
# Check: src/app/api/videos/route.ts
const ADMIN_PASSWORD = 'jakakarsa0';

# 2. Ensure password is not exposed in frontend
# Password should ONLY be on server-side code
# Never store in client-side JavaScript or localStorage

# 3. Check password verification endpoint
# POST /api/videos/verify-password should return { success: true }
```

### Issue 4: Videos Not Displaying

**Symptoms**: Grid shows "No videos found"

**Solutions**:
```bash
# 1. Check database has data
# Locally: Use Prisma Studio
bunx prisma studio

# 2. Verify API response
# Open: /api/videos in browser
# Should return: { videos: [], pagination: {...} }

# 3. Check browser console
# Look for JavaScript errors
# F12 → Console tab
```

### Issue 5: Overlay Closes When Clicking Buttons

**Symptoms**: Edit/Delete dialogs don't open, theater closes

**Solutions**:
```javascript
// Verify event propagation is stopped
<Button onClick={(e) => {
  e.stopPropagation();  // ← Must be present
  openEditDialog(video);
}}>

// Check z-index
// Overlay: z-[100]
// Dialog: zIndex={200}  // Must be higher
```

---

## 🔒 Security Best Practices

### 1. Password Protection

**Current Implementation**:
✅ Password validated only on backend
✅ Never exposed to frontend
✅ Required for Add, Edit, Delete operations

**Recommended Improvements**:
```typescript
// 1. Use environment variable for password
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'jakakarsa0';

// 2. Add rate limiting
// Prevent brute force attacks
const rateLimiter = new Map<string, number[]>();

// 3. Hash password in production
// Don't store plain text password
const hashedPassword = hash(ADMIN_PASSWORD);
```

### 2. Input Validation

```typescript
// API Route Example: POST /api/videos
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate required fields
  if (!body.title || !body.embedLink || !body.thumbnailLink) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Sanitize input
  const sanitizedTitle = body.title.trim();
  const sanitizedEmbedLink = validateUrl(body.embedLink);

  // ... rest of code
}
```

### 3. Database Security

```bash
# For PostgreSQL production:
# 1. Use connection pooling
# 2. Enable SSL
# 3. Restrict IP access
# 4. Regular backups

# For SQLite:
# 1. Don't commit database file to git
# 2. Use environment-specific databases
# 3. Consider read-only filesystem
```

### 4. Environment Variables

**Never commit sensitive data to git**:
```bash
# Create .env.example
DATABASE_URL="your-database-url-here"
ADMIN_PASSWORD="your-password-here"

# Add to .gitignore
.env
.env.local
.env.production
*.db
```

---

## 📊 Monitoring and Maintenance

### Vercel Deployment Logs

**View Logs**:
1. **Go to Vercel Dashboard**
2. **Select Project**
3. **Click "Deployments"**
4. **Click on deployment** to view logs

### Analytics

**Enable Analytics**:
1. **Vercel Dashboard → Project → Analytics**
2. **View**: Page views, unique visitors, geographic distribution
3. **Monitor**: Performance metrics, error rates

### Database Monitoring

**For PostgreSQL**:
- Use Vercel Postgres dashboard
- Monitor connection counts
- Check query performance

---

## 🔄 Updating the Application

### Making Changes Locally

```bash
# 1. Make code changes
# Edit files as needed

# 2. Test locally
bun run dev
# Visit http://localhost:3000

# 3. Commit changes
git add .
git commit -m "Add new feature"

# 4. Push to GitHub
git push origin main
```

### Automatic Deployment to Vercel

When you push to GitHub:
- ✅ Vercel automatically triggers deployment
- ✅ Build process starts
- ✅ New version deployed
- ✅ Production URL updated

### Manual Deployment

If needed, deploy from Vercel Dashboard:
1. **Dashboard → Project → Deployments**
2. **Click "Redeploy"**
3. **Select commit or branch**
4. **Click "Redeploy"**

---

## 📚� Production Checklist

Before going to production, ensure:

### Functionality
- [ ] All CRUD operations working (Add, Edit, Delete)
- [ ] Password protection working
- [ ] Pagination working correctly
- [ ] Label filter functional
- [ ] Theater overlay works
- [ ] Player width adjustment works
- [ ] Download and Open Original buttons work

### Performance
- [ ] Images optimized (lazy loading enabled)
- [ ] No console errors
- [ ] Fast page loads (< 3 seconds)
- [ ] Responsive on mobile, tablet, desktop

### Security
- [ ] Environment variables set
- [ ] Database credentials secure
- [ ] HTTPS enabled (Vercel auto-provides)
- [ ] No sensitive data in client code
- [ ] Password not exposed in frontend

### Deployment
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled
- [ ] Error monitoring set up
- [ ] Backup strategy in place

---

## 📞 Support and Resources

### Official Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Useful Links
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 🎓 Summary

This video streaming platform is now ready for deployment to Vercel!

### Key Points:
1. **Prerequisites**: Node.js, Bun, Git, Vercel account
2. **Local Setup**: Install deps, run `bun run db:push`, start dev server
3. **Database**: Consider PostgreSQL for production (not SQLite)
4. **Vercel Deploy**: Connect GitHub repo, configure env vars, deploy
5. **Security**: Keep passwords secure, validate inputs, use HTTPS
6. **Monitoring**: Check logs, analytics, performance

### Next Steps:
1. ✅ Test all features locally
2. ✅ Push code to GitHub
3. ✅ Deploy to Vercel
4. ✅ Configure custom domain (optional)
5. ✅ Set up analytics and monitoring
6. ✅ Monitor and improve based on user feedback

---

**🎉 Congratulations!** You now have a fully functional video streaming platform ready for production use.

**Need Help?** Check the Troubleshooting section or refer to official documentation.
