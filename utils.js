const pgp = require('pg-promise')();

module.exports.formSuccessResponse = function (body, statusCode) {
    return {
        statusCode: statusCode || 200,
        body: JSON.stringify(body)
    }
};

module.exports.formErrorResponse = function (e, statusCode) {
    const error = {
        name: e['name'],
        message: e['message'],
        detail: e['detail'],
        code: e['code']
    };
    return {
        statusCode: statusCode || 400,
        body: JSON.stringify({error})
    }
};

module.exports.db = pgp({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});