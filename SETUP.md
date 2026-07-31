# 🎯 DanceMeet Backend - Setup & Getting Started

## ✅ What's Been Set Up

### 1. **Database Configuration** ✓
- ✅ MongoDB Atlas connection configured
- ✅ Connection pooling with caching
- ✅ Environment variables setup (.env)
- ✅ Connection test script available

### 2. **Data Models** ✓
- ✅ IUser - User accounts with auto-populated followers/following
- ✅ IEvent - Dance events
- ✅ IDiscipline - Dance disciplines
- ✅ IEventType - Event types
- ✅ IFavorite - User event favorites
- ✅ IFollowers - User-to-user follow relationships
- ✅ ISocialLinks - Social media links

### 3. **Data Access Layer (Repositories)** ✓
- ✅ Base repository with CRUD operations
- ✅ User repository with custom queries
- ✅ Event repository with location/filter queries
- ✅ Discipline repository with name lookup
- ✅ EventType repository
- ✅ Favorite repository with quick lookups
- ✅ Followers repository with count methods

### 4. **Business Logic Layer (Services)** ✓
- ✅ User service with follower/following logic
- ✅ Event service with filtering
- ✅ Discipline service
- ✅ EventType service
- ✅ Favorite service with add/remove convenience methods
- ✅ Followers service with follow/unfollow logic

### 5. **API Layer (Controllers)** ✓
- ✅ User controller with 10+ endpoints
- ✅ Event controller with 14+ endpoints
- ✅ Discipline controller with 7+ endpoints
- ✅ EventType controller with 7+ endpoints
- ✅ Favorite controller with 12+ endpoints
- ✅ Followers controller with 13+ endpoints

### 6. **NestJS Modules** ✓
- ✅ Database module (global)
- ✅ Feature modules (User, Event, Discipline, EventType, Favorite, Followers)
- ✅ Dependency injection configured

### 7. **Documentation** ✓
- ✅ Full API documentation (API_DOCUMENTATION.md)
- ✅ Endpoints summary (ENDPOINTS.md)
- ✅ MongoDB setup guide (src/scripts/README.md)

---

## 🚀 Quick Start Guide

### Step 1: Install Dependencies
```bash
cd c:\CIFO\dancemeet-back
npm install
```

**This will install:**
- NestJS and core packages
- MongoDB driver
- TypeScript
- Testing frameworks

### Step 2: Verify Environment Setup
Check that `.env` file exists in the root directory with:
```env
MONGODB_URI=mongodb+srv://dancemeetbcn_db_user:68tF5cWYkipqVCY0@clusterdancemeet.baoipcn.mongodb.net/?appName=ClusterDanceMeet
MONGODB_DB_NAME=DanceMeetDB
NODE_ENV=development
PORT=3000
```

### Step 3: Test MongoDB Connection
```bash
npx ts-node src/scripts/connection-test.ts
```

Expected output:
```
🔄 Connecting to MongoDB...
✅ Successfully connected to MongoDB
✅ Successfully accessed database: DanceMeetDB
✅ Ping successful: { ok: 1 }
✅ All connection tests passed!
🔌 Connection closed
```

### Step 4: Start the Development Server
```bash
npm run start:dev
```

Expected output:
```
╔════════════════════════════════════════════════════════════╗
║                    DanceMeet API Server                      ║
╠════════════════════════════════════════════════════════════╣
║                                                             ║
║  🚀 Server running on: http://localhost:3000
║  📚 Database: DanceMeetDB                                    ║
║                                                             ║
║  Available Endpoints:                                       ║
║  - POST   /api/users                    (Create user)       ║
║  - GET    /api/users                    (Get all users)     ║
│  ... and many more                                         │
║                                                             ║
╚════════════════════════════════════════════════════════════╝
```

### Step 5: Test the API
Open a new terminal and test an endpoint:

```bash
# Get all users
curl http://localhost:3000/api/users

# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "city": "Barcelona",
    "latitude": 41.3874,
    "longitude": 2.1686,
    "distanceRange": 50,
    "notificationsEnabled": true,
    "disciplineIds": [],
    "createdAt": '$(date +%s)000'
  }'
```

---

## 📚 Available Commands

### Development
```bash
npm run start:dev        # Start with hot reload
npm run start:debug      # Start in debug mode
npm run build            # Build for production
npm start                # Start production build
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
```

### Testing
```bash
npm test                 # Run tests
npm run test:watch      # Run tests in watch mode
npm run test:cov        # Run tests with coverage
npm run test:e2e        # Run E2E tests
```

---

## 📖 Documentation Files

1. **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference
2. **[ENDPOINTS.md](./ENDPOINTS.md)** - Quick endpoints summary
3. **[src/scripts/README.md](./src/scripts/README.md)** - MongoDB setup guide

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│          Client (Web/Mobile)            │
└──────────────────┬──────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   NestJS Controllers │
        │   (HTTP Handlers)    │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │     Services         │
        │ (Business Logic)     │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   Repositories       │
        │ (Data Access Layer)  │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   MongoDB Driver     │
        │   (Native Driver)    │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  MongoDB Atlas       │
        │  (Cloud Database)    │
        └──────────────────────┘
```

---

## 🔄 Request Flow Example

### Create a User Request
```
1. POST /api/users
   ↓
2. UserController.createUser()
   ↓
3. UserService.createUser()
   ↓
4. UserRepository.create()
   ↓
5. MongoDB: Insert document
   ↓
6. Return: User object with ID
```

---

## 📊 Database Collections

When you start making requests, MongoDB will automatically create these collections:

- `users` - User accounts
- `events` - Events
- `disciplines` - Dance disciplines
- `eventTypes` - Event types
- `favorites` - User favorites
- `followers` - Follow relationships

---

## 🔐 Security Reminders

⚠️ **Current State: NO SECURITY**

When moving to production, implement:
- [ ] JWT authentication
- [ ] Role-based access control
- [ ] Input validation
- [ ] Rate limiting
- [ ] CORS restrictions
- [ ] Helmet middleware
- [ ] Request logging

See [SECURITY.md](./SECURITY.md) (to be created) for detailed security guidelines.

---

## 🆘 Troubleshooting

### Issue: "MONGODB_URI not found"
**Solution:** Make sure `.env` file exists in root directory

### Issue: "Connection refused"
**Solution:** 
1. Check internet connection
2. Verify IP is whitelisted in MongoDB Atlas
3. Run connection test: `npx ts-node src/scripts/connection-test.ts`

### Issue: "Port 3000 already in use"
**Solution:** Change PORT in `.env` to a different port (e.g., 3001)

### Issue: Dependencies not installed
**Solution:**
```bash
rm -rf node_modules
npm install
```

---

## 📞 Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Test connection: `npx ts-node src/scripts/connection-test.ts`
3. ✅ Start server: `npm run start:dev`
4. ✅ Test endpoints: Use cURL or Postman
5. ⏭️ Add authentication
6. ⏭️ Add input validation
7. ⏭️ Add API testing

---

## 📦 Project Files Created

### Configuration
- `.env` - Environment variables with secrets
- `.env.example` - Template for environment variables
- `package.json` - Updated with mongodb and dotenv

### Source Code
```
src/
├── config/
│   ├── database.ts
│   └── mongodb.config.ts
├── models/
│   ├── index.ts
│   ├── user.ts
│   ├── event.ts
│   ├── discipline.ts
│   ├── eventType.ts
│   ├── favorite.ts
│   ├── followers.ts
│   └── socialLinks.ts
├── repositories/
│   ├── index.ts
│   ├── base.repository.ts
│   ├── user.repository.ts
│   ├── event.repository.ts
│   ├── discipline.repository.ts
│   ├── eventType.repository.ts
│   ├── favorite.repository.ts
│   └── followers.repository.ts
├── services/
│   ├── index.ts
│   ├── user.service.ts
│   ├── event.service.ts
│   ├── discipline.service.ts
│   ├── eventType.service.ts
│   ├── favorite.service.ts
│   └── followers.service.ts
├── controllers/
│   ├── index.ts
│   ├── user.controller.ts
│   ├── event.controller.ts
│   ├── discipline.controller.ts
│   ├── eventType.controller.ts
│   ├── favorite.controller.ts
│   └── followers.controller.ts
├── modules/
│   ├── index.ts
│   ├── database.module.ts
│   ├── user.module.ts
│   ├── event.module.ts
│   ├── discipline.module.ts
│   ├── eventType.module.ts
│   ├── favorite.module.ts
│   └── followers.module.ts
├── scripts/
│   ├── README.md
│   └── connection-test.ts
├── app.module.ts (updated)
└── main.ts (updated)
```

### Documentation
- `API_DOCUMENTATION.md` - Full API reference
- `ENDPOINTS.md` - Endpoints summary table
- `SETUP.md` - This file

---

## 🎉 You're All Set!

Your DanceMeet API is ready to use. Start with:

```bash
npm run start:dev
```

Then access: `http://localhost:3000/api/users`

Happy coding! 🚀
