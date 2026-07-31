# DanceMeet API Documentation

## Overview

DanceMeet is a NestJS-based REST API for managing a dance event platform. The API provides complete CRUD operations for users, events, disciplines, event types, favorites, and follower relationships.

## Base URL
```
http://localhost:3000
```

## Authentication
**Currently NO authentication is implemented. All endpoints are public.**

---

## API Endpoints

### 1. Users API (`/api/users`)

#### Create User
```http
POST /api/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "city": "Barcelona",
  "latitude": 41.3874,
  "longitude": 2.1686,
  "distanceRange": 50,
  "notificationsEnabled": true,
  "disciplineIds": ["discipline_id_1"],
  "createdAt": 1687000000000,
  "photoUrl": "https://example.com/photo.jpg"
}

Response: 201 Created
{
  "id": "user_id_1",
  "name": "John Doe",
  "email": "john@example.com",
  ...
  "followerId": [],
  "followingId": []
}
```

#### Get All Users
```http
GET /api/users

Response: 200 OK
[
  { ...user },
  { ...user }
]
```

#### Get User by ID
```http
GET /api/users/:id

Response: 200 OK
{
  "id": "user_id_1",
  "name": "John Doe",
  ...
}
```

#### Get User by Email
```http
GET /api/users/email/:email

Example: GET /api/users/email/john@example.com
```

#### Get Users by City
```http
GET /api/users/city/:city

Example: GET /api/users/city/Barcelona
```

#### Get Users by Discipline
```http
GET /api/users/discipline/:disciplineId
```

#### Update User
```http
PUT /api/users/:id
Content-Type: application/json

{
  "name": "Jane Doe",
  "city": "Madrid"
}

Response: 200 OK
{
  "success": true
}
```

#### Delete User
```http
DELETE /api/users/:id

Response: 200 OK
{
  "success": true
}
```

#### Get Followers Count
```http
GET /api/users/:id/followers-count

Response: 200 OK
{
  "count": 42
}
```

#### Get Following Count
```http
GET /api/users/:id/following-count

Response: 200 OK
{
  "count": 15
}
```

---

### 2. Events API (`/api/events`)

#### Create Event
```http
POST /api/events
Content-Type: application/json

{
  "title": "Salsa Night",
  "description": "Amazing salsa event",
  "imageUrl": "https://example.com/event.jpg",
  "typeId": "type_id_1",
  "disciplineId": "discipline_id_1",
  "eventDateFrom": 1687000000000,
  "eventDateTo": 1687003600000,
  "status": "active",
  "isFree": false,
  "price": 15.99,
  "creatorId": "user_id_1",
  "address": "Street 123",
  "city": "Barcelona",
  "latitude": 41.3874,
  "longitude": 2.1686,
  "createdAt": 1687000000000
}

Response: 201 Created
{
  "id": "event_id_1",
  ...
}
```

#### Get All Events
```http
GET /api/events

Response: 200 OK
[ { ...event }, { ...event } ]
```

#### Get Event by ID
```http
GET /api/events/:id
```

#### Get Events by Creator
```http
GET /api/events/creator/:creatorId
```

#### Get Events by Discipline
```http
GET /api/events/discipline/:disciplineId
```

#### Get Events by Type
```http
GET /api/events/type/:typeId
```

#### Get Events by City
```http
GET /api/events/city/:city
```

#### Get Upcoming Events
```http
GET /api/events/upcoming/list
GET /api/events/upcoming/list?currentTime=1687000000000

Response: 200 OK
[ { ...event }, { ...event } ]
```

#### Get Events Nearby
```http
GET /api/events/nearby/list?latitude=41.3874&longitude=2.1686&maxDistance=10000

Response: 200 OK
[ { ...event }, { ...event } ]
```

#### Update Event
```http
PUT /api/events/:id
Content-Type: application/json

{
  "title": "Updated Salsa Night",
  "price": 20.00
}

Response: 200 OK
{
  "success": true
}
```

#### Delete Event
```http
DELETE /api/events/:id

Response: 200 OK
{
  "success": true
}
```

---

### 3. Disciplines API (`/api/disciplines`)

#### Create Discipline
```http
POST /api/disciplines
Content-Type: application/json

{
  "name": "Salsa",
  "color": "#FF0000",
  "iconUrl": "https://example.com/salsa.png",
  "createdAt": 1687000000000
}

Response: 201 Created
{
  "id": "discipline_id_1",
  ...
}
```

#### Get All Disciplines
```http
GET /api/disciplines
```

#### Get Discipline by ID
```http
GET /api/disciplines/:id
```

#### Get Discipline by Name
```http
GET /api/disciplines/name/:name
```

#### Update Discipline
```http
PUT /api/disciplines/:id
```

#### Delete Discipline
```http
DELETE /api/disciplines/:id
```

---

### 4. Event Types API (`/api/event-types`)

#### Create Event Type
```http
POST /api/event-types
Content-Type: application/json

{
  "name": "Workshop",
  "createdAt": 1687000000000
}

Response: 201 Created
{
  "id": "type_id_1",
  ...
}
```

#### Get All Event Types
```http
GET /api/event-types
```

#### Get Event Type by ID
```http
GET /api/event-types/:id
```

#### Get Event Type by Name
```http
GET /api/event-types/name/:name
```

#### Update Event Type
```http
PUT /api/event-types/:id
```

#### Delete Event Type
```http
DELETE /api/event-types/:id
```

---

### 5. Favorites API (`/api/favorites`)

#### Add to Favorites
```http
POST /api/favorites/:userId/:eventId/add

Response: 201 Created
{
  "id": "favorite_id_1",
  "userId": "user_id_1",
  "eventId": "event_id_1",
  "createdAt": 1687000000000
}
```

#### Get All Favorites
```http
GET /api/favorites
```

#### Get Favorite by ID
```http
GET /api/favorites/:id
```

#### Get User's Favorites
```http
GET /api/favorites/user/:userId

Response: 200 OK
[ { ...favorite }, { ...favorite } ]
```

#### Get Event's Favorites
```http
GET /api/favorites/event/:eventId
```

#### Check if Event is Favorited
```http
GET /api/favorites/check/:userId/:eventId

Response: 200 OK
{
  "isFavorited": true
}
```

#### Remove from Favorites
```http
DELETE /api/favorites/:userId/:eventId/remove

Response: 200 OK
{
  "success": true
}
```

#### Count User's Favorites
```http
GET /api/favorites/count/user/:userId

Response: 200 OK
{
  "count": 8
}
```

#### Count Event's Favorites
```http
GET /api/favorites/count/event/:eventId

Response: 200 OK
{
  "count": 42
}
```

---

### 6. Followers API (`/api/followers`)

#### Follow User
```http
POST /api/followers/:userId/:followerId/follow

Response: 201 Created
{
  "id": "follower_id_1",
  "userId": "user_id_1",
  "followerId": "user_id_2",
  "createdAt": 1687000000000
}
```

#### Get All Followers (Relationships)
```http
GET /api/followers
```

#### Get Followers of a User
```http
GET /api/followers/user/:userId

Response: 200 OK
[ { ...follower }, { ...follower } ]
```

#### Get Following by User
```http
GET /api/followers/following/:followerId

Response: 200 OK
[ { ...following }, { ...following } ]
```

#### Check if Following
```http
GET /api/followers/check/:userId/:followerId

Response: 200 OK
{
  "isFollowing": true
}
```

#### Unfollow User
```http
DELETE /api/followers/:userId/:followerId/unfollow

Response: 200 OK
{
  "success": true
}
```

#### Count Followers
```http
GET /api/followers/count/followers/:userId

Response: 200 OK
{
  "count": 15
}
```

#### Count Following
```http
GET /api/followers/count/following/:userId

Response: 200 OK
{
  "count": 8
}
```

#### Get Mutual Followers
```http
GET /api/followers/mutual/:userId1/:userId2

Response: 200 OK
[ { ...follower }, { ...follower } ]
```

---

## Data Models

### User
```json
{
  "id": "string (auto-generated)",
  "name": "string",
  "email": "string (unique)",
  "phone": "string (optional)",
  "photoUrl": "string (optional)",
  "socialLinks": {
    "instagram": "string (optional)",
    "facebook": "string (optional)",
    "tiktok": "string (optional)",
    "youtube": "string (optional)",
    "website": "string (optional)"
  },
  "city": "string",
  "latitude": "number",
  "longitude": "number",
  "distanceRange": "number (in km)",
  "notificationsEnabled": "boolean",
  "disciplineIds": "string[]",
  "followerId": "string[] (computed from Followers)",
  "followingId": "string[] (computed from Followers)",
  "createdAt": "number (timestamp)",
  "updatedAt": "number (timestamp, optional)",
  "lastLoginAt": "number (timestamp, optional)"
}
```

### Event
```json
{
  "id": "string (auto-generated)",
  "title": "string",
  "description": "string",
  "additionalInfo": "string (optional)",
  "socialLinks": { ...SocialLinks },
  "imageUrl": "string",
  "typeId": "string",
  "disciplineId": "string",
  "eventDateFrom": "number (timestamp)",
  "eventDateTo": "number (timestamp)",
  "status": "string",
  "isFree": "boolean",
  "price": "number",
  "creatorId": "string",
  "address": "string",
  "city": "string",
  "latitude": "number",
  "longitude": "number",
  "createdAt": "number (timestamp)",
  "updatedAt": "number (timestamp, optional)"
}
```

### Discipline
```json
{
  "id": "string (auto-generated)",
  "name": "string",
  "color": "string (hex color)",
  "iconUrl": "string",
  "createdAt": "number (timestamp)"
}
```

### EventType
```json
{
  "id": "string (auto-generated)",
  "name": "string",
  "createdAt": "number (timestamp)"
}
```

### Favorite
```json
{
  "id": "string (auto-generated)",
  "userId": "string",
  "eventId": "string",
  "createdAt": "number (timestamp)"
}
```

### Followers
```json
{
  "id": "string (auto-generated)",
  "userId": "string (user being followed)",
  "followerId": "string (user following)",
  "createdAt": "number (timestamp)"
}
```

---

## Quick Start

### 1. Setup
```bash
npm install
```

### 2. Test Connection
```bash
npx ts-node src/scripts/connection-test.ts
```

### 3. Start Server
```bash
npm run start:dev
```

### 4. Access API
```
http://localhost:3000/api/users
http://localhost:3000/api/events
```

---

## Testing Endpoints with cURL

### Create a User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
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
    "description": "Great salsa event",
    "imageUrl": "https://example.com/event.jpg",
    "typeId": "type_1",
    "disciplineId": "discipline_1",
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

---

## Error Handling

All endpoints follow standard HTTP status codes:
- `200 OK` - Successful request
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Security (TODO)

- [ ] JWT Authentication
- [ ] Role-based access control (RBAC)
- [ ] Rate limiting
- [ ] Input validation
- [ ] CORS configuration per environment

---

## Environment Variables

```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=DanceMeetDB
NODE_ENV=development
PORT=3000
```

---

Generated: $(date)
