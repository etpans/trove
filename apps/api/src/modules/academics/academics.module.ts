import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from './class.entity';
import { Subject } from './student.entity';
import { AcademicsService } from './class.service';
import { AcademicsController } from './class.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Class]),
    TypeOrmModule.forFeature([Subject]),
  ],
  providers: [AcademicsService],
  controllers: [AcademicsController],
  exports: [AcademicsService],
})
export class AcademicsModule {}
