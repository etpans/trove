import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassEntity } from './class.entity';
import { Subject } from './subject.entity';
import { AcademicsService } from './academics.service';
import { AcademicsController } from './academics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ClassEntity, Subject])],
  providers: [AcademicsService],
  controllers: [AcademicsController],
  exports: [AcademicsService],
})
export class AcademicsModule {}
