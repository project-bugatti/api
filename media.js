'use strict';
const { db, formSuccessResponse, formErrorResponse } = require('./utils');

module.exports.getPresignedUrl = async event => {
  const uuidv1 = require('uuid/v1');
  const AWS = require('aws-sdk');
  const s3 = new AWS.S3();

  const fileExtension = event.queryStringParameters.fileExtension;
  if (fileExtension == null) {
    const error = {message: "Missing file extension parameter"};
    return formErrorResponse(error);
  }

  // Acceptable file types
  const EXTENSION_JPEG = "jpeg", EXTENSION_PNG = "png", EXTENSION_GIF = "gif";
  // Respective Content-Type header values
  const CONTENT_JPEG = "image/jpeg", CONTENT_PNG = "image/png", CONTENT_GIF = "image/gif";

  let contentType;
  switch (fileExtension.toLowerCase()) {
    case EXTENSION_JPEG:
      contentType = CONTENT_JPEG;
      break;
    case EXTENSION_PNG:
      contentType = CONTENT_PNG;
      break;
    case EXTENSION_GIF:
      contentType = CONTENT_GIF;
      break;
    default:
      const error = {message: `File extension '${fileExtension}' not supported`};
      return formErrorResponse(error);
  }

  const media_id = uuidv1();
  const fileName = media_id + "." + fileExtension;
  const signedUrlExpireSeconds = 60;

  const url = s3.getSignedUrl('putObject', {
    Bucket: process.env.MEDIA_BUCKET_NAME,
    Key: fileName,
    Expires: signedUrlExpireSeconds,
    ContentType: contentType,
  });

  const media = {
    preSignedUrl: url,
    media_id
  };

  console.log(media);

  return formSuccessResponse({media});
};