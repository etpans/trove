import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { User } from './modules/auth/user.entity';
import { TeachersModule } from './modules/teachers/teacher.module';
import { StudentsModule } from './modules/students/student.module';
import { NotesModule } from './modules/notes/notes.module';
import { AcademicsModule } from './modules/academics/academics.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // load .env files
    ConfigModule.forRoot({ isGlobal: true }),

    // connect to postgresql
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASS'),
        database: config.get('DB_NAME'),
        entities: [User],
        synchronize: true, // turn off in production
      }),
    }),
    AuthModule,
  ],
})
export class AppModule {}
