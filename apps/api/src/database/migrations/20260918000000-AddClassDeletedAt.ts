import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassDeletedAt20260918000000 implements MigrationInterface {
  name = 'AddClassDeletedAt20260918000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "class" ADD "deletedAt" TIMESTAMP WITH TIME ZONE',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_class_deletedAt" ON "class" ("deletedAt")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_class_deletedAt"');
    await queryRunner.query('ALTER TABLE "class" DROP COLUMN "deletedAt"');
  }
}
