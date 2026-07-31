import { ISocialLinks } from './socialLinks';

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
  eventDateFrom?: number;
  eventDateTo?: number | null;
  notificationsEnabled: boolean;
  disciplineIds: string[];
  eventTypeIds: string[];
  statusIds: string[];
  language: string;
  showEmail: boolean;
  showPhone: boolean;
  showCity: boolean;
  showLocation: boolean;
  createdAt: number;
  updatedAt?: number;
  lastLoginAt?: number;
  followedId: string[];
  followingId: string[];
  blockedIds: string[];
}
