import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AppDataSource } from '../data-source';
import { User } from '../../modules/auth/user.entity';
import { RefreshToken } from '../../modules/auth/refresh-token.entity';
import { Subject } from '../../modules/subjects/entities/subject.entity';
import { Class } from '../../modules/classes/entities/class.entity';
import { Student } from '../../modules/students/entities/student.entity';
import { Note } from '../../modules/notes/entities/note.entity';
import { Tag } from '../../modules/tags/entities/tag.entity';
import { NoteAttachmentEntity } from '../../modules/notes/entities/note-attachment.entity';
import { ShareLinkEntity } from '../../modules/notes/entities/share-link.entity';

const sha256 = (value: string) =>
  crypto.createHash('sha256').update(value).digest('hex');

export async function seed() {
  console.log('🌱 Starting database seed process...');

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log('🔌 Connected to database via AppDataSource.');
  }

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Repositories
    const userRepo = AppDataSource.getRepository(User);
    const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
    const subjectRepo = AppDataSource.getRepository(Subject);
    const classRepo = AppDataSource.getRepository(Class);
    const studentRepo = AppDataSource.getRepository(Student);
    const tagRepo = AppDataSource.getRepository(Tag);
    const noteRepo = AppDataSource.getRepository(Note);
    const attachmentRepo = AppDataSource.getRepository(NoteAttachmentEntity);
    const shareLinkRepo = AppDataSource.getRepository(ShareLinkEntity);

    console.log('🧹 Cleaning existing seed data...');
    // Delete in reverse dependency order
    await shareLinkRepo.createQueryBuilder().delete().where('1 = 1').execute();
    await attachmentRepo.createQueryBuilder().delete().where('1 = 1').execute();
    await queryRunner.query('DELETE FROM "note_tags_tag"').catch(() => {
      /* ignore if table does not exist yet */
    });
    await noteRepo.createQueryBuilder().delete().where('1 = 1').execute();
    await studentRepo.createQueryBuilder().delete().where('1 = 1').execute();
    await classRepo.createQueryBuilder().delete().where('1 = 1').execute();
    await subjectRepo.createQueryBuilder().delete().where('1 = 1').execute();
    await tagRepo.createQueryBuilder().delete().where('1 = 1').execute();
    await refreshTokenRepo.createQueryBuilder().delete().where('1 = 1').execute();
    await userRepo.createQueryBuilder().delete().where('1 = 1').execute();

    console.log('👤 Seeding Users (Teachers)...');
    const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

    const teacher1 = await userRepo.save(
      userRepo.create({
        email: 'sarah.jenkins@trove.app',
        displayName: 'Sarah Jenkins',
        password: defaultPasswordHash,
        isVerified: true,
        failedLoginAttempts: 0,
      }),
    );

    const teacher2 = await userRepo.save(
      userRepo.create({
        email: 'john.smith@trove.app',
        displayName: 'John Smith',
        password: defaultPasswordHash,
        isVerified: true,
        failedLoginAttempts: 0,
      }),
    );

    console.log(`   ✓ Seeded 2 users (Default password: Password123!)`);

    console.log('🔑 Seeding Refresh Tokens...');
    const rawToken1 = 'seed-refresh-token-sarah';
    const rawToken2 = 'seed-refresh-token-john';

    await refreshTokenRepo.save([
      refreshTokenRepo.create({
        userId: teacher1.id,
        user: teacher1,
        tokenHash: sha256(rawToken1),
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
      refreshTokenRepo.create({
        userId: teacher2.id,
        user: teacher2,
        tokenHash: sha256(rawToken2),
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    ]);
    console.log('   ✓ Seeded refresh tokens');

    console.log('📚 Seeding Subjects...');
    const mathSubject = await subjectRepo.save(
      subjectRepo.create({
        name: 'Mathematics',
        color: '#3B82F6',
        teacherId: teacher1.id,
        teacher: teacher1,
      }),
    );

    const physicsSubject = await subjectRepo.save(
      subjectRepo.create({
        name: 'Physics',
        color: '#8B5CF6',
        teacherId: teacher1.id,
        teacher: teacher1,
      }),
    );

    const englishSubject = await subjectRepo.save(
      subjectRepo.create({
        name: 'English Literature',
        color: '#EC4899',
        teacherId: teacher2.id,
        teacher: teacher2,
      }),
    );

    const historySubject = await subjectRepo.save(
      subjectRepo.create({
        name: 'World History',
        color: '#F59E0B',
        teacherId: teacher2.id,
        teacher: teacher2,
      }),
    );
    console.log('   ✓ Seeded 4 subjects');

    console.log('🏷️  Seeding Tags...');
    const homeworkTag = await tagRepo.save(
      tagRepo.create({
        name: 'Homework',
        color: '#EF4444',
        teacherId: teacher1.id,
        teacher: teacher1,
      }),
    );

    const examPrepTag = await tagRepo.save(
      tagRepo.create({
        name: 'Exam Prep',
        color: '#F59E0B',
        teacherId: teacher1.id,
        teacher: teacher1,
      }),
    );

    const progressTag = await tagRepo.save(
      tagRepo.create({
        name: 'Class Progress',
        color: '#10B981',
        teacherId: teacher1.id,
        teacher: teacher1,
      }),
    );

    const essayTag = await tagRepo.save(
      tagRepo.create({
        name: 'Essay Draft',
        color: '#8B5CF6',
        teacherId: teacher2.id,
        teacher: teacher2,
      }),
    );
    console.log('   ✓ Seeded 4 tags');

    console.log('🏫 Seeding Classes...');
    const classMath10 = await classRepo.save(
      classRepo.create({
        name: 'Grade 10 - Mathematics',
        teacher: teacher1,
        session: new Date('2026-09-01'),
      }),
    );

    const classPhysics11 = await classRepo.save(
      classRepo.create({
        name: 'Grade 11 - Advanced Physics',
        teacher: teacher1,
        session: new Date('2026-09-01'),
      }),
    );

    const classEnglish9 = await classRepo.save(
      classRepo.create({
        name: 'Grade 9 - English Literature',
        teacher: teacher2,
        session: new Date('2026-09-01'),
      }),
    );
    console.log('   ✓ Seeded 3 classes');

    console.log('👨‍🎓 Seeding Students...');
    const alice = await studentRepo.save(
      studentRepo.create({
        name: 'Alice Johnson',
        rollNumber: 'MATH-101',
        classId: classMath10.id,
        class: classMath10,
      }),
    );

    const bob = await studentRepo.save(
      studentRepo.create({
        name: 'Bob Smith',
        rollNumber: 'MATH-102',
        classId: classMath10.id,
        class: classMath10,
      }),
    );

    const diana = await studentRepo.save(
      studentRepo.create({
        name: 'Diana Prince',
        rollNumber: 'PHYS-201',
        classId: classPhysics11.id,
        class: classPhysics11,
      }),
    );

    const fiona = await studentRepo.save(
      studentRepo.create({
        name: 'Fiona Gallagher',
        rollNumber: 'ENG-301',
        classId: classEnglish9.id,
        class: classEnglish9,
      }),
    );
    console.log('   ✓ Seeded 4 students');

    console.log('📝 Seeding Notes...');
    const note1 = await noteRepo.save(
      noteRepo.create({
        title: 'Quadratic Equations & Polynomial Factoring',
        content:
          'Alice demonstrated excellent understanding of factoring quadratic equations today. She completed all practice problems ahead of time.',
        studentId: alice.id,
        student: alice,
        subjectId: mathSubject.id,
        subject: mathSubject,
        teacherId: teacher1.id,
        teacher: teacher1,
        tags: [homeworkTag, progressTag],
      }),
    );

    const note2 = await noteRepo.save(
      noteRepo.create({
        title: 'Systems of Linear Equations Tutoring Plan',
        content:
          'Bob struggled with word problems involving linear systems. Scheduled a 1-on-1 review session for Thursday afternoon.',
        studentId: bob.id,
        student: bob,
        subjectId: mathSubject.id,
        subject: mathSubject,
        teacherId: teacher1.id,
        teacher: teacher1,
        tags: [homeworkTag],
      }),
    );

    const note3 = await noteRepo.save(
      noteRepo.create({
        title: 'Kinematics Acceleration Lab Results',
        content:
          'Diana achieved top marks in the rotational dynamics lab experiment. Prepared challenge questions for upcoming midterm.',
        studentId: diana.id,
        student: diana,
        subjectId: physicsSubject.id,
        subject: physicsSubject,
        teacherId: teacher1.id,
        teacher: teacher1,
        tags: [examPrepTag, progressTag],
      }),
    );

    const note4 = await noteRepo.save(
      noteRepo.create({
        title: 'To Kill a Mockingbird Essay Outline',
        content:
          'Fiona formulated a clear thesis statement analyzing empathy in Atticus Finch’s closing argument. First draft due next Monday.',
        studentId: fiona.id,
        student: fiona,
        subjectId: englishSubject.id,
        subject: englishSubject,
        teacherId: teacher2.id,
        teacher: teacher2,
        tags: [essayTag],
      }),
    );
    console.log('   ✓ Seeded 4 notes with tag associations');

    console.log('📎 Seeding Note Attachments...');
    await attachmentRepo.save([
      attachmentRepo.create({
        note: note1,
        fileUrl:
          'https://trove-demo-assets.s3.amazonaws.com/worksheets/quadratic_equations_practice.pdf',
        fileType: 'application/pdf',
        caption: 'Quadratic equations practice sheet with graded solutions.',
      }),
      attachmentRepo.create({
        note: note3,
        fileUrl:
          'https://trove-demo-assets.s3.amazonaws.com/labs/kinematics_graph.png',
        fileType: 'image/png',
        caption: 'Acceleration vs time experimental dataset.',
      }),
    ]);
    console.log('   ✓ Seeded 2 note attachments');

    console.log('🔗 Seeding Share Links...');
    await shareLinkRepo.save([
      shareLinkRepo.create({
        note: note1,
        token: '11111111-1111-4111-a111-111111111111',
        isActive: true,
        allowComments: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }),
      shareLinkRepo.create({
        note: note3,
        token: '22222222-2222-4222-a222-222222222222',
        isActive: true,
        allowComments: false,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      }),
    ]);
    console.log('   ✓ Seeded 2 share links');

    console.log('\n✅ Database seeding completed successfully!');
    console.log('----------------------------------------------------');
    console.log('Sample Accounts Created:');
    console.log('1. Teacher: sarah.jenkins@trove.app | Password: Password123!');
    console.log('2. Teacher: john.smith@trove.app  | Password: Password123!');
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await queryRunner.release();
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Closed database connection.');
    }
  }
}

// Execute if called directly from CLI
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
