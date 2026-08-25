import { Body, Controller, Delete, Get, Param, Patch, Post, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from '../../common';
import { CurrentUserInterceptor } from '../user/current-user.interceptor';
import { UserDto } from '../user/user.dto';
import { GalleryService } from './gallery.service';
import { CreateGalleryPhotoDto, GalleryPhotoDto, GalleryPhotoWithPosterDto } from './gallery.dto';

@Controller('api/events/:eventId/gallery')
@UseInterceptors(CurrentUserInterceptor)
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  async getGallery(@Param('eventId') eventId: string): Promise<GalleryPhotoWithPosterDto[]> {
    return await this.galleryService.getEventGalleryDetailed(eventId);
  }

  @Post()
  async postPhoto(
    @Param('eventId') eventId: string,
    @Body() dto: CreateGalleryPhotoDto,
    @CurrentUser() user: UserDto,
  ): Promise<GalleryPhotoDto> {
    return await this.galleryService.postPhoto(eventId, user.id!, dto.photoUrl);
  }

  @Delete(':photoId')
  async deletePhoto(
    @Param('eventId') eventId: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: UserDto,
  ): Promise<{ success: boolean }> {
    await this.galleryService.deletePhoto(eventId, photoId, user.id!);
    return { success: true };
  }

  @Patch(':photoId/share-public')
  async sharePhotoToPublicGallery(
    @Param('eventId') eventId: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: UserDto,
  ): Promise<{ success: boolean }> {
    await this.galleryService.shareToPublicGallery(eventId, photoId, user.id!);
    return { success: true };
  }

  @Patch(':photoId/move-private')
  async movePhotoToPrivateGallery(
    @Param('eventId') eventId: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: UserDto,
  ): Promise<{ success: boolean }> {
    await this.galleryService.moveToPrivateGallery(eventId, photoId, user.id!);
    return { success: true };
  }
}
