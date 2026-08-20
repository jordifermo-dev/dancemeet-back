import { Model } from 'mongoose';
import { mapEventManagerToDto } from '../../config/mongoose.config';
import { EventManagerDto } from './event-manager.dto';
import { EventManagerDocument, EventManagerRole, EventManagerStatus } from './event-manager.schema';
import { handleDbOperation } from '../../common';

export class EventManagerRepository {
  private readonly resourceName = 'EventManagerInvite';

  constructor(private readonly eventManagerModel: Model<EventManagerDocument>) {}

  async create(data: {
    eventId: string;
    userId: string;
    invitedByUserId: string;
    role: EventManagerRole;
  }): Promise<EventManagerDto> {
    return handleDbOperation(this.resourceName, 'create', async () => {
      const createdDocument = await this.eventManagerModel.create({
        ...data,
        status: 'pending',
        createdAt: Date.now(),
      });
      return mapEventManagerToDto(createdDocument);
    });
  }

  /** Bulk version of create() - one pending row per event id, all invited by
   * the same user with the same role in the same call. Used to invite
   * someone across every instance of a recurring series at once (same
   * pattern as FavoriteRepository being bulk-inserted from
   * FavoriteService.addSeriesToFavorites). */
  async createMany(
    eventIds: string[],
    userId: string,
    invitedByUserId: string,
    role: EventManagerRole,
  ): Promise<EventManagerDto[]> {
    return handleDbOperation(this.resourceName, 'createMany', async () => {
      const now = Date.now();
      const created = await this.eventManagerModel.insertMany(
        eventIds.map((eventId) => ({
          eventId,
          userId,
          invitedByUserId,
          role,
          status: 'pending' as const,
          createdAt: now,
        })),
      );
      return created.map((document) => mapEventManagerToDto(document));
    });
  }

  /** Re-invites an existing row (any status) as a new pending invite with a
   * possibly different role - used to "promote" someone already invited (or
   * already accepted) as an attendee up to manager, instead of bouncing off
   * the unique {eventId,userId} index with an "already invited" error. */
  async upsertAsPending(
    eventIds: string[],
    userId: string,
    invitedByUserId: string,
    role: EventManagerRole,
  ): Promise<void> {
    return handleDbOperation(this.resourceName, 'upsertAsPending', async () => {
      await this.eventManagerModel.updateMany(
        { eventId: { $in: eventIds }, userId },
        { $set: { invitedByUserId, role, status: 'pending', createdAt: Date.now() }, $unset: { respondedAt: 1 } },
      );
    });
  }

  /** Every event this user has an accepted (not pending) invite for, of the
   * given role - used to treat an accepted manager the same as the creator
   * for the "Organizas" relation on the Favorites/Mis-eventos lists (an
   * accepted attendee-role invite must NOT count). */
  async findAcceptedByUser(userId: string, role: EventManagerRole): Promise<EventManagerDto[]> {
    return handleDbOperation(this.resourceName, 'findAcceptedByUser', async () => {
      const documents = await this.eventManagerModel.find({ userId, role, status: 'accepted' }).lean();
      return documents.map((document) => mapEventManagerToDto(document));
    });
  }

  async findByEvent(eventId: string): Promise<EventManagerDto[]> {
    return handleDbOperation(this.resourceName, 'findByEvent', async () => {
      const documents = await this.eventManagerModel.find({ eventId }).lean();
      return documents.map((document) => mapEventManagerToDto(document));
    });
  }

  async findByEventAndUser(eventId: string, userId: string, role?: EventManagerRole): Promise<EventManagerDto | null> {
    return handleDbOperation(this.resourceName, 'findByEventAndUser', async () => {
      const document = await this.eventManagerModel.findOne({ eventId, userId, ...(role ? { role } : {}) }).lean();
      return document ? mapEventManagerToDto(document) : null;
    });
  }

  /** Every pending/accepted row for this user across a set of event ids - used
   * to respond to (or remove) a series-wide invite/grant in one call. */
  async findByEventsAndUser(eventIds: string[], userId: string): Promise<EventManagerDto[]> {
    return handleDbOperation(this.resourceName, 'findByEventsAndUser', async () => {
      const documents = await this.eventManagerModel
        .find({ eventId: { $in: eventIds }, userId })
        .lean();
      return documents.map((document) => mapEventManagerToDto(document));
    });
  }

  async updateStatusManyByEventsAndUser(
    eventIds: string[],
    userId: string,
    status: EventManagerStatus,
  ): Promise<number> {
    return handleDbOperation(this.resourceName, 'updateStatusManyByEventsAndUser', async () => {
      const result = await this.eventManagerModel.updateMany(
        { eventId: { $in: eventIds }, userId },
        { $set: { status, respondedAt: Date.now() } },
      );
      return result.modifiedCount ?? 0;
    });
  }

  /** role, when given, only deletes rows of that role - e.g. "quitar como
   * organizador" must leave an underlying attendee-role row (if the invite
   * system is ever extended to keep both) untouched. Currently a user only
   * ever has one row at all (role gets overwritten by upsertAsPending on
   * promotion), so this mostly guards against deleting the wrong thing by
   * mistake rather than a real dual-row scenario today. */
  async deleteManyByEventsAndUser(eventIds: string[], userId: string, role?: EventManagerRole): Promise<number> {
    return handleDbOperation(this.resourceName, 'deleteManyByEventsAndUser', async () => {
      const result = await this.eventManagerModel.deleteMany({
        eventId: { $in: eventIds },
        userId,
        ...(role ? { role } : {}),
      });
      return result.deletedCount ?? 0;
    });
  }
}
