import { FilterQuery, Model } from 'mongoose';
import { mapFollowersToDto } from '../config/mongoose.config';
import { CreateFollowersDto, FollowersDto, UpdateFollowersDto } from '../dto';
import { FollowersDocument } from '../schemas/followers.schema';
import { handleDbOperation, isValidObjectId, InvalidIdException } from '../common';

export class FollowersRepository {
  private readonly resourceName = 'Follower';

  constructor(private readonly followersModel: Model<FollowersDocument>) {}

  async create(followerData: CreateFollowersDto): Promise<FollowersDto> {
    return handleDbOperation(this.resourceName, 'create', async () => {
      const createdDocument = await this.followersModel.create({
        ...followerData,
        createdAt: followerData.createdAt ?? Date.now(),
      });
      return mapFollowersToDto(createdDocument);
    });
  }

  async findById(id: string): Promise<FollowersDto | null> {
    return handleDbOperation(this.resourceName, 'findById', async () => {
      if (!isValidObjectId(id)) {
        throw new InvalidIdException(this.resourceName, id);
      }
      const document = await this.followersModel.findById(id).lean();
      return document ? mapFollowersToDto(document) : null;
    });
  }

  async findAll(): Promise<FollowersDto[]> {
    return handleDbOperation(this.resourceName, 'findAll', async () => {
      const documents = await this.followersModel.find({}).sort({ createdAt: 1 }).lean();
      return documents.map((document) => mapFollowersToDto(document));
    });
  }

  async update(id: string, document: UpdateFollowersDto): Promise<boolean> {
    return handleDbOperation(this.resourceName, 'update', async () => {
      if (!isValidObjectId(id)) {
        throw new InvalidIdException(this.resourceName, id);
      }
      const updatedDocument = await this.followersModel.findByIdAndUpdate(
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
      const deletedDocument = await this.followersModel.findByIdAndDelete(id);
      return !!deletedDocument;
    });
  }

  async findByUser(userId: string): Promise<FollowersDto[]> {
    return handleDbOperation(this.resourceName, 'findByUser', async () => {
      const documents = await this.followersModel.find({ userId }).lean();
      return documents.map((document) => mapFollowersToDto(document));
    });
  }

  async findByFollower(followerId: string): Promise<FollowersDto[]> {
    return handleDbOperation(this.resourceName, 'findByFollower', async () => {
      const documents = await this.followersModel.find({ followerId }).lean();
      return documents.map((document) => mapFollowersToDto(document));
    });
  }

  async findByUserAndFollower(
    userId: string,
    followerId: string,
  ): Promise<FollowersDto | null> {
    return handleDbOperation(this.resourceName, 'findByUserAndFollower', async () => {
      const document = await this.followersModel.findOne({ userId, followerId }).lean();
      return document ? mapFollowersToDto(document) : null;
    });
  }

  async deleteByUserAndFollower(userId: string, followerId: string): Promise<void> {
    await handleDbOperation(this.resourceName, 'deleteByUserAndFollower', async () => {
      await this.followersModel.deleteOne({ userId, followerId });
    });
  }

  async deleteMany(filter: FilterQuery<FollowersDocument>): Promise<void> {
    await handleDbOperation(this.resourceName, 'deleteMany', async () => {
      await this.followersModel.deleteMany(filter);
    });
  }

  async countFollowers(userId: string): Promise<number> {
    return this.count({ userId });
  }

  async countFollowing(followerId: string): Promise<number> {
    return this.count({ followerId });
  }

  async count(filter: FilterQuery<FollowersDocument> = {}): Promise<number> {
    return handleDbOperation(this.resourceName, 'count', async () => {
      return this.followersModel.countDocuments(filter);
    });
  }
}
