import { uploadFileToR2 } from "./lib/r2-upload.mjs";

const [, , filePath, key] = process.argv;

if (!filePath || !key) {
  console.error("Usage: node scripts/upload-r2-object.mjs <filePath> <key>");
  process.exit(1);
}

const result = await uploadFileToR2(filePath, key);

console.log(
  JSON.stringify(
    result,
    null,
    2,
  ),
);
