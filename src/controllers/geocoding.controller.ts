import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Public } from '../common';
import { GeocodingService } from '../services/geocoding.service';

// Public: registration calls "reverse" before the account (and Firebase token) exists yet.
@Public()
@Controller('api/geocoding')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get('reverse')
  reverse(@Query('lat') lat: string, @Query('lng') lng: string) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      throw new BadRequestException('lat and lng must be numbers');
    }
    return this.geocodingService.reverseGeocode(latitude, longitude);
  }

  @Get('search')
  search(@Query('query') query?: string, @Query('type') type?: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    return this.geocodingService.autocomplete(query.trim(), type !== 'address');
  }

  @Get('place')
  place(@Query('placeId') placeId?: string) {
    if (!placeId) {
      throw new BadRequestException('placeId is required');
    }
    return this.geocodingService.placeDetails(placeId);
  }
}
