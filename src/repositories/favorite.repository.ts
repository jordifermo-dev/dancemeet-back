import { FilterQuery, Model } from 'mongoose';
import { mapFavoriteToDto } from '../config/mongoose.config';
import { CreateFavoriteDto, FavoriteDto, UpdateFavoriteDto } from '../dto';
import { FavoriteDocument } from '../schemas/favorite.schema';
import { handleDbOperation, isValidObjectId, InvalidIdException } from '../common';

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

  async findById(id: string): Promise<FavoriteDto | null> {
    return handleDbOperation(this.resourceName, 'findById', async () => {
      if (!isValidObjectId(id)) {
        throw new InvalidIdException(this.resourceName, id);
      }
      const document = await this.favoriteModel.findById(id).lean();
      return document ? mapFavoriteToDto(document) : null;
    });
  }

  async findAll(): Promise<FavoriteDto[]> {
    return handleDbOperation(this.resourceName, 'findAll', async () => {
      const documents = await this.favoriteModel.find({}).sort({ createdAt: 1 }).lean();
      return documents.map((document) => mapFavoriteToDto(document));
    });
  }

  async update(id: string, document: UpdateFavoriteDto): Promise<boolean> {
    return handleDbOperation(this.resourceName, 'update', async () => {
      if (!isValidObjectId(id)) {
        throw new InvalidIdException(this.resourceName, id);
      }
      const updatedDocument = await this.favoriteModel.findByIdAndUpdate(
        id,
        { $set: document },
        { new: true },
      );
      return !!updatedDocument;
    });
  }

  async delete(id: string): Promise<boolean> {
    return handleDbOperation(this.resourceName, 'delete', async () => {
      if (!isValidObjectId(id)) {
        throw new InvalidIdException(this.resourceName, id);
      }
      const deletedDocument = await this.favoriteModel.findByIdAndDelete(id);
      return !!deletedDocument;
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
}
