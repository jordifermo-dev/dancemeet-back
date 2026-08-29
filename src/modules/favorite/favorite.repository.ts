import { FilterQuery, Model } from 'mongoose';
import { mapFavoriteToDto } from '../../config/mongoose.config';
import { CreateFavoriteDto, FavoriteDto } from './favorite.dto';
import { FavoriteDocument } from './favorite.schema';
import { handleDbOperation } from '../../common';

export class FavoriteRepository {
  private readonly resourceName = 'Favorite';

  constructor(private readonly favoriteModel: Model<FavoriteDocument>) {}

  async create(favoriteData: CreateFavoriteDto): Promise<FavoriteDto> {
    return handleDbOperation(this.resourceName, 'create', async () => {
      const createdDocument = await this.favoriteModel.create({
        ...favoriteData,
        createdAt: favoriteData.createdAt ?? Date.now(),
      });
      return mapFavoriteToDto(createdDocument);
    });
  }

  async findByUser(userId: string): Promise<FavoriteDto[]> {
    return handleDbOperation(this.resourceName, 'findByUser', async () => {
      const documents = await this.favoriteModel.find({ userId }).lean();
      return documents.map((document) => mapFavoriteToDto(document));
    });
  }

  async findByEvent(eventId: string): Promise<FavoriteDto[]> {
    return handleDbOperation(this.resourceName, 'findByEvent', async () => {
      const documents = await this.favoriteModel.find({ eventId }).lean();
      return documents.map((document) => mapFavoriteToDto(document));
    });
  }

  async findByUserAndEvent(userId: string, eventId: string): Promise<FavoriteDto | null> {
    return handleDbOperation(this.resourceName, 'findByUserAndEvent', async () => {
      const document = await this.favoriteModel.findOne({ userId, eventId }).lean();
      return document ? mapFavoriteToDto(document) : null;
    });
  }

  async deleteByUserAndEvent(userId: string, eventId: string): Promise<void> {
    await handleDbOperation(this.resourceName, 'deleteByUserAndEvent', async () => {
      await this.favoriteModel.deleteOne({ userId, eventId });
    });
  }

  /** Used by the "whole series" attend toggle to know which instances a user
   * already favorited, so re-favoriting the series only creates the missing
   * ones instead of erroring on the duplicates. */
  async findByUserAndEvents(userId: string, eventIds: string[]): Promise<FavoriteDto[]> {
    return handleDbOperation(this.resourceName, 'findByUserAndEvents', async () => {
      const documents = await this.favoriteModel.find({ userId, eventId: { $in: eventIds } }).lean();
      return documents.map((document) => mapFavoriteToDto(document));
    });
  }

  async deleteManyByUserAndEvents(userId: string, eventIds: string[]): Promise<number> {
    return handleDbOperation(this.resourceName, 'deleteManyByUserAndEvents', async () => {
      const result = await this.favoriteModel.deleteMany({ userId, eventId: { $in: eventIds } });
      return result.deletedCount ?? 0;
    });
  }

  async count(filter: FilterQuery<FavoriteDocument> = {}): Promise<number> {
    return handleDbOperation(this.resourceName, 'count', async () => {
      return this.favoriteModel.countDocuments(filter);
    });
  }

  /** Like/favorite count per event, for a whole list of events at once
   * (event-card badges) - one $in query + in-memory reduce into a Map, same
   * shape as GalleryRepository.findLatestCoverByEventIds, not an aggregation. */
  async countManyByEvents(eventIds: string[]): Promise<Map<string, number>> {
    return handleDbOperation(this.resourceName, 'countManyByEvents', async () => {
      const countByEventId = new Map<string, number>();
      if (!eventIds.length) {
        return countByEventId;
      }
      const documents = await this.favoriteModel.find({ eventId: { $in: eventIds } }).select('eventId').lean();
      for (const document of documents) {
        countByEventId.set(document.eventId, (countByEventId.get(document.eventId) ?? 0) + 1);
      }
      return countByEventId;
    });
  }
}
