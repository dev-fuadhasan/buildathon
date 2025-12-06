import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Lazy initialization to avoid build-time errors
let r2Instance: S3Client | null = null;
let bucketName: string | null = null;

function getR2Client(): S3Client {
  if (!r2Instance) {
    const endpoint = process.env.CF_R2_ENDPOINT;
    const accessKeyId = process.env.CF_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CF_SECRET_ACCESS_KEY;
    const bucket = process.env.CF_R2_BUCKET;

    // During build, env vars may not be available - create dummy client
    // This will fail at runtime if actually used, which is expected
    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      if (process.env.NODE_ENV === "production" && !process.env.VERCEL && !process.env.NETLIFY) {
        // Only throw in production if not in a build environment
        throw new Error("Missing R2 configuration");
      }
      // Create dummy client for build time
      r2Instance = new S3Client({
        region: "auto",
        endpoint: endpoint || "https://dummy.endpoint",
        credentials: {
          accessKeyId: accessKeyId || "dummy-key",
          secretAccessKey: secretAccessKey || "dummy-secret",
        },
      });
      bucketName = bucket || "dummy-bucket";
      return r2Instance;
    }

    r2Instance = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    bucketName = bucket;
  }
  return r2Instance;
}

function getBucket(): string {
  if (!bucketName) {
    bucketName = process.env.CF_R2_BUCKET || "dummy-bucket";
  }
  return bucketName;
}

// Export a getter that initializes lazily
export const r2 = new Proxy({} as S3Client, {
  get(_target, prop) {
    return getR2Client()[prop as keyof S3Client];
  },
});

export async function uploadFile(params: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
  });
  await getR2Client().send(command);
  return { key: params.key };
}

export async function getJson<T>(key: string): Promise<T | null> {
  try {
    const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
    const res = await getR2Client().send(command);
    const body = await res.Body?.transformToString();
    return body ? (JSON.parse(body) as T) : null;
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

export async function putJson(key: string, data: unknown) {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: "application/json",
  });
  await getR2Client().send(command);
  return { key };
}

export async function listObjects(prefix: string) {
  try {
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
    const command = new ListObjectsV2Command({
      Bucket: getBucket(),
      Prefix: prefix,
    });
    const res = await getR2Client().send(command);
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
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
  return getSignedUrl(getR2Client(), command, { expiresIn });
}

export async function deleteObject(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  await getR2Client().send(command);
}

