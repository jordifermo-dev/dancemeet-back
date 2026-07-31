import { FilterQuery, Model } from 'mongoose';
import { mapUserToDto } from '../config/mongoose.config';
import { CreateUserDto, UpdateUserDto, UserDto } from '../dto';
import { UserDocument } from '../schemas/user.schema';
import { handleDbOperation, isValidObjectId, InvalidIdException, escapeRegex } from '../common';

export class UserRepository {
  private readonly resourceName = 'User';

  constructor(private readonly userModel: Model<UserDocument>) {}

  async create(userData: CreateUserDto): Promise<UserDto> {
    return handleDbOperation(this.resourceName, 'create', async () => {
      const createdDocument = await this.userModel.create({
        ...userData,
        createdAt: userData.createdAt ?? Date.now(),
      });
      return mapUserToDto(createdDocument);
    });
  }

  async findById(id: string): Promise<UserDto | null> {
    return handleDbOperation(this.resourceName, 'findById', async () => {
      if (!isValidObjectId(id)) {
        throw new InvalidIdException(this.resourceName, id);
      }
      const document = await this.userModel.findById(id).lean();
      return document ? mapUserToDto(document) : null;
    });
  }

  async findAll(): Promise<UserDto[]> {
    return handleDbOperation(this.resourceName, 'findAll', async () => {
      const documents = await this.userModel.find({}).sort({ createdAt: 1 }).lean();
      return documents.map((document) => mapUserToDto(document));
    });
  }

  async findByIds(ids: string[]): Promise<UserDto[]> {
    return handleDbOperation(this.resourceName, 'findByIds', async () => {
      const validIds = ids.filter((id) => isValidObjectId(id));
      const documents = await this.userModel.find({ _id: { $in: validIds } }).lean();
      return documents.map((document) => mapUserToDto(document));
    });
  }

  async update(id: string, document: UpdateUserDto): Promise<boolean> {
    return handleDbOperation(this.resourceName, 'update', async () => {
      if (!isValidObjectId(id)) {
        throw new InvalidIdException(this.resourceName, id);
      }
      const updatedDocument = await this.userModel.findByIdAndUpdate(
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
      const deletedDocument = await this.userModel.findByIdAndDelete(id);
      return !!deletedDocument;
    });
  }

  async findByEmail(email: string): Promise<UserDto | null> {
    return handleDbOperation(this.resourceName, 'findByEmail', async () => {
      const document = await this.userModel.findOne({ email }).lean();
      return document ? mapUserToDto(document) : null;
    });
  }

  /** Case-insensitive substring match on `name`, for the event search bar
   * ("search by title or organizer name"). Escapes regex metacharacters so a
   * name like "A.J." or "(DJ)" is matched literally, not as a pattern. */
  async findByNameContains(query: string): Promise<UserDto[]> {
    return handleDbOperation(this.resourceName, 'findByNameContains', async () => {
      const documents = await this.userModel.find({ name: { $regex: escapeRegex(query), $options: 'i' } }).lean();
      return documents.map((document) => mapUserToDto(document));
    });
  }

  async findByCity(city: string): Promise<UserDto[]> {
    return handleDbOperation(this.resourceName, 'findByCity', async () => {
      const documents = await this.userModel.find({ city }).lean();
      return documents.map((document) => mapUserToDto(document));
    });
  }

  async findByDiscipline(disciplineId: string): Promise<UserDto[]> {
    return handleDbOperation(this.resourceName, 'findByDiscipline', async () => {
      const documents = await this.userModel.find({ disciplineIds: disciplineId }).lean();
      return documents.map((document) => mapUserToDto(document));
    });
  }

  async findByEventType(eventTypeId: string): Promise<UserDto[]> {
    return handleDbOperation(this.resourceName, 'findByEventType', async () => {
      const documents = await this.userModel.find({ eventTypeIds: eventTypeId }).lean();
      return documents.map((document) => mapUserToDto(document));
    });
  }

  async findByStatus(statusId: string): Promise<UserDto[]> {
    return handleDbOperation(this.resourceName, 'findByStatus', async () => {
      const documents = await this.userModel.find({ statusIds: statusId }).lean();
      return documents.map((document) => mapUserToDto(document));
    });
  }

  async findNearby(
    latitude: number,
    longitude: number,
    maxDistance: number,
  ): Promise<UserDto[]> {
    return handleDbOperation(this.resourceName, 'findNearby', async () => {
      const documents = await this.userModel
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
        } as FilterQuery<UserDocument>)
        .lean();
      return documents.map((document) => mapUserToDto(document));
    });
  }

  async count(filter: FilterQuery<UserDocument> = {}): Promise<number> {
    return handleDbOperation(this.resourceName, 'count', async () => {
      return this.userModel.countDocuments(filter);
    });
  }

  async addBlockedId(userId: string, blockedId: string): Promise<boolean> {
    return handleDbOperation(this.resourceName, 'addBlockedId', async () => {
      if (!isValidObjectId(userId)) {
        throw new InvalidIdException(this.resourceName, userId);
      }
      const updatedDocument = await this.userModel.findByIdAndUpdate(userId, {
        $addToSet: { blockedIds: blockedId },
      });
      return !!updatedDocument;
    });
  }
}
