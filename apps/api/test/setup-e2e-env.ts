process.env.DB_HOST ??= 'localhost';
process.env.DB_PORT ??= '5432';
process.env.DB_USER ??= 'dev';
process.env.DB_PASS ??= 'dev';
process.env.DB_NAME ??= 'trove';
process.env.DB_SYNCHRONIZE ??= 'true';
process.env.DB_MIGRATIONS_RUN ??= 'false';

process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.FRONTEND_URL ??= 'http://localhost:3001';

process.env.SMTP_HOST ??= 'localhost';
process.env.SMTP_PORT ??= '2525';
process.env.SMTP_USER ??= 'test';
process.env.SMTP_PASS ??= 'test';
process.env.SMTP_FROM ??= 'trove <no-reply@trove.test>';

process.env.TURNSTILE_SECRET ??= 'test-turnstile-secret';

process.env.AWS_REGION ??= 'us-east-1';
process.env.AWS_S3_BUCKET ??= 'test-trove-attachments';
process.env.AWS_ACCESS_KEY_ID ??= 'test';
process.env.AWS_SECRET_ACCESS_KEY ??= 'test';
