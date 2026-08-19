import { DisciplineRepository } from './discipline.repository';
import { CreateDisciplineDto, DisciplineDto, UpdateDisciplineDto } from './discipline.dto';
import { ResourceNotFoundException } from '../../common';

export class DisciplineService {
  constructor(private readonly disciplineRepository: DisciplineRepository) { }

  /**
   * Create a new discipline
   */
  async createDiscipline(disciplineData: CreateDisciplineDto): Promise<DisciplineDto> {
    return await this.disciplineRepository.create(disciplineData);
  }

  /**
   * Get discipline by ID
   */
  async getDisciplineById(disciplineId: string): Promise<DisciplineDto> {
    const discipline = await this.disciplineRepository.findById(disciplineId);
    if (!discipline) {
      throw new ResourceNotFoundException('Discipline', disciplineId);
    }
    return discipline;
  }

  /**
   * Get all disciplines
   */
  async getAllDisciplines(): Promise<DisciplineDto[]> {
    return await this.disciplineRepository.findAll();
  }

  /**
   * Update discipline
   */
  async updateDiscipline(disciplineId: string, updateData: UpdateDisciplineDto): Promise<boolean> {
    const updated = await this.disciplineRepository.update(disciplineId, updateData);
    if (!updated) {
      throw new ResourceNotFoundException('Discipline', disciplineId);
    }
    return true;
  }

  /**
   * Delete discipline
   */
  async deleteDiscipline(disciplineId: string): Promise<boolean> {
    const deleted = await this.disciplineRepository.delete(disciplineId);
    if (!deleted) {
      throw new ResourceNotFoundException('Discipline', disciplineId);
    }
    return true;
  }

  /**
   * Find discipline by name
   */
  async getDisciplineByName(name: string): Promise<DisciplineDto> {
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
  }

  /**
   * Count all disciplines
   */
  async countDisciplines(): Promise<number> {
    return await this.disciplineRepository.count();
  }
}
