import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createReadStream } from "node:fs";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile();
} catch {
  // Optional local convenience only.
}

const DEFAULT_BUCKET = "otibeguni-data";
const DEFAULT_ENDPOINT = "https://16fea8305facca56431d6f5db696743d.r2.cloudflarestorage.com";

export function getR2Config() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY.");
  }

  return {
    bucket: process.env.R2_BUCKET || DEFAULT_BUCKET,
    endpoint: process.env.R2_ENDPOINT || DEFAULT_ENDPOINT,
    accessKeyId,
    secretAccessKey,
  };
}

export function createR2Client() {
  const config = getR2Config();

  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function uploadFileToR2(filePath, key, options = {}) {
  const client = options.client || createR2Client();
  const { bucket } = getR2Config();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: createReadStream(filePath),
      ContentType: options.contentType || "application/pdf",
    }),
  );

  const head = await client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  return {
    bucket,
    key,
    contentType: head.ContentType,
    contentLength: head.ContentLength,
    etag: head.ETag,
  };
}
