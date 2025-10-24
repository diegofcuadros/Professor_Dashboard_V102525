import { S3Client } from "@aws-sdk/client-s3";

type RequiredEnv = "R2_BUCKET" | "R2_ACCOUNT_ID" | "R2_ACCESS_KEY_ID" | "R2_SECRET_ACCESS_KEY";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  publicBaseUrl?: string;
  defaultPrefix: string;
}

const requiredEnv = (name: RequiredEnv): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable "${name}" for Cloudflare R2 integration`);
  }
  return value;
};

const sanitizePrefix = (value: string): string => {
  const trimmed = value.replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed || "uploads";
};

let cachedConfig: R2Config | null = null;
let cachedClient: S3Client | null = null;

export function getR2Config(): R2Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const accountId = requiredEnv("R2_ACCOUNT_ID");
  const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requiredEnv("R2_BUCKET");
  const endpoint =
    process.env.R2_S3_ENDPOINT?.trim() ||
    `https://${accountId}.r2.cloudflarestorage.com`;

  cachedConfig = {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.trim(),
    defaultPrefix: sanitizePrefix(process.env.R2_DEFAULT_PREFIX || "uploads"),
  };

  return cachedConfig;
}

export function getR2Client(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getR2Config();

  cachedClient = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedClient;
}

export interface R2ObjectKeyParts {
  ownerId: string;
  documentId: string;
  fileName?: string;
  prefix?: string;
}

export function buildObjectKey(parts: R2ObjectKeyParts): string {
  const config = getR2Config();
  const basePrefix = sanitizePrefix(parts.prefix || config.defaultPrefix);
  const segments = [basePrefix, `user-${parts.ownerId}`, parts.documentId];

  if (parts.fileName) {
    segments.push(parts.fileName.replace(/^\/+/, ""));
  }

  return segments.join("/");
}
