import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.CF_R2_BUCKET;

if (!process.env.CF_R2_ENDPOINT) {
  throw new Error("Missing CF_R2_ENDPOINT");
}
if (!process.env.CF_ACCESS_KEY_ID) {
  throw new Error("Missing CF_ACCESS_KEY_ID");
}
if (!process.env.CF_SECRET_ACCESS_KEY) {
  throw new Error("Missing CF_SECRET_ACCESS_KEY");
}
if (!bucket) {
  throw new Error("Missing CF_R2_BUCKET");
}

export const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.CF_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CF_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_SECRET_ACCESS_KEY,
  },
});

export async function uploadFile(params: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
  });
  await r2.send(command);
  return { key: params.key };
}

export async function getJson<T>(key: string): Promise<T | null> {
  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const res = await r2.send(command);
    const body = await res.Body?.transformToString();
    return body ? (JSON.parse(body) as T) : null;
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

export async function putJson(key: string, data: unknown) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: "application/json",
  });
  await r2.send(command);
  return { key };
}

export async function listObjects(prefix: string) {
  try {
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });
    const res = await r2.send(command);
    return res.Contents ?? [];
  } catch (err: any) {
    console.error(`Error listing objects with prefix ${prefix}:`, err);
    // If it's a permissions or connection error, return empty array
    // This allows the app to continue functioning
    if (err?.$metadata?.httpStatusCode === 403 || err?.$metadata?.httpStatusCode === 401) {
      console.error("R2 authentication error - check credentials");
    }
    throw err; // Re-throw to let caller handle
  }
}

export async function signedUrl(key: string, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(r2, command, { expiresIn });
}

export async function deleteObject(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  await r2.send(command);
}

