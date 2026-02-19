import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "*",
  databaseUrl: process.env.DATABASE_URL || "",
  awsRegion: process.env.AWS_REGION,
  s3Bucket: process.env.S3_BUCKET,
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024 * 1024),
  signedUrlTtlSeconds: Number(process.env.SIGNED_URL_TTL_SECONDS || 900),
  authTokenTtlSeconds: Number(process.env.AUTH_TOKEN_TTL_SECONDS || 7 * 24 * 60 * 60),
};

export function requireConfig(keys) {
  const missing = keys.filter((key) => !config[key]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}
