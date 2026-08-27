import { Model } from 'mongoose';
import { mapReviewToDto } from '../../config/mongoose.config';
import { ReviewDto } from './review.dto';
import { ReviewDocument } from './review.schema';
import { handleDbOperation } from '../../common';

export class ReviewRepository {
  private readonly resourceName = 'Review';

  constructor(private readonly reviewModel: Model<ReviewDocument>) {}

  async create(data: { eventId: string; authorUserId: string; organizerId: string; rating: number; comment?: string }): Promise<ReviewDto> {
    return handleDbOperation(this.resourceName, 'create', async () => {
      const createdDocument = await this.reviewModel.create({ ...data, createdAt: Date.now() });
      return mapReviewToDto(createdDocument);
    });
  }

  async findById(id: string): Promise<ReviewDto | null> {
    return handleDbOperation(this.resourceName, 'findById', async () => {
      const document = await this.reviewModel.findById(id).lean();
      return document ? mapReviewToDto(document) : null;
    });
  }

  async findByUserAndEvent(authorUserId: string, eventId: string): Promise<ReviewDto | null> {
    return handleDbOperation(this.resourceName, 'findByUserAndEvent', async () => {
      const document = await this.reviewModel.findOne({ authorUserId, eventId }).lean();
      return document ? mapReviewToDto(document) : null;
    });
  }

  async findByEvent(eventId: string): Promise<ReviewDto[]> {
    return handleDbOperation(this.resourceName, 'findByEvent', async () => {
      const documents = await this.reviewModel.find({ eventId }).sort({ createdAt: -1 }).lean();
      return documents.map((document) => mapReviewToDto(document));
    });
  }

  async update(id: string, patch: { rating: number; comment?: string }): Promise<ReviewDto | null> {
    return handleDbOperation(this.resourceName, 'update', async () => {
      const document = await this.reviewModel.findByIdAndUpdate(
        id,
        { $set: { ...patch, updatedAt: Date.now() } },
        { new: true },
      );
      return document ? mapReviewToDto(document) : null;
    });
  }

  async deleteById(id: string): Promise<void> {
    await handleDbOperation(this.resourceName, 'deleteById', async () => {
      await this.reviewModel.deleteOne({ _id: id });
    });
  }

  async setOrganizerReply(
    id: string,
    reply: { text: string; repliedByUserId: string; createdAt: number; updatedAt?: number },
  ): Promise<ReviewDto | null> {
    return handleDbOperation(this.resourceName, 'setOrganizerReply', async () => {
      const document = await this.reviewModel.findByIdAndUpdate(id, { $set: { organizerReply: reply } }, { new: true });
      return document ? mapReviewToDto(document) : null;
    });
  }

  async removeOrganizerReply(id: string): Promise<void> {
    await handleDbOperation(this.resourceName, 'removeOrganizerReply', async () => {
      await this.reviewModel.updateOne({ _id: id }, { $unset: { organizerReply: '' } });
    });
  }

  /** Average + count of every review ever left across an organizer's events.
   * A plain find + in-memory reduce rather than an aggregation pipeline -
   * matches this codebase's existing convention (see
   * GalleryRepository.findLatestCoverByEventIds's own comment on why -
   * `.aggregate()` isn't used anywhere else here, and review volume per
   * organizer stays small enough that this is simpler and just as fast). */
  async getOrganizerRating(organizerId: string): Promise<{ averageRating: number; count: number }> {
    return handleDbOperation(this.resourceName, 'getOrganizerRating', async () => {
      const documents = await this.reviewModel.find({ organizerId }).select('rating').lean();
      if (!documents.length) {
        return { averageRating: 0, count: 0 };
      }
      const total = documents.reduce((sum, document) => sum + document.rating, 0);
      return { averageRating: total / documents.length, count: documents.length };
    });
  }
}
