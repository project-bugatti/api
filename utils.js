const pgp = require('pg-promise')();

module.exports.formSuccessResponse = function (body, statusCode) {
    return {
        statusCode: statusCode || 200,
        body: JSON.stringify(body)
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