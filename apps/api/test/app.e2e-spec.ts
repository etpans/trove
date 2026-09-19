import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { EmailService } from '../src/modules/auth/email.service';
import { TurnstileGuard } from '../src/modules/auth/strategies/turnstile.guard';
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
    await dataSource
      .getRepository(ShareLinkEntity)
      .createQueryBuilder()
      .delete()
      .where('1 = 1')
      .execute();
    await dataSource
      .getRepository(NoteAttachmentEntity)
      .createQueryBuilder()
      .delete()
      .where('1 = 1')
      .execute();
    await dataSource
      .getRepository(Note)
      .createQueryBuilder()
      .delete()
      .where('1 = 1')
      .execute();
    await dataSource
      .getRepository(Student)
      .createQueryBuilder()
      .delete()
      .where('1 = 1')
      .execute();
    await dataSource
      .getRepository(Class)
      .createQueryBuilder()
      .delete()
      .where('1 = 1')
      .execute();
    await dataSource
      .getRepository(Subject)
      .createQueryBuilder()
      .delete()
      .where('1 = 1')
      .execute();
    await dataSource
      .getRepository(Tag)
      .createQueryBuilder()
      .delete()
      .where('1 = 1')
      .execute();
    await dataSource
      .getRepository(RefreshToken)
      .createQueryBuilder()
      .delete()
      .where('1 = 1')
      .execute();
    await dataSource
      .getRepository(User)
      .createQueryBuilder()
      .delete()
      .where('1 = 1')
      .execute();
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

    return {
      accessToken: login.body.access_token as string,
      refreshToken: login.body.refresh_token as string,
      password,
    };
  };

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-jwt-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailServiceMock)
      .overrideProvider(TurnstileGuard)
      .useValue({ canActivate: jest.fn(() => true) })
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
    const teacherSession = await registerVerifiedUser('teacher-a@trove.test');
    const otherTeacherSession = await registerVerifiedUser(
      'teacher-b@trove.test',
    );
    const auth = { Authorization: `Bearer ${teacherSession.accessToken}` };
    const otherAuth = {
      Authorization: `Bearer ${otherTeacherSession.accessToken}`,
    };

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

  it('deletes accounts and revokes refresh tokens', async () => {
    const session = await registerVerifiedUser('delete-me@trove.test');
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    const classResponse = await request(app.getHttpServer())
      .post('/classes')
      .set(auth)
      .send({ name: 'Physics 12', session: '2026-09-01' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/students')
      .set(auth)
      .send({
        name: 'Grace Hopper',
        classId: classResponse.body.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete('/auth/account')
      .set(auth)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ deleted: true });
      });

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: session.refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .get('/auth/profile')
      .set(auth)
      .expect(401);

    await expect(dataSource.getRepository(User).count()).resolves.toBe(0);
    await expect(dataSource.getRepository(Class).count()).resolves.toBe(0);
    await expect(dataSource.getRepository(Student).count()).resolves.toBe(0);
  });

  it('soft deletes classes and hides their dependent records', async () => {
    const session = await registerVerifiedUser('soft-delete@trove.test');
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    const classResponse = await request(app.getHttpServer())
      .post('/classes')
      .set(auth)
      .send({ name: 'Chemistry 10', session: '2026-09-01' })
      .expect(201);

    const studentResponse = await request(app.getHttpServer())
      .post('/students')
      .set(auth)
      .send({
        name: 'Marie Curie',
        classId: classResponse.body.id,
      })
      .expect(201);

    const noteResponse = await request(app.getHttpServer())
      .post('/notes')
      .set(auth)
      .send({
        title: 'Lab safety',
        content: 'Careful and consistent.',
        studentId: studentResponse.body.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/classes/${classResponse.body.id}`)
      .set(auth)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ deleted: true });
      });

    await request(app.getHttpServer())
      .get(`/classes/${classResponse.body.id}`)
      .set(auth)
      .expect(404);

    const classesResponse = await request(app.getHttpServer())
      .get('/classes')
      .set(auth)
      .expect(200);
    expect(classesResponse.body).toHaveLength(0);

    const studentsResponse = await request(app.getHttpServer())
      .get('/students')
      .set(auth)
      .expect(200);
    expect(studentsResponse.body).toHaveLength(0);

    const notesResponse = await request(app.getHttpServer())
      .get('/notes')
      .set(auth)
      .expect(200);
    expect(notesResponse.body).toHaveLength(0);

    await request(app.getHttpServer())
      .get(`/notes/${noteResponse.body.id}`)
      .set(auth)
      .expect(404);

    const deletedClass = await dataSource.getRepository(Class).findOne({
      where: { id: classResponse.body.id },
      withDeleted: true,
    });
    expect(deletedClass?.deletedAt).toBeInstanceOf(Date);
  });

  it('imports classes and students from CSV text', async () => {
    const session = await registerVerifiedUser('csv-import@trove.test');
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    const response = await request(app.getHttpServer())
      .post('/classes/import-csv')
      .set(auth)
      .send({
        csv: [
          'className,session,color,studentName,rollNumber',
          'Biology 9,2026-09-01,#059669,Rosalind Franklin,B-001',
          'Biology 9,2026-09-01,#059669,Barbara McClintock,B-002',
          'X,not-a-date,,Ignored Student,',
        ].join('\n'),
      })
      .expect(201);

    expect(response.body.createdClasses).toBe(1);
    expect(response.body.createdStudents).toBe(2);
    expect(response.body.errors).toEqual([
      { row: 4, message: 'Class name must be 2-30 characters' },
    ]);

    const classesResponse = await request(app.getHttpServer())
      .get('/classes')
      .set(auth)
      .expect(200);
    expect(classesResponse.body).toHaveLength(1);

    const studentsResponse = await request(app.getHttpServer())
      .get('/students')
      .set(auth)
      .expect(200);
    expect(studentsResponse.body).toHaveLength(2);
  });

  describe('TurnstileGuard', () => {
    const createContext = (body: Record<string, unknown>) =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({
            body,
            ip: '127.0.0.1',
          }),
        }),
      }) as ExecutionContext;

    const createConfig = (values: Record<string, string | undefined>) =>
      ({
        get: jest.fn((key: string) => values[key]),
      }) as unknown as ConfigService;

    it('bypasses verification in test configuration', async () => {
      const guard = new TurnstileGuard(
        createConfig({ NODE_ENV: 'test', TURNSTILE_SECRET: 'secret' }),
      );

      await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    });

    it('rejects requests without a Turnstile token when enabled', async () => {
      const guard = new TurnstileGuard(
        createConfig({
          NODE_ENV: 'production',
          TURNSTILE_SECRET: 'secret',
        }),
      );

      await expect(guard.canActivate(createContext({}))).rejects.toThrow(
        'Missing Turnstile token',
      );
    });

    it('verifies Turnstile tokens with Cloudflare', async () => {
      const originalFetch = global.fetch;
      const fetchMock = jest.fn(async () => ({
        ok: true,
        json: async () => ({ success: true }),
      })) as jest.Mock;
      global.fetch = fetchMock;

      try {
        const guard = new TurnstileGuard(
          createConfig({
            NODE_ENV: 'production',
            TURNSTILE_SECRET: 'secret',
          }),
        );

        await expect(
          guard.canActivate(
            createContext({ 'cf-turnstile-response': 'turnstile-token' }),
          ),
        ).resolves.toBe(true);

        expect(fetchMock).toHaveBeenCalledWith(
          'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }),
        );
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
