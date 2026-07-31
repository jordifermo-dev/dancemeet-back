import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { DisciplineController } from '../controllers/discipline.controller';
import { DisciplineService } from '../services/discipline.service';
import { DisciplineRepository } from '../repositories/discipline.repository';
import { DISCIPLINE_MODEL } from '../config/mongoose.config';
import { DisciplineDocument } from '../schemas/discipline.schema';

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
