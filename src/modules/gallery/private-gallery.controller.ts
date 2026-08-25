import { Body, Controller, Get, Param, Post, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from '../../common';
import { CurrentUserInterceptor } from '../user/current-user.interceptor';
import { UserDto } from '../user/user.dto';
import { GalleryService } from './gallery.service';
import { CreateGalleryPhotoDto, GalleryPhotoDto, GalleryPhotoWithPosterDto } from './gallery.dto';

/** The event's private, attendees-only gallery - unlike GalleryController's
 * public routes, GET here also needs @CurrentUser() (see
 * GalleryService.getPrivateEventGalleryDetailed's own assertCanAccessPrivateArea
 * check - viewing this one absolutely does depend on who's asking). */
@Controller('api/events/:eventId/private-gallery')
@UseInterceptors(CurrentUserInterceptor)
export class PrivateGalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  async getPrivateGallery(
    @Param('eventId') eventId: string,
    @CurrentUser() user: UserDto,
  ): Promise<GalleryPhotoWithPosterDto[]> {
    return await this.galleryService.getPrivateEventGalleryDetailed(eventId, user.id!);
  }

  @Post()
  async postPrivatePhoto(
    @Param('eventId') eventId: string,
    @Body() dto: CreateGalleryPhotoDto,
    @CurrentUser() user: UserDto,
  ): Promise<GalleryPhotoDto> {
    return await this.galleryService.postPrivatePhoto(eventId, user.id!, dto.photoUrl);
  }
}
