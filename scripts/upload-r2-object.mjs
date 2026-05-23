import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createReadStream } from "node:fs";

const [, , filePath, key] = process.argv;

if (!filePath || !key) {
  console.error("Usage: node scripts/upload-r2-object.mjs <filePath> <key>");
  process.exit(1);
}

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error("Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY.");
  process.exit(1);
}

const bucket = "otibeguni-data";

const client = new S3Client({
  region: "auto",
  endpoint: "https://16fea8305facca56431d6f5db696743d.r2.cloudflarestorage.com",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

await client.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: createReadStream(filePath),
    ContentType: "application/pdf",
  }),
);

const head = await client.send(
  new HeadObjectCommand({
    Bucket: bucket,
    Key: key,
  }),
);

console.log(
  JSON.stringify(
    {
      bucket,
      key,
      contentType: head.ContentType,
      contentLength: head.ContentLength,
      etag: head.ETag,
    },
    null,
    2,
  ),
);
