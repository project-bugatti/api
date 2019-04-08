const jwt = require('jsonwebtoken');
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const AWS = require('aws-sdk');
const { formSuccessResponse } = require('./utils');
const { formErrorResponse } = require('./utils');

const AWS_OPTIONS = {
  region: 'us-east-1',
  apiVersion: '2012-08-10',
  tableName: 'sessions',
};

module.exports.getToken = (event, context, callback) => {
  AWS.config.update({region: AWS_OPTIONS.region});
  const dynamo = new AWS.DynamoDB({apiVersion: AWS_OPTIONS.apiVersion});

  const session_id = event.pathParameters.session_id;

  const params = {
    TableName: AWS_OPTIONS.tableName,
    Key: {
      'session_id': {S: session_id}
    }
  };

  dynamo.getItem(params, (error, data) => {
    if (error) {
      callback(formErrorResponse(error));
    } else {
      const session = { access_token: data.Item.access_token.S };
      callback(null, formSuccessResponse({session}));
    }
  });
};

module.exports.setToken = (event, context, callback) => {
  AWS.config.update({region: AWS_OPTIONS.region});
  var dynamo = new AWS.DynamoDB({apiVersion: AWS_OPTIONS.apiVersion});

  const session_id = uuidv4();
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    body = event.body;
  }

  if(body.access_token == null) {
    const error = { message: 'Missing a required body parameter' };
    callback(formErrorResponse(error));
  }

  var params = {
    TableName: AWS_OPTIONS.tableName,
    Item: {
      'session_id' : {S: session_id},
      'access_token' : {S: body.access_token}
    }
  };

  dynamo.putItem(params, (error) => {
    if (error) {
      callback(formErrorResponse(error));
    } else {
      const session = {session_id};
      callback(null, formSuccessResponse({session}));
    }
  });
};

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

    const options = { audience: AUTH0_CLIENT_ID };
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