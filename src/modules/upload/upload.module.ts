import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { SupabaseStorageService } from './supabase-storage.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, SupabaseStorageService],
})
export class UploadModule {}
