import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { User } from './modules/auth/user.entity';
import { Subject } from './modules/subjects/entities/subject.entity';
import { Class } from './modules/classes/entities/class.entity';
import { RefreshToken } from './modules/auth/refresh-token.entity';
import { Student } from './modules/students/entities/student.entity';
import { Note } from './modules/notes/entities/note.entity';
import { Tag } from './modules/tags/entities/tag.entity';
import { NoteAttachmentEntity } from './modules/notes/entities/note-attachment.entity';
import { ShareLinkEntity } from './modules/notes/entities/share-link.entity';

import { AuthModule } from './modules/auth/auth.module';
import { ClassesModule } from './modules/classes/classes.module';
import { StudentsModule } from './modules/students/students.module';
import { NotesModule } from './modules/notes/notes.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { TagsModule } from './modules/tags/tags.module';

const getBooleanConfig = (
  config: ConfigService,
  key: string,
  defaultValue = false,
) => {
  const value = config.get<string>(key);

  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes'].includes(value.toLowerCase());
};

@Module({
  imports: [
    // load .env files
    ConfigModule.forRoot({ isGlobal: true }),

    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),

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
        entities: [
          User,
          RefreshToken,
          Subject,
          Class,
          Student,
          Note,
          Tag,
          NoteAttachmentEntity,
          ShareLinkEntity,
        ],
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: getBooleanConfig(config, 'DB_MIGRATIONS_RUN'),
        synchronize: getBooleanConfig(config, 'DB_SYNCHRONIZE'),
      }),
    }),
    AuthModule,
    ClassesModule,
    StudentsModule,
    NotesModule,
    SubjectsModule,
    TagsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
