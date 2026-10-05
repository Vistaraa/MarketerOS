import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Object storage for uploaded media. Keys are always generated server-side (never from user input).
 *
 * STORAGE_DRIVER=s3 works with any S3-compatible service (AWS S3, Cloudflare R2, Supabase Storage):
 *   S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_ENDPOINT for non-AWS providers.
 * STORAGE_DRIVER=local (the default) writes under STORAGE_LOCAL_DIR (default ./storage/uploads). It is for
 * development and single-server hosting only: serverless platforms such as Vercel discard local files.
 */
export interface StoredObject {
  body: Buffer;
  contentType: string;
}

export interface ObjectStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

class LocalDiskStorage implements ObjectStorage {
  private readonly root = path.resolve(process.env.STORAGE_LOCAL_DIR || "storage/uploads");

  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    // Defence in depth: keys are server-generated, but never allow escaping the storage root.
    if (!full.startsWith(this.root + path.sep)) throw new Error("Invalid storage key.");
    return full;
  }

  async put(key: string, body: Buffer, contentType: string) {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    await writeFile(`${file}.type`, contentType);
  }

  async get(key: string) {
    const file = this.resolve(key);
    try {
      const [body, contentType] = await Promise.all([readFile(file), readFile(`${file}.type`, "utf8")]);
      return { body, contentType };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    const file = this.resolve(key);
    await rm(file, { force: true });
    await rm(`${file}.type`, { force: true });
  }
}

class S3Storage implements ObjectStorage {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor() {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) throw new Error("S3_BUCKET must be set when STORAGE_DRIVER=s3.");
    this.bucket = bucket;
    this.client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
        : undefined
    });
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }

  async get(key: string) {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!result.Body) return null;
      return { body: Buffer.from(await result.Body.transformToByteArray()), contentType: result.ContentType || "application/octet-stream" };
    } catch (error: any) {
      if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) return null;
      throw error;
    }
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

let instance: ObjectStorage | null = null;

export function objectStorage(): ObjectStorage {
  if (!instance) instance = process.env.STORAGE_DRIVER === "s3" ? new S3Storage() : new LocalDiskStorage();
  return instance;
}
