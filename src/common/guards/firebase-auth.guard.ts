import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getAuth } from 'firebase-admin/auth';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UnauthenticatedException } from '../exceptions';

export interface FirebaseUser {
  uid: string;
  email?: string;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthenticatedException();
    }

    try {
      const decoded = await getAuth().verifyIdToken(token);
      (request as Request & { firebaseUser: FirebaseUser }).firebaseUser = {
        uid: decoded.uid,
        email: decoded.email,
      };
      return true;
    } catch {
      throw new UnauthenticatedException();
    }
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return undefined;
    }
    return header.slice('Bearer '.length).trim() || undefined;
  }
}
