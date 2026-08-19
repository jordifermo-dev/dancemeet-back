import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { DisciplineController } from './discipline.controller';
import { DisciplineService } from './discipline.service';
import { DisciplineRepository } from './discipline.repository';
import { DISCIPLINE_MODEL } from '../../config/mongoose.config';
import { DisciplineDocument } from './discipline.schema';

@Module({
  controllers: [DisciplineController],
  providers: [
    {
      provide: DisciplineService,
      useFactory: (disciplineModel: Model<DisciplineDocument>) => {
        const disciplineRepository = new DisciplineRepository(disciplineModel);
        return new DisciplineService(disciplineRepository);
      },
      inject: [DISCIPLINE_MODEL],
    },
  ],
  exports: [DisciplineService],
})
export class DisciplineModule {}
