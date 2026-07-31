import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseStorageService } from './supabase-storage.service';

export type UploadKind = 'profile' | 'event';

const KIND_FOLDERS: Record<UploadKind, string> = {
  profile: 'profile',
  event: 'events',
};

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Unicode combining diacritical marks block (0x0300-0x036f) - the accents
// that split off ñ/ç/á/etc. once NFD-normalized. Filtered by numeric char
// code range rather than a regex literal, since that range is fragile to
// type/copy as source text (it's easy to end up with the literal combining
// characters themselves instead of the escaped code points).
const COMBINING_MARK_MIN = 0x0300;
const COMBINING_MARK_MAX = 0x036f;

/** Strips accents/ñ/ç (NFD-normalize, then drop the combining marks that
 * split off) and every non-alphanumeric character - spaces included, per
 * "sin espacios" - leaving a plain lowercase run of letters/digits. */
function slugify(input: string): string {
  return input
    .normalize('NFD')
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code < COMBINING_MARK_MIN || code > COMBINING_MARK_MAX;
    })
    .join('')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

@Injectable()
export class UploadService {
  constructor(private readonly storage: SupabaseStorageService) {}

  async saveImage(kind: UploadKind, name: string, dataUrl: string): Promise<{ url: string }> {
    const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
      throw new BadRequestException('dataUrl must be a base64 image data URL');
    }
    const [, mimeType, base64] = match;
    const extension = MIME_EXTENSIONS[mimeType];
    if (!extension) {
      throw new BadRequestException(`Unsupported image type: ${mimeType}`);
    }

    const folder = KIND_FOLDERS[kind];
    const slug = slugify(name) || 'sinnombre';
    const filename = `${slug}-${Date.now()}.${extension}`;
    const url = await this.storage.upload(`${folder}/${filename}`, Buffer.from(base64, 'base64'), mimeType);

    return { url };
  }
}
