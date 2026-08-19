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
import { DisciplineService } from './discipline.service';
import { CreateDisciplineDto, DisciplineDto, UpdateDisciplineDto } from './discipline.dto';
import { Public } from '../../common';

@Controller('api/disciplines')
export class DisciplineController {
  constructor(private disciplineService: DisciplineService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDiscipline(@Body() disciplineData: CreateDisciplineDto): Promise<DisciplineDto> {
    return await this.disciplineService.createDiscipline(disciplineData);
  }

  @Public()
  @Get()
  async getAllDisciplines(): Promise<DisciplineDto[]> {
    return await this.disciplineService.getAllDisciplines();
  }

  @Public()
  @Get(':id')
  async getDisciplineById(@Param('id') disciplineId: string): Promise<DisciplineDto> {
    return await this.disciplineService.getDisciplineById(disciplineId);
  }

  @Public()
  @Get('name/:name')
  async getDisciplineByName(@Param('name') name: string): Promise<DisciplineDto> {
    return await this.disciplineService.getDisciplineByName(name);
  }

  @Put(':id')
  async updateDiscipline(
    @Param('id') disciplineId: string,
    @Body() updateData: UpdateDisciplineDto,
  ): Promise<{ success: boolean }> {
    const success = await this.disciplineService.updateDiscipline(disciplineId, updateData);
    return { success };
  }

  @Delete(':id')
  async deleteDiscipline(@Param('id') disciplineId: string): Promise<{ success: boolean }> {
    const success = await this.disciplineService.deleteDiscipline(disciplineId);
    return { success };
  }

  @Public()
  @Get('/count/total')
  async countDisciplines(): Promise<{ count: number }> {
    const count = await this.disciplineService.countDisciplines();
    return { count };
  }
}
