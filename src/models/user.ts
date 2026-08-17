import { ISocialLinks } from './socialLinks';
import { NotificationType } from '../schemas/notification.schema';

export interface IUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  socialLinks?: ISocialLinks;
  photoUrl?: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceRange: number;
  eventDateFrom?: number | null;
  eventDateTo?: number | null;
  disabledNotificationTypes: NotificationType[];
  disciplineIds: string[];
  eventTypeIds: string[];
  statusIds: string[];
  priceOptions: string[];
  relationTypes: string[];
  language: string;
  showEmail: boolean;
  showPhone: boolean;
  showCity: boolean;
  showLocation: boolean;
  createdAt: number;
  updatedAt?: number;
  followedId: string[];
  followingId: string[];
  blockedIds: string[];
  fcmTokens: string[];
}
