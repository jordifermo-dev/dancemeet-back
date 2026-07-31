import * as path from 'path';

/** The frontend's own static assets folder (a sibling repo on disk) - only
 * still used by scripts/migrate-local-images-to-supabase.ts to locate the
 * images that were written here before uploads moved to Supabase Storage. */
export function getFrontendAssetsRoot(): string {
  return (
    process.env.FRONTEND_ASSETS_DIR ??
    path.resolve(process.cwd(), '..', 'dancemeet-front', 'src', 'assets', 'images')
  );
}
