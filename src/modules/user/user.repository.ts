import { Model } from 'mongoose';
import { mapUserToDto } from '../../config/mongoose.config';
import { CreateUserDto, UpdateUserDto, UserDto } from './user.dto';
import { UserDocument } from './user.schema';
import { handleDbOperation, isValidObjectId, InvalidIdException, stripDiacritics } from '../../common';

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

  async findByEmail(email: string): Promise<UserDto | null> {
    return handleDbOperation(this.resourceName, 'findByEmail', async () => {
      const document = await this.userModel.findOne({ email }).lean();
      return document ? mapUserToDto(document) : null;
    });
  }

  /** Case- and accent-insensitive substring match on `name` ("Lluis" also
   * finds "Lluís"), for the event search bar ("search by title or organizer
   * name") and the "invite manager" user search. Filtered in application
   * code, not a $regex: MongoDB's collation (which can compare accented
   * letters as equal) only applies to comparison/sort operators, not regex
   * matching, so there's no query-level way to do this. */
  async findByNameContains(query: string): Promise<UserDto[]> {
    return handleDbOperation(this.resourceName, 'findByNameContains', async () => {
      const normalizedQuery = stripDiacritics(query).toLowerCase();
      const documents = await this.userModel.find().lean();
      return documents
        .filter((document) => stripDiacritics(document.name ?? '').toLowerCase().includes(normalizedQuery))
        .map((document) => mapUserToDto(document));
    });
  }

  /** A user can have the app open in several tabs/devices at once, so tokens
   * are additive ($addToSet dedupes) rather than a single overwritten value. */
  async addFcmToken(userId: string, token: string): Promise<boolean> {
    return handleDbOperation(this.resourceName, 'addFcmToken', async () => {
      if (!isValidObjectId(userId)) {
        throw new InvalidIdException(this.resourceName, userId);
      }
      const updatedDocument = await this.userModel.findByIdAndUpdate(userId, {
        $addToSet: { fcmTokens: token },
      });
      return !!updatedDocument;
    });
  }

  async removeFcmToken(userId: string, token: string): Promise<boolean> {
    return handleDbOperation(this.resourceName, 'removeFcmToken', async () => {
      if (!isValidObjectId(userId)) {
        throw new InvalidIdException(this.resourceName, userId);
      }
      const updatedDocument = await this.userModel.findByIdAndUpdate(userId, {
        $pull: { fcmTokens: token },
      });
      return !!updatedDocument;
    });
  }

  /** Users whose saved discipline/type/status preferences overlap a given
   * event's - same AND-across-categories semantics as EventRepository.findFiltered
   * uses from the other direction (event matching a user's filters). */
  async findMatchingEventPreferences(
    disciplineIds: string[],
    typeIds: string[],
    status: string,
  ): Promise<UserDto[]> {
    return handleDbOperation(this.resourceName, 'findMatchingEventPreferences', async () => {
      const documents = await this.userModel
        .find({
          disciplineIds: { $in: disciplineIds },
          eventTypeIds: { $in: typeIds },
          statusIds: status,
        })
        .lean();
      return documents.map((document) => mapUserToDto(document));
    });
  }
}
