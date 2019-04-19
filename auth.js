const jwt = require('jsonwebtoken');
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const AWS = require('aws-sdk');
const { formSuccessResponse } = require('./utils');
const { formErrorResponse } = require('./utils');

module.exports.authorize = (event) => {
  const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
  const AUTH0_PUBLIC_KEY_FILENAME = process.env.AUTH0_PUBLIC_KEY_FILENAME;
  const UNAUTHORIZED = { message: 'Unauthorized' };

  return new Promise( (onSuccess, onFailure) => {
    if (!event.headers.Authorization) {
      onFailure(UNAUTHORIZED);
    }

    const tokenParts = event.headers.Authorization.split(' ');
    const tokenValue = tokenParts[1];

    if (!(tokenParts[0].toLowerCase() === 'bearer' && tokenValue)) {
      // no auth token!
      onFailure(UNAUTHORIZED);
    }


    const options = { aud: AUTH0_CLIENT_ID };
    try {
      let cert = fs.readFileSync(AUTH0_PUBLIC_KEY_FILENAME);
     jwt.verify(tokenValue, cert, options, (verifyError, decoded) => {
        if (verifyError) {
          onFailure(UNAUTHORIZED);
        }
        onSuccess();
      })
    } catch (e) {
      onFailure(UNAUTHORIZED)
    }
  });
};