const pgp = require('pg-promise')();
const jwt = require('jsonwebtoken');
const fs = require('fs');

module.exports.formSuccessResponse = function (body, statusCode) {
    return {
        statusCode: statusCode || 200,
        body: JSON.stringify(body),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        }
    }
};

module.exports.formErrorResponse = function (e, statusCode) {
    let error = {};
    if (e) {
        error = {
            name: e['name'] || null,
            message: e['message'] || null,
            detail: e['detail'] || null,
            code: e['code'] || null
        }
    }
    return {
        statusCode: statusCode || 400,
        body: JSON.stringify({error}),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        }
    }
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

module.exports.db = pgp({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});