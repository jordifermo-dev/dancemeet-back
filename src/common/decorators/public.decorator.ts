import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a controller or route handler as reachable without a Firebase
 * ID token. See FirebaseAuthGuard, which is registered globally.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
