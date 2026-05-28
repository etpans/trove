import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassEntity } from './class.entity';
import { Subject } from './subject.entity';
import { ClassesService } from './classes.service';
import { SubjectsService } from './subjects.service';
import { AcademicsService } from './academics.service';
import { ClassesController } from './classes.controller';
import { SubjectsController } from './subjects.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ClassEntity, Subject])],
  providers: [ClassesService, SubjectsService, AcademicsService],
  controllers: [ClassesController, SubjectsController],
  exports: [ClassesService, SubjectsService, AcademicsService],
})
export class AcademicsModule {}
