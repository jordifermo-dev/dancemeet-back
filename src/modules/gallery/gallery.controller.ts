import { Body, Controller, Delete, Get, Param, Patch, Post, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from '../../common';
import { CurrentUserInterceptor } from '../user/current-user.interceptor';
import { UserDto } from '../user/user.dto';
import { GalleryService } from './gallery.service';
import { CreateGalleryPhotoDto, GalleryPhotoDto, GalleryPhotoWithPosterDto, GroupedReactionDto, ReactToPhotoDto } from './gallery.dto';

@Controller('api/events/:eventId/gallery')
@UseInterceptors(CurrentUserInterceptor)
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  async getGallery(@Param('eventId') eventId: string, @CurrentUser() user: UserDto): Promise<GalleryPhotoWithPosterDto[]> {
    return await this.galleryService.getEventGalleryDetailed(eventId, user.id!);
  }

  @Get('unread-count')
  async getUnreadCount(@Param('eventId') eventId: string, @CurrentUser() user: UserDto): Promise<{ count: number }> {
    const count = await this.galleryService.getUnreadCount(eventId, user.id!, 'public');
    return { count };
  }

  @Post('read')
  async markRead(@Param('eventId') eventId: string, @CurrentUser() user: UserDto): Promise<{ success: boolean }> {
    await this.galleryService.markGalleryRead(eventId, user.id!, 'public');
    return { success: true };
  }

  @Get(':photoId')
  async getPhoto(
    @Param('eventId') eventId: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: UserDto,
  ): Promise<GalleryPhotoWithPosterDto> {
    return await this.galleryService.getPhotoDetailed(eventId, photoId, user.id!);
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

  @Patch(':photoId/react')
  async reactToPhoto(
    @Param('eventId') eventId: string,
    @Param('photoId') photoId: string,
    @Body() dto: ReactToPhotoDto,
    @CurrentUser() user: UserDto,
  ): Promise<GroupedReactionDto[]> {
    return await this.galleryService.reactToPhoto(eventId, photoId, user.id!, dto.emoji);
  }

  @Patch(':photoId/unreact')
  async unreactToPhoto(
    @Param('eventId') eventId: string,
    @Param('photoId') photoId: string,
    @Body() dto: ReactToPhotoDto,
    @CurrentUser() user: UserDto,
  ): Promise<GroupedReactionDto[]> {
    return await this.galleryService.removeReactionFromPhoto(eventId, photoId, user.id!, dto.emoji);
  }
}
