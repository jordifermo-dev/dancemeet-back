import { Body, Controller, Delete, Get, Param, Post, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from '../../common';
import { CurrentUserInterceptor } from '../user/current-user.interceptor';
import { UserDto } from '../user/user.dto';
import { GalleryService } from './gallery.service';
import { CreateGalleryPhotoDto, GalleryPhotoDto, GalleryPhotoWithEventDto } from './gallery.dto';

/** GET is public - no CurrentUserInterceptor, same as UserController's own
 * GET endpoints (viewing someone's gallery doesn't depend on who's asking).
 * POST/DELETE (posting/removing a photo straight to your own profile, with
 * no event involved) do need it, same as GalleryController's own writes. */
@Controller('api/users/:userId/gallery')
export class UserGalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  async getGallery(@Param('userId') userId: string): Promise<GalleryPhotoWithEventDto[]> {
    return await this.galleryService.getUserGalleryDetailed(userId);
  }

  @Post()
  @UseInterceptors(CurrentUserInterceptor)
  async postPhoto(
    @Param('userId') userId: string,
    @Body() dto: CreateGalleryPhotoDto,
    @CurrentUser() user: UserDto,
  ): Promise<GalleryPhotoDto> {
    return await this.galleryService.postProfilePhoto(userId, user.id!, dto.photoUrl);
  }

  @Delete(':photoId')
  @UseInterceptors(CurrentUserInterceptor)
  async deletePhoto(
    @Param('userId') userId: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: UserDto,
  ): Promise<{ success: boolean }> {
    await this.galleryService.deleteProfilePhoto(userId, photoId, user.id!);
    return { success: true };
  }
}
