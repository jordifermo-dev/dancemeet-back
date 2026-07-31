# 🎉 DanceMeet API - Available Endpoints Summary

## Server Details
- **Base URL:** `http://localhost:3000`
- **Port:** 3000
- **Database:** DanceMeetDB (MongoDB)
- **Authentication:** ❌ Not implemented (all endpoints are public)

---

## 📋 API Endpoints Summary

### 👤 **Users** (`/api/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users` | Create a new user |
| GET | `/api/users` | Get all users |
| GET | `/api/users/:id` | Get user by ID |
| GET | `/api/users/email/:email` | Get user by email |
| GET | `/api/users/city/:city` | Get users by city |
| GET | `/api/users/discipline/:disciplineId` | Get users by discipline |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| GET | `/api/users/:id/followers-count` | Get followers count |
| GET | `/api/users/:id/following-count` | Get following count |

**Auto-Populated Fields:**
- `followerId`: Array of users who follow this user
- `followingId`: Array of users this user is following

---

### 🎪 **Events** (`/api/events`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/events` | Create a new event |
| GET | `/api/events` | Get all events |
| GET | `/api/events/:id` | Get event by ID |
| GET | `/api/events/creator/:creatorId` | Get events by creator |
| GET | `/api/events/discipline/:disciplineId` | Get events by discipline |
| GET | `/api/events/type/:typeId` | Get events by type |
| GET | `/api/events/city/:city` | Get events by city |
| GET | `/api/events/upcoming/list` | Get upcoming events |
| GET | `/api/events/nearby/list?latitude=41.38&longitude=2.16&maxDistance=10000` | Get events nearby |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |
| GET | `/api/events/count/total` | Total events count |
| GET | `/api/events/count/creator/:creatorId` | Events by creator count |

---

### 💃 **Disciplines** (`/api/disciplines`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/disciplines` | Create a new discipline |
| GET | `/api/disciplines` | Get all disciplines |
| GET | `/api/disciplines/:id` | Get discipline by ID |
| GET | `/api/disciplines/name/:name` | Get discipline by name |
| PUT | `/api/disciplines/:id` | Update discipline |
| DELETE | `/api/disciplines/:id` | Delete discipline |
| GET | `/api/disciplines/count/total` | Total disciplines count |

---

### 🏷️ **Event Types** (`/api/event-types`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/event-types` | Create a new event type |
| GET | `/api/event-types` | Get all event types |
| GET | `/api/event-types/:id` | Get event type by ID |
| GET | `/api/event-types/name/:name` | Get event type by name |
| PUT | `/api/event-types/:id` | Update event type |
| DELETE | `/api/event-types/:id` | Delete event type |
| GET | `/api/event-types/count/total` | Total event types count |

---

### ⭐ **Favorites** (`/api/favorites`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/favorites` | Create a new favorite |
| GET | `/api/favorites` | Get all favorites |
| GET | `/api/favorites/:id` | Get favorite by ID |
| GET | `/api/favorites/user/:userId` | Get user's favorites |
| GET | `/api/favorites/event/:eventId` | Get event's favorites |
| GET | `/api/favorites/check/:userId/:eventId` | Check if event is favorited |
| POST | `/api/favorites/:userId/:eventId/add` | Add event to favorites |
| DELETE | `/api/favorites/:userId/:eventId/remove` | Remove from favorites |
| PUT | `/api/favorites/:id` | Update favorite |
| DELETE | `/api/favorites/:id` | Delete favorite |
| GET | `/api/favorites/count/user/:userId` | Count user's favorites |
| GET | `/api/favorites/count/event/:eventId` | Count event's favorites |

---

### 👥 **Followers** (`/api/followers`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/followers` | Create a new follower relationship |
| GET | `/api/followers` | Get all follower relationships |
| GET | `/api/followers/:id` | Get follower relationship by ID |
| GET | `/api/followers/user/:userId` | Get followers of a user |
| GET | `/api/followers/following/:followerId` | Get following by a user |
| GET | `/api/followers/check/:userId/:followerId` | Check if following |
| POST | `/api/followers/:userId/:followerId/follow` | Follow a user |
| DELETE | `/api/followers/:userId/:followerId/unfollow` | Unfollow a user |
| PUT | `/api/followers/:id` | Update follower relationship |
| DELETE | `/api/followers/:id` | Delete follower relationship |
| GET | `/api/followers/count/followers/:userId` | Count followers |
| GET | `/api/followers/count/following/:userId` | Count following |
| GET | `/api/followers/mutual/:userId1/:userId2` | Get mutual followers |

---

## 🚀 Quick Start Commands

### Install Dependencies
```bash
npm install
```

### Test MongoDB Connection
```bash
npx ts-node src/scripts/connection-test.ts
```

### Start Development Server
```bash
npm run start:dev
```

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

---

## 📊 Example Requests

### Create a User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Garcia",
    "email": "maria@example.com",
    "city": "Barcelona",
    "latitude": 41.3874,
    "longitude": 2.1686,
    "distanceRange": 50,
    "notificationsEnabled": true,
    "disciplineIds": [],
    "createdAt": '$(date +%s)000'
  }'
```

### Get All Users
```bash
curl http://localhost:3000/api/users
```

### Create an Event
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Salsa Night",
    "description": "Amazing salsa event",
    "imageUrl": "https://example.com/event.jpg",
    "typeId": "workshop",
    "disciplineId": "salsa",
    "eventDateFrom": '$(date +%s)000',
    "eventDateTo": '$(($(date +%s) + 7200))'000,
    "status": "active",
    "isFree": false,
    "price": 15.99,
    "creatorId": "user_1",
    "address": "Street 123",
    "city": "Barcelona",
    "latitude": 41.3874,
    "longitude": 2.1686,
    "createdAt": '$(date +%s)000'
  }'
```

### Follow a User
```bash
curl -X POST http://localhost:3000/api/followers/user_1/user_2/follow \
  -H "Content-Type: application/json"
```

### Add Event to Favorites
```bash
curl -X POST http://localhost:3000/api/favorites/user_1/event_1/add \
  -H "Content-Type: application/json"
```

### Get Nearby Events
```bash
curl "http://localhost:3000/api/events/nearby/list?latitude=41.3874&longitude=2.1686&maxDistance=10000"
```

---

## 🗂️ Project Structure

```
src/
├── config/           # Database configuration
│   ├── mongodb.config.ts
│   └── database.ts
├── models/           # TypeScript interfaces
│   ├── user.ts
│   ├── event.ts
│   ├── discipline.ts
│   ├── eventType.ts
│   ├── favorite.ts
│   ├── followers.ts
│   └── socialLinks.ts
├── repositories/     # Data access layer
│   ├── base.repository.ts
│   ├── user.repository.ts
│   ├── event.repository.ts
│   ├── discipline.repository.ts
│   ├── eventType.repository.ts
│   ├── favorite.repository.ts
│   └── followers.repository.ts
├── services/         # Business logic layer
│   ├── user.service.ts
│   ├── event.service.ts
│   ├── discipline.service.ts
│   ├── eventType.service.ts
│   ├── favorite.service.ts
│   └── followers.service.ts
├── controllers/      # API route handlers
│   ├── user.controller.ts
│   ├── event.controller.ts
│   ├── discipline.controller.ts
│   ├── eventType.controller.ts
│   ├── favorite.controller.ts
│   └── followers.controller.ts
├── modules/          # NestJS modules
│   ├── database.module.ts
│   ├── user.module.ts
│   ├── event.module.ts
│   ├── discipline.module.ts
│   ├── eventType.module.ts
│   ├── favorite.module.ts
│   └── followers.module.ts
├── scripts/          # Utility scripts
│   └── connection-test.ts
├── app.module.ts     # Root module
└── main.ts           # Application entry point
```

---

## 🔒 Security Notes

**⚠️ IMPORTANT:** Currently, **NO security is implemented**.
- All endpoints are publicly accessible
- No authentication required
- No authorization checks
- No input validation
- No rate limiting

### TODO for Production:
- [ ] Implement JWT authentication
- [ ] Add role-based access control (RBAC)
- [ ] Add input validation with class-validator
- [ ] Implement rate limiting
- [ ] Add CORS restrictions
- [ ] Add request logging
- [ ] Add error handling middleware

---

## 📝 Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 🐛 Troubleshooting

### Connection Issues
1. Check MongoDB URI in `.env`
2. Verify IP whitelist in MongoDB Atlas
3. Run connection test: `npx ts-node src/scripts/connection-test.ts`

### Port Already in Use
```bash
# Change PORT in .env
PORT=3001
```

### Dependencies Missing
```bash
npm install
npm install mongodb dotenv
```

---

## 📞 Support

For complete API documentation, see: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

Happy coding! 🚀
