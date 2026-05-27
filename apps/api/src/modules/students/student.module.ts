import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './student.entity';
import { StudentsService } from './student.service';
import { StudentsController } from './student.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Student])],
  providers: [StudentsService],
  controllers: [StudentsController],
  exports: [StudentsService],
})
export class StudentsModule {}
