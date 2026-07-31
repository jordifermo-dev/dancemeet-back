import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DisciplineService } from '../services/discipline.service';
import { CreateDisciplineDto, DisciplineDto, UpdateDisciplineDto } from '../dto';
import { Public } from '../common';

@Controller('api/disciplines')
export class DisciplineController {
  constructor(private disciplineService: DisciplineService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDiscipline(@Body() disciplineData: CreateDisciplineDto): Promise<DisciplineDto> {
    try {
      return await this.disciplineService.createDiscipline(disciplineData);
    } catch (err) {
      throw err;
    }
  }

  @Public()
  @Get()
  async getAllDisciplines(): Promise<DisciplineDto[]> {
    try {
      return await this.disciplineService.getAllDisciplines();
    } catch (err) {
      throw err;
    }
  }

  @Public()
  @Get(':id')
  async getDisciplineById(@Param('id') disciplineId: string): Promise<DisciplineDto> {
    try {
      return await this.disciplineService.getDisciplineById(disciplineId);
    } catch (err) {
      throw err;
    }
  }

  @Public()
  @Get('name/:name')
  async getDisciplineByName(@Param('name') name: string): Promise<DisciplineDto> {
    try {
      return await this.disciplineService.getDisciplineByName(name);
    } catch (err) {
      throw err;
    }
  }

  @Put(':id')
  async updateDiscipline(
    @Param('id') disciplineId: string,
    @Body() updateData: UpdateDisciplineDto,
  ): Promise<{ success: boolean }> {
    try {
      const success = await this.disciplineService.updateDiscipline(disciplineId, updateData);
      return { success };
    } catch (err) {
      throw err;
    }
  }

  @Delete(':id')
  async deleteDiscipline(@Param('id') disciplineId: string): Promise<{ success: boolean }> {
    try {
      const success = await this.disciplineService.deleteDiscipline(disciplineId);
      return { success };
    } catch (err) {
      throw err;
    }
  }

  @Public()
  @Get('/count/total')
  async countDisciplines(): Promise<{ count: number }> {
    try {
      const count = await this.disciplineService.countDisciplines();
      return { count };
    } catch (err) {
      throw err;
    }
  }
}
