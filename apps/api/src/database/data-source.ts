import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

import { User } from '../modules/auth/user.entity';
import { RefreshToken } from '../modules/auth/refresh-token.entity';
import { Subject } from '../modules/subjects/entities/subject.entity';
import { Class } from '../modules/classes/entities/class.entity';
import { Student } from '../modules/students/entities/student.entity';
import { Note } from '../modules/notes/entities/note.entity';
import { Tag } from '../modules/tags/entities/tag.entity';
import { NoteAttachmentEntity } from '../modules/notes/entities/note-attachment.entity';
import { ShareLinkEntity } from '../modules/notes/entities/share-link.entity';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const getBooleanEnv = (key: string, defaultValue = false) => {
  const value = process.env[key];

  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes'].includes(value.toLowerCase());
};

export const dbConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'dev',
  password: process.env.DB_PASS || 'dev',
  database: process.env.DB_NAME || 'trove',
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
  migrations: ['src/database/migrations/*.ts'],
  synchronize: getBooleanEnv('DB_SYNCHRONIZE'),
};

export const AppDataSource = new DataSource(dbConfig);
