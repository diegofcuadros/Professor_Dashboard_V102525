import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Handle Railway's different database URL variable names
const dbUrl = 
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.RAILWAY_DATABASE_URL;

console.log('🔍 DATABASE_URL present?', Boolean(dbUrl));
console.log('🔍 Available DB env vars:', {
  DATABASE_URL: Boolean(process.env.DATABASE_URL),
  POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
  POSTGRES_URL_NON_POOLING: Boolean(process.env.POSTGRES_URL_NON_POOLING),
  RAILWAY_DATABASE_URL: Boolean(process.env.RAILWAY_DATABASE_URL)
});

if (!dbUrl) {
  throw new Error(
    "DATABASE_URL (or POSTGRES_URL) must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: dbUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const db = drizzle(pool, { schema });