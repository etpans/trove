type EnvConfig = Record<string, unknown>;

const requiredStringKeys = [
  'DB_HOST',
  'DB_USER',
  'DB_PASS',
  'DB_NAME',
  'JWT_SECRET',
  'FRONTEND_URL',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'TURNSTILE_SECRET',
  'AWS_REGION',
  'AWS_S3_BUCKET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
];

const optionalUrlKeys = ['AWS_S3_PUBLIC_BASE_URL'];
const booleanKeys = ['DB_SYNCHRONIZE', 'DB_MIGRATIONS_RUN'];

function getString(config: EnvConfig, key: string) {
  const value = config[key];

  return typeof value === 'string' ? value.trim() : '';
}

function assertRequiredStrings(config: EnvConfig) {
  const missing = requiredStringKeys.filter((key) => !getString(config, key));

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}

function assertNumber(config: EnvConfig, key: string) {
  const value = getString(config, key);

  if (!value || Number.isNaN(Number(value))) {
    throw new Error(`${key} must be a number`);
  }
}

function assertBoolean(config: EnvConfig, key: string) {
  const value = getString(config, key);

  if (!value) {
    return;
  }

  if (!['1', '0', 'true', 'false', 'yes', 'no'].includes(value.toLowerCase())) {
    throw new Error(`${key} must be a boolean`);
  }
}

function assertUrl(config: EnvConfig, key: string) {
  const value = getString(config, key);

  if (!value) {
    return;
  }

  try {
    new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL`);
  }
}

export function validateEnv(config: EnvConfig) {
  assertRequiredStrings(config);
  assertNumber(config, 'DB_PORT');
  assertNumber(config, 'SMTP_PORT');
  assertUrl(config, 'FRONTEND_URL');
  optionalUrlKeys.forEach((key) => assertUrl(config, key));
  booleanKeys.forEach((key) => assertBoolean(config, key));

  return config;
}
