import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { EmailService } from '../src/modules/auth/email.service';
import { User } from '../src/modules/auth/user.entity';
import { RefreshToken } from '../src/modules/auth/refresh-token.entity';
import { Subject } from '../src/modules/subjects/entities/subject.entity';
import { Class } from '../src/modules/classes/entities/class.entity';
import { Student } from '../src/modules/students/entities/student.entity';
import { Note } from '../src/modules/notes/entities/note.entity';
import { Tag } from '../src/modules/tags/entities/tag.entity';
import { NoteAttachmentEntity } from '../src/modules/notes/entities/note-attachment.entity';
import { ShareLinkEntity } from '../src/modules/notes/entities/share-link.entity';

jest.setTimeout(45000);

describe('API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const emailCodes = new Map<
    string,
    { verificationCode?: string; passwordResetCode?: string }
  >();

  const emailServiceMock = {
    sendVerificationCode: jest.fn(async (to: string, code: string) => {
      emailCodes.set(to, {
        ...emailCodes.get(to),
        verificationCode: code,
      });
    }),
    sendPasswordResetCode: jest.fn(async (to: string, code: string) => {
      emailCodes.set(to, {
        ...emailCodes.get(to),
        passwordResetCode: code,
      });
    }),
  };

  const clearDatabase = async () => {
    if (!dataSource?.isInitialized) return;

    await dataSource
      .query('DELETE FROM "note_tags_tag"')
      .catch(() => undefined);
    await dataSource.getRepository(ShareLinkEntity).delete({});
    await dataSource.getRepository(NoteAttachmentEntity).delete({});
    await dataSource.getRepository(Note).delete({});
    await dataSource.getRepository(Student).delete({});
    await dataSource.getRepository(Class).delete({});
    await dataSource.getRepository(Subject).delete({});
    await dataSource.getRepository(Tag).delete({});
    await dataSource.getRepository(RefreshToken).delete({});
    await dataSource.getRepository(User).delete({});
  };

  const registerVerifiedUser = async (email: string) => {
    const password = 'Password123!';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, displayName: 'Test Teacher', password })
      .expect(201);

    const code = emailCodes.get(email)?.verificationCode;
    expect(code).toMatch(/^\d{6}$/);

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ email, code })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    expect(login.body.access_token).toBeDefined();
    expect(login.body.refresh_token).toBeDefined();

    return login.body.access_token as string;
  };

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-jwt-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    emailCodes.clear();
    jest.clearAllMocks();
    await clearDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await app?.close();
  });

  it('supports the authenticated teacher workflow and ownership boundaries', async () => {
    const teacherToken = await registerVerifiedUser('teacher-a@trove.test');
    const otherTeacherToken = await registerVerifiedUser(
      'teacher-b@trove.test',
    );
    const auth = { Authorization: `Bearer ${teacherToken}` };
    const otherAuth = { Authorization: `Bearer ${otherTeacherToken}` };

    await request(app.getHttpServer())
      .post('/classes')
      .set(auth)
      .send({
        name: 'Physics 11',
        session: '2026-09-01',
        unexpected: true,
      })
      .expect(400);

    const classResponse = await request(app.getHttpServer())
      .post('/classes')
      .set(auth)
      .send({ name: 'Physics 11', session: '2026-09-01' })
      .expect(201);

    expect(classResponse.body.color).toMatch(/^#[0-9A-F]{6}$/i);

    const studentResponse = await request(app.getHttpServer())
      .post('/students')
      .set(auth)
      .send({
        name: 'Ada Lovelace',
        rollNumber: 'P-001',
        classId: classResponse.body.id,
      })
      .expect(201);

    const subjectResponse = await request(app.getHttpServer())
      .post('/subjects')
      .set(auth)
      .send({ name: 'Physics', color: '#2563EB' })
      .expect(201);

    const tagResponse = await request(app.getHttpServer())
      .post('/tags')
      .set(auth)
      .send({ name: 'Lab Work', color: '#059669' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/tags/${tagResponse.body.id}`)
      .set(otherAuth)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/subjects/${subjectResponse.body.id}`)
      .set(otherAuth)
      .send({ name: 'Other Physics' })
      .expect(404);

    const noteResponse = await request(app.getHttpServer())
      .post('/notes')
      .set(auth)
      .send({
        title: 'Projectile motion',
        content: 'Strong lab notes with a clear free-body diagram.',
        studentId: studentResponse.body.id,
        subjectId: subjectResponse.body.id,
        tagIds: [tagResponse.body.id],
      })
      .expect(201);

    expect(noteResponse.body.student.id).toBe(studentResponse.body.id);
    expect(noteResponse.body.subject.id).toBe(subjectResponse.body.id);
    expect(noteResponse.body.tags).toHaveLength(1);

    const notesResponse = await request(app.getHttpServer())
      .get('/notes')
      .set(auth)
      .expect(200);

    expect(notesResponse.body).toHaveLength(1);

    const shareResponse = await request(app.getHttpServer())
      .post(`/notes/${noteResponse.body.id}/share`)
      .set(auth)
      .expect(201);

    expect(shareResponse.body.token).toBeDefined();

    const publicShareResponse = await request(app.getHttpServer())
      .get(`/share/${shareResponse.body.token}`)
      .expect(200);

    expect(publicShareResponse.body.note.id).toBe(noteResponse.body.id);
  });
});
