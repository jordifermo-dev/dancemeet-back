import { Body, Controller, Post } from '@nestjs/common';
import { UploadImageDto } from './upload.dto';
import { UploadService } from './upload.service';

@Controller('api/uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  async uploadImage(@Body() body: UploadImageDto): Promise<{ url: string }> {
    // Supabase Storage's own public URL is already absolute, unlike the old
    // local-disk path which needed this request's own host prefixed onto it.
    return this.uploadService.saveImage(body.type, body.name, body.dataUrl);
  }
}
