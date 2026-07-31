import { DisciplineRepository } from '../repositories';
import { CreateDisciplineDto, DisciplineDto, UpdateDisciplineDto } from '../dto';
import { ResourceNotFoundException, DuplicateKeyException } from '../common';

export class DisciplineService {
  constructor(private readonly disciplineRepository: DisciplineRepository) { }

  /**
   * Create a new discipline
   */
  async createDiscipline(disciplineData: CreateDisciplineDto): Promise<DisciplineDto> {
    try {
      return await this.disciplineRepository.create(disciplineData);
    } catch (err) {
      // Surface duplicate-key errors as 409 instead of 500.
      if (err instanceof DuplicateKeyException) {
        throw err;
      }
      throw err;
    }
  }

  /**
   * Get discipline by ID
   */
  async getDisciplineById(disciplineId: string): Promise<DisciplineDto> {
    try {
      const discipline = await this.disciplineRepository.findById(disciplineId);
      if (!discipline) {
        throw new ResourceNotFoundException('Discipline', disciplineId);
      }
      return discipline;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all disciplines
   */
  async getAllDisciplines(): Promise<DisciplineDto[]> {
    try {
      return await this.disciplineRepository.findAll();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Update discipline
   */
  async updateDiscipline(disciplineId: string, updateData: UpdateDisciplineDto): Promise<boolean> {
    try {
      const updated = await this.disciplineRepository.update(disciplineId, updateData);
      if (!updated) {
        throw new ResourceNotFoundException('Discipline', disciplineId);
      }
      return true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Delete discipline
   */
  async deleteDiscipline(disciplineId: string): Promise<boolean> {
    try {
      const deleted = await this.disciplineRepository.delete(disciplineId);
      if (!deleted) {
        throw new ResourceNotFoundException('Discipline', disciplineId);
      }
      return true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Find discipline by name
   */
  async getDisciplineByName(name: string): Promise<DisciplineDto> {
    try {
      const discipline = await this.disciplineRepository.findByName(name);
      if (!discipline) {
        throw new ResourceNotFoundException(
          'Discipline',
          `name "${name}"`,
          'errors.RESOURCE_NOT_FOUND_BY_NAME',
          { resource: 'Discipline', name },
        );
      }
      return discipline;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Count all disciplines
   */
  async countDisciplines(): Promise<number> {
    try {
      return await this.disciplineRepository.count();
    } catch (err) {
      throw err;
    }
  }
}
