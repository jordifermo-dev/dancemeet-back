import { FilterQuery, Model } from 'mongoose';
import { mapEventToDto } from '../config/mongoose.config';
import { CreateEventDto, EventDto, UpdateEventDto } from '../dto';
import { EventDocument } from '../schemas/event.schema';
import { handleDbOperation, isValidObjectId, InvalidIdException, escapeRegex } from '../common';

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
