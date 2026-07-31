import { Db, Collection, UpdateResult, DeleteResult } from 'mongodb';
import {
  handleDbOperation,
  toObjectId,
} from '../common/repository-error.handler';

export abstract class BaseRepository<T extends Record<string, any>> {
  protected collection: Collection<any>;
  protected abstract readonly resourceName: string;

  constructor(protected db: Db, collectionName: string) {
    this.collection = db.collection<any>(collectionName);
  }

  async create(document: Omit<T, 'id'>): Promise<T & { id: string }> {
    return handleDbOperation(this.resourceName, 'create', async () => {
      const result = await this.collection.insertOne(document);
      return {
        ...document,
        id: result.insertedId.toString(),
      } as T & { id: string };
    });
  }

  async findById(id: string): Promise<(T & { id?: string }) | null> {
    return handleDbOperation(this.resourceName, 'findById', async () => {
      const objectId = toObjectId(id, this.resourceName);
      const document = await this.collection.findOne({ _id: objectId });
      if (!document) {
        return null;
      }
      return { ...document, id: document._id.toString() } as T & { id: string };
    });
  }

  async findAll(): Promise<Array<T & { id?: string }>> {
    return handleDbOperation(this.resourceName, 'findAll', async () => {
      const documents = await this.collection.find({}).toArray();
      return documents.map((document) => ({
        ...document,
        id: document._id.toString(),
      })) as Array<T & { id: string }>;
    });
  }

  async findByFilter(filter: Record<string, any>): Promise<Array<T & { id?: string }>> {
    return handleDbOperation(this.resourceName, 'findByFilter', async () => {
      const documents = await this.collection.find(filter).toArray();
      return documents.map((document) => ({
        ...document,
        id: document._id.toString(),
      })) as Array<T & { id: string }>;
    });
  }

  async update(id: string, document: Partial<T>): Promise<UpdateResult> {
    return handleDbOperation(this.resourceName, 'update', async () => {
      const objectId = toObjectId(id, this.resourceName);
      const { id: _, ...updateData } = document as any;
      return this.collection.updateOne(
        { _id: objectId } as any,
        { $set: updateData },
      );
    });
  }

  async delete(id: string): Promise<DeleteResult> {
    return handleDbOperation(this.resourceName, 'delete', async () => {
      const objectId = toObjectId(id, this.resourceName);
      return this.collection.deleteOne({ _id: objectId } as any);
    });
  }

  async deleteMany(filter: Record<string, any>): Promise<DeleteResult> {
    return handleDbOperation(this.resourceName, 'deleteMany', async () => {
      return this.collection.deleteMany(filter);
    });
  }

  async count(filter?: Record<string, any>): Promise<number> {
    return handleDbOperation(this.resourceName, 'count', async () => {
      return this.collection.countDocuments(filter || {});
    });
  }
}
