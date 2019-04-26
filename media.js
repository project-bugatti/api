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
  const EXTENSION_JPG = "jpg", EXTENSION_JPEG = "jpeg", EXTENSION_PNG = "png", EXTENSION_GIF = "gif";
  // Respective Content-Type header values
  const CONTENT_JPEG = "image/jpeg", CONTENT_PNG = "image/png", CONTENT_GIF = "image/gif";

  let contentType;
  switch (fileExtension.toLowerCase()) {
    case EXTENSION_JPG:
      contentType = CONTENT_JPEG;
      break;
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
    presignedUrl: url,
    media_id
  };

  return formSuccessResponse({media});
};

module.exports.saveMedia = async event => {
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    body = event.body;
  }

  if (body.media_id == null || body.file_type == null) {
    const error = {message: "Missing a required body parameter"};
    return formErrorResponse(error);
  }

  const media = {
    media_id: body.media_id,
    file_type: body.file_type,
    title: body.title || null,
    description: body.description || null,
    media_date: body.media_date || null,
    is_visible: body.is_visible || true
  };

  const sql = 'INSERT INTO media (media_id, file_type, title, description, media_date, is_visible) ' +
    'VALUES ( $1, $2, $3, $4, $5, $6 )';

  try {
    await db.none(sql, [
      media.media_id,
      media.file_type,
      media.title,
      media.description,
      media.media_date,
      media.is_visible
    ]);
    return formSuccessResponse({media});
  } catch (e) {
    console.log(media);
    return formSuccessResponse(e);
  }
};

module.exports.getMedia = async event => {
  let isVisible = true;
  if (event.queryStringParameters && event.queryStringParameters.isVisible) {
    isVisible = event.queryStringParameters.isVisible;
  }

  try {
    const media = await db.any('SELECT * FROM media WHERE is_visible = $1', [isVisible]);
    return formSuccessResponse({media} );
  } catch (e) {
    return formErrorResponse(e);
  }
};