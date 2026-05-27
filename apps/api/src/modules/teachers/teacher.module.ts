import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Teacher } from './teacher.entity';
import { TeachersService } from './teacher.service';
import { TeachersController } from './teacher.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Teacher])],
  providers: [TeachersService],
  controllers: [TeachersController],
  exports: [TeachersService],
})
export class TeachersModule {}
