import { FilterQuery, Model } from 'mongoose';
import { mapEventToDto } from '../../config/mongoose.config';
import { CreateEventDto, EventDto, UpdateEventDto } from './event.dto';
import { CreateEventSeriesDto, PatchEventSeriesDto } from './event-series.dto';
import { EventDocument } from './event.schema';
import { handleDbOperation, isValidObjectId, InvalidIdException, escapeRegex } from '../../common';
import { RecurrenceOccurrence } from './recurrence';

/** The subset of CreateEventSeriesDto that's identical across every instance
 * of a series (everything except the recurrence rule / time-of-day, which
 * only exist to be expanded, not stored). */
export type SeriesBaseFields = Omit<CreateEventSeriesDto, 'recurrence' | 'timeFrom' | 'timeTo'>;

export class EventRepository {
  private readonly resourceName = 'Event';

  constructor(private readonly eventModel: Model<EventDocument>) {}

  async create(eventData: CreateEventDto): Promise<EventDto> {
    return handleDbOperation(this.resourceName, 'create', async () => {
      const createdDocument = await this.eventModel.create({
        ...eventData,
        // location isn't part of CreateEventDto (only latitude/longitude
        // are) - without deriving it here it silently keeps the schema's
        // [0, 0] default, which is nowhere near any real event and made
        // every newly created event invisible to the $near-based searches
        // findFiltered()/findNearby() use (Explorer's map, Events' list),
        // even though its latitude/longitude were saved correctly.
        location: { type: 'Point', coordinates: [eventData.longitude, eventData.latitude] },
        createdAt: eventData.createdAt ?? Date.now(),
      });
      return mapEventToDto(createdDocument);
    });
  }

  /** Bulk-inserts one Event document per occurrence, all sharing `seriesId`
   * and stamped with their 1-based position/total - first insertMany in this
   * repository (see EventService.createEventSeries doc comment for why: no
   * prior batch-insert precedent existed to follow, so this mirrors
   * create()'s own per-document `location` derivation instead). */
  async createSeries(
    baseFields: SeriesBaseFields,
    occurrences: RecurrenceOccurrence[],
    seriesId: string,
  ): Promise<EventDto[]> {
    return handleDbOperation(this.resourceName, 'createSeries', async () => {
      const now = Date.now();
      const docs = occurrences.map((occurrence, index) => ({
        ...baseFields,
        status: 'published',
        eventDateFrom: occurrence.eventDateFrom,
        eventDateTo: occurrence.eventDateTo,
        location: { type: 'Point', coordinates: [baseFields.longitude, baseFields.latitude] },
        seriesId,
        seriesIndex: index + 1,
        seriesTotal: occurrences.length,
        createdAt: now,
      }));
      const createdDocuments = await this.eventModel.insertMany(docs);
      return createdDocuments.map((document) => mapEventToDto(document));
    });
  }

  /** Attaches an already-existing event to a brand-new series as its first
   * instance (keeps its id/favorites/notification history untouched, only
   * stamps seriesId/seriesIndex=1/seriesTotal) and bulk-inserts the
   * remaining occurrences as new documents - same insertMany reasoning as
   * createSeries() above. `occurrences[0]` must already equal the existing
   * event's own eventDateFrom/eventDateTo (validated by the caller, see
   * EventService.attachRecurrenceToEvent), so this never rewrites its dates. */
  async attachToExistingSeries(
    existingId: string,
    baseFields: SeriesBaseFields,
    seriesId: string,
    occurrences: RecurrenceOccurrence[],
  ): Promise<EventDto[]> {
    return handleDbOperation(this.resourceName, 'attachToExistingSeries', async () => {
      const now = Date.now();
      await this.eventModel.findByIdAndUpdate(existingId, {
        $set: { seriesId, seriesIndex: 1, seriesTotal: occurrences.length, updatedAt: now },
      });
      const rest = occurrences.slice(1).map((occurrence, index) => ({
        ...baseFields,
        status: 'published',
        eventDateFrom: occurrence.eventDateFrom,
        eventDateTo: occurrence.eventDateTo,
        location: { type: 'Point', coordinates: [baseFields.longitude, baseFields.latitude] },
        seriesId,
        seriesIndex: index + 2,
        seriesTotal: occurrences.length,
        createdAt: now,
      }));
      const createdDocuments = rest.length ? await this.eventModel.insertMany(rest) : [];
      const updatedExisting = await this.eventModel.findById(existingId).lean();
      return [
        ...(updatedExisting ? [mapEventToDto(updatedExisting)] : []),
        ...createdDocuments.map((document) => mapEventToDto(document)),
      ];
    });
  }

  async findBySeriesId(seriesId: string): Promise<EventDto[]> {
    return handleDbOperation(this.resourceName, 'findBySeriesId', async () => {
      const documents = await this.eventModel.find({ seriesId }).sort({ eventDateFrom: 1 }).lean();
      return documents.map((document) => mapEventToDto(document));
    });
  }

  /** Applies every field of `patch` except timeFrom/timeTo (see
   * bulkShiftSeriesTime below, which needs a per-document date recompute
   * instead) to every instance of the series in one `updateMany`. */
  async updateManyBySeriesId(seriesId: string, patch: Omit<PatchEventSeriesDto, 'timeFrom' | 'timeTo'>): Promise<number> {
    return handleDbOperation(this.resourceName, 'updateManyBySeriesId', async () => {
      const update =
        patch.latitude !== undefined && patch.longitude !== undefined
          ? { ...patch, location: { type: 'Point', coordinates: [patch.longitude, patch.latitude] } }
          : patch;
      const result = await this.eventModel.updateMany({ seriesId }, { $set: { ...update, updatedAt: Date.now() } });
      return result.modifiedCount;
    });
  }

  /** Each instance keeps its own date, so shifting "the time of day" for a
   * whole series can't be a single flat updateMany - reads every instance,
   * recomputes eventDateFrom/eventDateTo per document (same date, new time,
   * same duration relative to the old start), and applies them in one
   * bulkWrite (first bulkWrite in this repository, same reasoning as
   * createSeries()'s first-insertMany doc comment above). */
  async bulkShiftSeriesTime(seriesId: string, timeFromHHmm: string, timeToHHmm: string): Promise<number> {
    return handleDbOperation(this.resourceName, 'bulkShiftSeriesTime', async () => {
      const documents = await this.eventModel.find({ seriesId }).lean();
      if (!documents.length) {
        return 0;
      }
      const [fromHours, fromMinutes] = timeFromHHmm.split(':').map(Number);
      const [toHours, toMinutes] = timeToHHmm.split(':').map(Number);
      const now = Date.now();
      const operations = documents.map((document) => {
        const from = new Date(document.eventDateFrom);
        from.setHours(fromHours, fromMinutes, 0, 0);
        const to = new Date(document.eventDateFrom);
        to.setHours(toHours, toMinutes, 0, 0);
        return {
          updateOne: {
            filter: { _id: document._id },
            update: { $set: { eventDateFrom: from.getTime(), eventDateTo: to.getTime(), updatedAt: now } },
          },
        };
      });
      const result = await this.eventModel.bulkWrite(operations);
      return result.modifiedCount;
    });
  }

  async deleteManyBySeriesId(seriesId: string): Promise<number> {
    return handleDbOperation(this.resourceName, 'deleteManyBySeriesId', async () => {
      const result = await this.eventModel.deleteMany({ seriesId });
      return result.deletedCount;
    });
  }

  async findById(id: string): Promise<EventDto | null> {
    return handleDbOperation(this.resourceName, 'findById', async () => {
      if (!isValidObjectId(id)) {
        throw new InvalidIdException(this.resourceName, id);
      }
      const document = await this.eventModel.findById(id).lean();
      return document ? mapEventToDto(document) : null;
    });
  }

  async findAll(): Promise<EventDto[]> {
    return handleDbOperation(this.resourceName, 'findAll', async () => {
      const documents = await this.eventModel.find({}).sort({ createdAt: 1 }).lean();
      return documents.map((document) => mapEventToDto(document));
    });
  }

  async findByIds(ids: string[]): Promise<EventDto[]> {
    return handleDbOperation(this.resourceName, 'findByIds', async () => {
      const validIds = ids.filter((id) => isValidObjectId(id));
      const documents = await this.eventModel.find({ _id: { $in: validIds } }).lean();
      return documents.map((document) => mapEventToDto(document));
    });
  }

  async update(id: string, document: UpdateEventDto): Promise<boolean> {
    return handleDbOperation(this.resourceName, 'update', async () => {
      if (!isValidObjectId(id)) {
        throw new InvalidIdException(this.resourceName, id);
      }
      // Same reasoning as create() above: location doesn't travel on its own,
      // so an edit that moves the event has to re-derive it from the new
      // latitude/longitude too, whenever both are actually part of this
      // update (the caller always sends them as a pair - see event-detail
      // .page.ts's saveEdit() - so a partial pair is never expected here,
      // but only transforming when both are present avoids ever writing a
      // half-formed coordinate if that assumption ever stops holding).
      const update =
        document.latitude !== undefined && document.longitude !== undefined
          ? {
              ...document,
              location: {
                type: 'Point',
                coordinates: [document.longitude, document.latitude],
              },
            }
          : document;
      const updatedDocument = await this.eventModel.findByIdAndUpdate(
        id,
        { $set: update },
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
      const deletedDocument = await this.eventModel.findByIdAndDelete(id);
      return !!deletedDocument;
    });
  }

  async findByCreator(creatorId: string): Promise<EventDto[]> {
    return handleDbOperation(this.resourceName, 'findByCreator', async () => {
      const documents = await this.eventModel.find({ creatorId }).lean();
      return documents.map((document) => mapEventToDto(document));
    });
  }

  /** Matches events whose disciplineIds array *contains* this id - Mongo
   * matches an array field against a scalar query value automatically. */
  async findByDiscipline(disciplineId: string): Promise<EventDto[]> {
    return handleDbOperation(this.resourceName, 'findByDiscipline', async () => {
      const documents = await this.eventModel.find({ disciplineIds: disciplineId }).lean();
      return documents.map((document) => mapEventToDto(document));
    });
  }

  async findByType(typeId: string): Promise<EventDto[]> {
    return handleDbOperation(this.resourceName, 'findByType', async () => {
      const documents = await this.eventModel.find({ typeIds: typeId }).lean();
      return documents.map((document) => mapEventToDto(document));
    });
  }

  async findByCity(city: string): Promise<EventDto[]> {
    return handleDbOperation(this.resourceName, 'findByCity', async () => {
      const documents = await this.eventModel.find({ city }).lean();
      return documents.map((document) => mapEventToDto(document));
    });
  }

  /** Events whose start falls within [dayStart, dayEnd] - the caller passes
   * local day boundaries, this just does the range match. */
  async findHappeningToday(dayStart: number, dayEnd: number): Promise<EventDto[]> {
    return handleDbOperation(this.resourceName, 'findHappeningToday', async () => {
      const documents = await this.eventModel
        .find({ eventDateFrom: { $gte: dayStart, $lte: dayEnd } })
        .lean();
      return documents.map((document) => mapEventToDto(document));
    });
  }

  async findUpcoming(currentTime: number): Promise<EventDto[]> {
    return handleDbOperation(this.resourceName, 'findUpcoming', async () => {
      const documents = await this.eventModel
        .find({ eventDateFrom: { $gte: currentTime } })
        .lean();
      return documents.map((document) => mapEventToDto(document));
    });
  }

  async findNearby(
    latitude: number,
    longitude: number,
    maxDistance: number,
  ): Promise<EventDto[]> {
    return handleDbOperation(this.resourceName, 'findNearby', async () => {
      const documents = await this.eventModel
        .find({
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [longitude, latitude],
              },
              $maxDistance: maxDistance,
            },
          },
        } as FilterQuery<EventDocument>)
        .lean();
      return documents.map((document) => mapEventToDto(document));
    });
  }

  async findFiltered(params: {
    disciplineIds?: string[];
    typeIds?: string[];
    statuses?: string[];
    dateFrom?: number;
    dateTo?: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
    search?: string;
    /** Ids of users whose name matches `search` - events they organize match
     * too, not just events whose title matches (see EventService.searchEvents). */
    matchingCreatorIds?: string[];
    /** 'free'/'paid' subset - same "empty means zero results" rule as
     * disciplineIds/typeIds below. */
    priceOptions?: string[];
  }): Promise<EventDto[]> {
    return handleDbOperation(this.resourceName, 'findFiltered', async () => {
      const filter: FilterQuery<EventDocument> = {};
      // !== undefined (not .length) - an explicit empty selection ("no
      // disciplines chosen") must match zero events, not be ignored like an
      // unset filter would be. $in: [] naturally matches nothing. Against an
      // array field, $in matches if ANY element overlaps - exactly "show
      // events that are (at least partly) one of the selected disciplines".
      if (params.disciplineIds !== undefined) {
        filter.disciplineIds = { $in: params.disciplineIds };
      }
      if (params.typeIds !== undefined) {
        filter.typeIds = { $in: params.typeIds };
      }
      if (params.statuses?.length) {
        filter.status = { $in: params.statuses };
      }
      if (params.priceOptions !== undefined) {
        const isFreeValues: boolean[] = [
          ...(params.priceOptions.includes('free') ? [true] : []),
          ...(params.priceOptions.includes('paid') ? [false] : []),
        ];
        filter.isFree = { $in: isFreeValues };
      }
      if (params.dateFrom !== undefined || params.dateTo !== undefined) {
        filter.eventDateFrom = {
          ...(params.dateFrom !== undefined ? { $gte: params.dateFrom } : {}),
          ...(params.dateTo !== undefined ? { $lte: params.dateTo } : {}),
        };
      }
      if (params.search) {
        // Title match OR organized by a creator whose name matches - the other
        // fields above stay implicit-AND alongside this $or.
        filter.$or = [
          { title: { $regex: escapeRegex(params.search), $options: 'i' } },
          ...(params.matchingCreatorIds?.length ? [{ creatorId: { $in: params.matchingCreatorIds } }] : []),
        ];
      }
      if (params.latitude !== undefined && params.longitude !== undefined && params.radius !== undefined) {
        filter.location = {
          $near: {
            $geometry: { type: 'Point', coordinates: [params.longitude, params.latitude] },
            $maxDistance: params.radius,
          },
        };
      }
      const documents = await this.eventModel.find(filter).sort({ eventDateFrom: 1 }).lean();
      return documents.map((document) => mapEventToDto(document));
    });
  }

  /** Flips `published` events whose end time has already passed over to
   * `finished` - doesn't touch `cancelled` events, which stay cancelled
   * regardless of date. Returns how many were updated. */
  async finishPastEvents(now: number): Promise<number> {
    return handleDbOperation(this.resourceName, 'finishPastEvents', async () => {
      const result = await this.eventModel.updateMany(
        { status: 'published', eventDateTo: { $lt: now } },
        { $set: { status: 'finished', updatedAt: now } },
      );
      return result.modifiedCount;
    });
  }

  async count(filter: FilterQuery<EventDocument> = {}): Promise<number> {
    return handleDbOperation(this.resourceName, 'count', async () => {
      return this.eventModel.countDocuments(filter);
    });
  }
}
