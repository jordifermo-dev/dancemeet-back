import { Model } from 'mongoose';
import { mapDisciplineToDto } from '../../config/mongoose.config';
import { CreateDisciplineDto, DisciplineDto, UpdateDisciplineDto } from './discipline.dto';
import { DisciplineDocument } from './discipline.schema';
import { handleDbOperation, isValidObjectId, InvalidIdException } from '../../common';

export class DisciplineRepository {
  private readonly resourceName = 'Discipline';

  constructor(private readonly disciplineModel: Model<DisciplineDocument>) {}

  async create(disciplineData: CreateDisciplineDto): Promise<DisciplineDto> {
    return handleDbOperation(this.resourceName, 'create', async () => {
      const createdDocument = await this.disciplineModel.create({
        ...disciplineData,
        createdAt: disciplineData.createdAt ?? Date.now(),
      });
      return mapDisciplineToDto(createdDocument);
    });
  }

  async findById(id: string): Promise<DisciplineDto | null> {
    return handleDbOperation(this.resourceName, 'findById', async () => {
      if (!isValidObjectId(id)) {
        throw new InvalidIdException(this.resourceName, id);
      }
      const document = await this.disciplineModel.findById(id).lean();
      return document ? mapDisciplineToDto(document) : null;
    });
  }

  async findAll(): Promise<DisciplineDto[]> {
    return handleDbOperation(this.resourceName, 'findAll', async () => {
      const documents = await this.disciplineModel.find({}).sort({ createdAt: 1 }).lean();
      return documents.map((document) => mapDisciplineToDto(document));
    });
  }

  async update(id: string, document: UpdateDisciplineDto): Promise<boolean> {
    return handleDbOperation(this.resourceName, 'update', async () => {
      if (!isValidObjectId(id)) {
        throw new InvalidIdException(this.resourceName, id);
      }
      const updatedDocument = await this.disciplineModel.findByIdAndUpdate(
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
      const deletedDocument = await this.disciplineModel.findByIdAndDelete(id);
      return !!deletedDocument;
    });
  }

  async findByName(name: string): Promise<DisciplineDto | null> {
    return handleDbOperation(this.resourceName, 'findByName', async () => {
      const document = await this.disciplineModel.findOne({ name }).lean();
      return document ? mapDisciplineToDto(document) : null;
    });
  }

  async count(): Promise<number> {
    return handleDbOperation(this.resourceName, 'count', async () => {
      return this.disciplineModel.countDocuments();
    });
  }
}
