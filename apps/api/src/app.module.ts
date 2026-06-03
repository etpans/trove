import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true, // turn off in production
      }),
    }),

    TeachersModule,
    StudentsModule,
    NotesModule,
    AcademicsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
