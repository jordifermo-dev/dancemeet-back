import { Model } from 'mongoose';
import { mapEventTypeToDto } from '../../config/mongoose.config';
import { CreateEventTypeDto, EventTypeDto, UpdateEventTypeDto } from './event-type.dto';
import { EventTypeDocument } from './event-type.schema';
import {
  handleDbOperation,
  isValidObjectId,
  InvalidIdException,
} from '../../common';

export class EventTypeRepository {
  private readonly resourceName = 'EventType';

  constructor(private readonly eventTypeModel: Model<EventTypeDocument>) {}

  async create(eventTypeData: CreateEventTypeDto): Promise<EventTypeDto> {
    return handleDbOperation(this.resourceName, 'create', async () => {
      const createdDocument = await this.eventTypeModel.create({
        ...eventTypeData,
        createdAt: eventTypeData.createdAt ?? Date.now(),
      });
      return mapEventTypeToDto(createdDocument);
    });
  }

  async findById(id: string): Promise<EventTypeDto | null> {
    return handleDbOperation(this.resourceName, 'findById', async () => {
      if (!isValidObjectId(id)) {
        throw new InvalidIdException(this.resourceName, id);
      }
      const document = await this.eventTypeModel.findById(id).lean();
      return document ? mapEventTypeToDto(document) : null;
    });
  }

  async findAll(): Promise<EventTypeDto[]> {
    return handleDbOperation(this.resourceName, 'findAll', async () => {
      const documents = await this.eventTypeModel.find({}).sort({ createdAt: 1 }).lean();
      return documents.map((document) => mapEventTypeToDto(document));
    });
  }

  async update(id: string, document: UpdateEventTypeDto): Promise<boolean> {
    return handleDbOperation(this.resourceName, 'update', async () => {
      if (!isValidObjectId(id)) {
        throw new InvalidIdException(this.resourceName, id);
      }
      const updatedDocument = await this.eventTypeModel.findByIdAndUpdate(
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
      const deletedDocument = await this.eventTypeModel.findByIdAndDelete(id);
      return !!deletedDocument;
    });
  }

  async findByName(name: string): Promise<EventTypeDto | null> {
    return handleDbOperation(this.resourceName, 'findByName', async () => {
      const document = await this.eventTypeModel.findOne({ name }).lean();
      return document ? mapEventTypeToDto(document) : null;
    });
  }

  async count(): Promise<number> {
    return handleDbOperation(this.resourceName, 'count', async () => {
      return this.eventTypeModel.countDocuments();
    });
  }
}
