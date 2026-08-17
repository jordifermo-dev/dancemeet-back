import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';

// Windows resolves the Atlas SRV/TXT records fine via the OS resolver, but Node's
// own DNS client sometimes gets stuck pointed at a local resolver (e.g. 127.0.0.1
// from a VPN/antivirus network filter) that refuses connections. Forcing public
// DNS servers here avoids ECONNREFUSED on querySrv/queryTxt regardless of the
// machine's network config.
dns.setServers(['1.1.1.1', '8.8.8.8']);
import {
  DisciplineDto,
  EventTypeDto,
  EventDto,
  FavoriteDto,
  FollowersDto,
  NotificationDto,
  UserDto,
} from '../dto';

export const DISCIPLINE_MODEL = 'DISCIPLINE_MODEL';
export const EVENT_TYPE_MODEL = 'EVENT_TYPE_MODEL';
export const EVENT_MODEL = 'EVENT_MODEL';
export const FAVORITE_MODEL = 'FAVORITE_MODEL';
export const FOLLOWERS_MODEL = 'FOLLOWERS_MODEL';
export const NOTIFICATION_MODEL = 'NOTIFICATION_MODEL';
export const USER_MODEL = 'USER_MODEL';

export async function connectMongoose(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'DanceMeetDB';

  if (!uri) {
    throw new Error('MONGODB_URI is not configured');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  await mongoose.connect(uri, {
    dbName,
    autoIndex: true,
  });

  console.log(`✅ Mongoose connected to ${dbName}`);
  return mongoose;
}

export function mapDisciplineToDto(document: any): DisciplineDto {
  return {
    id: document._id?.toString(),
    name: document.name,
    color: document.color,
    iconUrl: document.iconUrl,
    createdAt: document.createdAt,
  };
}

export function mapEventTypeToDto(document: any): EventTypeDto {
  return {
    id: document._id?.toString(),
    name: document.name,
    createdAt: document.createdAt,
  };
}

export function mapEventToDto(document: any): EventDto {
  return {
    id: document._id?.toString(),
    title: document.title,
    description: document.description,
    additionalInfo: document.additionalInfo,
    socialLinks: document.socialLinks,
    imageUrl: document.imageUrl,
    // Falls back to the pre-migration singular field (wrapped into a
    // one-element array) for any document the backfill script hasn't
    // reached yet, same defensive idea as the fallbacks below.
    typeIds: document.typeIds ?? (document.typeId ? [document.typeId] : []),
    disciplineIds: document.disciplineIds ?? (document.disciplineId ? [document.disciplineId] : []),
    eventDateFrom: document.eventDateFrom,
    eventDateTo: document.eventDateTo,
    status: document.status,
    isFree: document.isFree,
    price: document.price,
    creatorId: document.creatorId,
    address: document.address,
    city: document.city,
    latitude: document.latitude,
    longitude: document.longitude,
    seriesId: document.seriesId,
    seriesIndex: document.seriesIndex,
    seriesTotal: document.seriesTotal,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export function mapFavoriteToDto(document: any): FavoriteDto {
  return {
    id: document._id?.toString(),
    userId: document.userId,
    eventId: document.eventId,
    createdAt: document.createdAt,
  };
}

export function mapFollowersToDto(document: any): FollowersDto {
  return {
    id: document._id?.toString(),
    userId: document.userId,
    followerId: document.followerId,
    createdAt: document.createdAt,
  };
}

export function mapNotificationToDto(document: any): NotificationDto {
  return {
    id: document._id?.toString(),
    userId: document.userId,
    type: document.type,
    title: document.title,
    body: document.body,
    data: document.data,
    read: document.read ?? false,
    createdAt: document.createdAt,
  };
}

export function mapUserToDto(document: any): UserDto {
  return {
    id: document._id?.toString(),
    name: document.name,
    email: document.email,
    phone: document.phone,
    socialLinks: document.socialLinks,
    photoUrl: document.photoUrl,
    city: document.city,
    address: document.address ?? '',
    latitude: document.latitude,
    longitude: document.longitude,
    distanceRange: document.distanceRange,
    eventDateFrom: document.eventDateFrom,
    eventDateTo: document.eventDateTo ?? undefined,
    // .lean() skips Mongoose's schema-default hydration, so documents created
    // before a field existed (or missing it for any other reason) come back
    // with it truly undefined instead of the schema default. Fall back here
    // so legacy documents match what a freshly created user would get.
    disabledNotificationTypes: document.disabledNotificationTypes ?? [],
    disciplineIds: document.disciplineIds ?? [],
    eventTypeIds: document.eventTypeIds ?? [],
    statusIds: document.statusIds ?? [],
    priceOptions: document.priceOptions ?? [],
    relationTypes: document.relationTypes ?? [],
    language: document.language ?? 'es',
    showEmail: document.showEmail ?? false,
    showPhone: document.showPhone ?? false,
    showCity: document.showCity ?? false,
    showLocation: document.showLocation ?? false,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    followedId: document.followedId ?? [],
    followingId: document.followingId ?? [],
    blockedIds: document.blockedIds ?? [],
    fcmTokens: document.fcmTokens ?? [],
  };
}
