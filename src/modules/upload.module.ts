import { Module } from '@nestjs/common';
import { UploadController } from '../controllers/upload.controller';
import { UploadService } from '../services/upload.service';
import { SupabaseStorageService } from '../services/supabase-storage.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, SupabaseStorageService],
})
export class UploadModule {}
