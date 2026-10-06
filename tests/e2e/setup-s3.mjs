/**
 * CI helper: creates the S3 test bucket (on a local S3-compatible server such as moto) with a CORS rule that
 * lets the app's origin PUT files directly, as a real bucket needs for presigned browser uploads.
 */
import { CreateBucketCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const bucket = process.env.S3_BUCKET;
const appOrigin = new URL(process.env.BASE_URL || "http://localhost:3000").origin;
const s3 = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
});

await s3.send(new CreateBucketCommand({ Bucket: bucket })).catch((error) => {
  if (!["BucketAlreadyOwnedByYou", "BucketAlreadyExists"].includes(error.name)) throw error;
});
await s3.send(new PutBucketCorsCommand({
  Bucket: bucket,
  CORSConfiguration: { CORSRules: [{ AllowedOrigins: [appOrigin], AllowedMethods: ["PUT"], AllowedHeaders: ["content-type"], MaxAgeSeconds: 600 }] }
}));
console.log(`S3 bucket "${bucket}" ready (CORS allows PUT from ${appOrigin})`);
