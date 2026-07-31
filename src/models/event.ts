import { ISocialLinks } from './socialLinks';

export interface IEvent {
  id: string;
  title: string;
  description: string;
  additionalInfo?: string;
  socialLinks?: ISocialLinks;
  imageUrl: string;
  typeIds: string[];
  disciplineIds: string[];
  eventDateFrom: number;
  eventDateTo: number;
  status: string;
  isFree: boolean;
  price: number;
  creatorId: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  createdAt: number;
  updatedAt?: number;
}
