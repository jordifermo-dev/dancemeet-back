import { Controller, Get } from '@nestjs/common';
import { Public } from '../common';

@Public()
@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      app: 'DanceMeet API Server',
      status: 'running',
      url: 'http://localhost:3000',
      database: 'DanceMeetDB',

      endpoints: {
        users: [
          'POST /api/users',
          'GET /api/users',
          'GET /api/users/:id',
          'PUT /api/users/:id',
          'DELETE /api/users/:id',
        ],
        events: [
          'POST /api/events',
          'GET /api/events',
          'GET /api/events/:id',
          'PUT /api/events/:id',
          'DELETE /api/events/:id',
        ],
        disciplines: [
          'POST /api/disciplines',
          'GET /api/disciplines',
          'GET /api/disciplines/:id',
          'PUT /api/disciplines/:id',
          'DELETE /api/disciplines/:id',
        ],
        eventTypes: [
          'POST /api/event-types',
          'GET /api/event-types',
          'GET /api/event-types/:id',
          'PUT /api/event-types/:id',
          'DELETE /api/event-types/:id',
        ],
        favorites: [
          'POST /api/favorites',
          'GET /api/favorites',
          'GET /api/favorites/user/:userId',
          'DELETE /api/favorites/:id',
        ],
        followers: [
          'POST /api/followers',
          'GET /api/followers',
          'GET /api/followers/user/:userId',
          'DELETE /api/followers/:id',
        ],
      },
    };
  }
}