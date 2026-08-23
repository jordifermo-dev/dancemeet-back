import { Controller, Get, Query } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { GalleryCoverDto } from './gallery.dto';

/** Separate controller (not nested under :eventId like GalleryController)
 * because this batches across many events at once - backs the "browse
 * events by photo" mode on Events/Favorites/user-events, called only while
 * that view mode is active so the default event-list responses stay
 * unbloated. */
@Controller('api/gallery')
export class GalleryCoversController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get('covers')
  async getCovers(@Query('eventIds') eventIds: string): Promise<Record<string, GalleryCoverDto>> {
    const ids = eventIds ? eventIds.split(',').filter(Boolean) : [];
    return await this.galleryService.getCoverPhotosForEvents(ids);
  }
}
