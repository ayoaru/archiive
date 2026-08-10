const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const s3 = require("../config/s3");

// Upload a single image buffer to S3
const uploadToS3 = async (buffer, contentType, prefix = "items") => {
  const key = `${prefix}/${uuidv4()}`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return key;
};

// Delete a single image from S3
const deleteFromS3 = async (key) => {
  if (!key) return;
  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  }));
};

// Download a remote image and upload to S3
const uploadUrlToS3 = async (url, prefix = "items") => {
  const imageResponse = await axios.get(url, { responseType: "arraybuffer" });
  const buffer = Buffer.from(imageResponse.data);
  const contentType = imageResponse.headers["content-type"] || "image/jpeg";
  return await uploadToS3(buffer, contentType, prefix);
};

// Generate a presigned URL for reading an S3 object
const generatePresignedUrl = async (key) => {
  if (!key) return null;
  return await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    }),
    { expiresIn: 3600 }
  );
};

// Resolve an image field update given a new file, a new remote URL, or an explicit clear
const handleImageUpdate = async (existingKey, newFile, newUrl, cleared, prefix = "items") => {
  if (newFile) {
    await deleteFromS3(existingKey);
    return await uploadToS3(newFile.buffer, newFile.mimetype, prefix);
  } else if (newUrl) {
    await deleteFromS3(existingKey);
    return await uploadUrlToS3(newUrl, prefix);
  } else if (cleared) {
    await deleteFromS3(existingKey);
    return "";
  }
  return existingKey;
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  uploadUrlToS3,
  generatePresignedUrl,
  handleImageUpdate,
};
