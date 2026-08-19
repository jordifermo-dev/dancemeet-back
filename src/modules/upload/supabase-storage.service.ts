import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService {
  private client: SupabaseClient | null = null;

  private get bucket(): string {
    return process.env.SUPABASE_STORAGE_BUCKET ?? 'dancemeet-images';
  }

  /** Lazily created (not in the constructor) so a missing/misconfigured env
   * var only breaks the specific upload request that needs it, not the
   * whole app's startup. */
  private getClient(): SupabaseClient {
    if (this.client) {
      return this.client;
    }
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new InternalServerErrorException(
        'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not configured',
      );
    }
    // Service role key (server-only secret, never sent to the frontend) -
    // bypasses row-level security, which is fine since only this backend
    // ever writes to the bucket; the bucket's own public-read setting is
    // what lets the app's <img> tags load these without auth.
    this.client = createClient(url, serviceRoleKey);
    return this.client;
  }

  /** Uploads a buffer under `path` (e.g. "profile/janasmith-172839.jpg") and
   * returns its public URL. */
  async upload(path: string, buffer: Buffer, contentType: string): Promise<string> {
    const client = this.getClient();
    const { error } = await client.storage.from(this.bucket).upload(path, buffer, {
      contentType,
      upsert: false,
    });
    if (error) {
      throw new InternalServerErrorException(`Supabase upload failed: ${error.message}`);
    }
    const { data } = client.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
