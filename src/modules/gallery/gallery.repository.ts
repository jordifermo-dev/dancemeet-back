import { Model } from 'mongoose';
import { mapGalleryPhotoToDto } from '../../config/mongoose.config';
import { GalleryPhotoDto } from './gallery.dto';
import { GalleryPhotoDocument } from './gallery.schema';
import { handleDbOperation } from '../../common';

export class GalleryRepository {
  private readonly resourceName = 'GalleryPhoto';

  constructor(private readonly galleryModel: Model<GalleryPhotoDocument>) {}

  async create(data: { eventId?: string; posterUserId: string; photoUrl: string }): Promise<GalleryPhotoDto> {
    return handleDbOperation(this.resourceName, 'create', async () => {
      const createdDocument = await this.galleryModel.create({ ...data, createdAt: Date.now() });
      return mapGalleryPhotoToDto(createdDocument);
    });
  }

  async findByEvent(eventId: string): Promise<GalleryPhotoDto[]> {
    return handleDbOperation(this.resourceName, 'findByEvent', async () => {
      const documents = await this.galleryModel.find({ eventId }).sort({ createdAt: -1 }).lean();
      return documents.map((document) => mapGalleryPhotoToDto(document));
    });
  }

  async findByUser(posterUserId: string): Promise<GalleryPhotoDto[]> {
    return handleDbOperation(this.resourceName, 'findByUser', async () => {
      const documents = await this.galleryModel.find({ posterUserId }).sort({ createdAt: -1 }).lean();
      return documents.map((document) => mapGalleryPhotoToDto(document));
    });
  }

  async findById(id: string): Promise<GalleryPhotoDto | null> {
    return handleDbOperation(this.resourceName, 'findById', async () => {
      const document = await this.galleryModel.findById(id).lean();
      return document ? mapGalleryPhotoToDto(document) : null;
    });
  }

  async deleteById(id: string): Promise<void> {
    await handleDbOperation(this.resourceName, 'deleteById', async () => {
      await this.galleryModel.deleteOne({ _id: id });
    });
  }

  /** Latest photo per event (plus how many it has in total), for the "browse
   * events by photo" cover-image mode (see GalleryService.getCoverPhotosForEvents)
   * - the count lets that mode show a "multiple photos" hint per event
   * without a second round trip. No aggregation pipeline - galleries are
   * small enough that fetching every matching row sorted newest-first and
   * reducing to one-per-event (plus a running count) in memory is simpler
   * and stays consistent with the rest of this codebase, which doesn't use
   * `.aggregate()` anywhere else. */
  async findLatestCoverByEventIds(eventIds: string[]): Promise<Map<string, { photo: GalleryPhotoDto; count: number }>> {
    return handleDbOperation(this.resourceName, 'findLatestCoverByEventIds', async () => {
      if (!eventIds.length) {
        return new Map();
      }
      const documents = await this.galleryModel
        .find({ eventId: { $in: eventIds } })
        .sort({ createdAt: -1 })
        .lean();
      const coverByEventId = new Map<string, { photo: GalleryPhotoDto; count: number }>();
      for (const document of documents) {
        // The query above only ever matches documents whose eventId is one
        // of eventIds, so it's always set here - narrowed for TS since the
        // schema itself allows a profile-only photo to omit it.
        const eventId = document.eventId!;
        const existing = coverByEventId.get(eventId);
        if (!existing) {
          coverByEventId.set(eventId, { photo: mapGalleryPhotoToDto(document), count: 1 });
        } else {
          existing.count += 1;
        }
      }
      return coverByEventId;
    });
  }
}
