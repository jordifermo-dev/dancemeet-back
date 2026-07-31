import { Module } from '@nestjs/common';
import { GeocodingController } from '../controllers/geocoding.controller';
import { GeocodingService } from '../services/geocoding.service';

@Module({
  controllers: [GeocodingController],
  providers: [GeocodingService],
})
export class GeocodingModule {}
