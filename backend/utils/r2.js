import AWS from "aws-sdk";

export const r2 = new AWS.S3({
  endpoint: process.env.CF_ENDPOINT,
  accessKeyId: process.env.CF_ACCESS_KEY,
  secretAccessKey: process.env.CF_SECRET_KEY,
  signatureVersion: "v4"
});

export async function uploadToR2(file, fileName) {
  return r2
    .upload({
      Bucket: process.env.CF_BUCKET,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype
    })
    .promise();
}

