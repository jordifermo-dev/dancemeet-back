import { Model } from 'mongoose';
import { mapFollowersToDto } from '../../config/mongoose.config';
import { CreateFollowersDto, FollowersDto } from './followers.dto';
import { FollowersDocument } from './followers.schema';
import { handleDbOperation } from '../../common';

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
}
