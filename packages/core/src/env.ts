import { z } from 'zod'

export const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  APP_URL: z.string().url(),
  CAPACITY_TIER: z.enum(['T0', 'T1', 'T2']),

  DATABASE_URL: z.string().startsWith('postgresql://'),
  REDIS_URL: z.string().startsWith('redis://'),

  AUTH_SECRET: z.string().min(32),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_ORIGINALS: z.string().min(1),
  S3_BUCKET_HLS: z.string().min(1),
  S3_BUCKET_THUMBS: z.string().min(1),

  CDN_BASE_URL: z.string().url(),

  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().email().optional(),

  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
  FFMPEG_PATH: z.string().default('ffmpeg'),
  FFPROBE_PATH: z.string().default('ffprobe'),
  TMP_DIR: z.string().default('/tmp/aidream'),

  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error'])
    .default('info'),
})

export type ServerEnv = z.infer<typeof ServerEnvSchema>

export function loadServerEnv(input: unknown = process.env): ServerEnv {
  return ServerEnvSchema.parse(input)
}
