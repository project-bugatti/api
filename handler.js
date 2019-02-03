'use strict';

const pgp = require('pg-promise')();
const db = pgp({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

function formResponse(body, statusCode) {
  return {
    statusCode: (statusCode) ? statusCode : 200,
    body: body
  }
}

module.exports.hello = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless v1.0! Your function executed successfully!',
      input: event,
    }),
  };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};

module.exports.GetMembers = async () => {
  const members = await db.any(`SELECT * FROM ${process.env.MEMBERS_TBL}`);
  return formResponse({members} );
};

module.exports.GetMember = async (event, context) => {
  const member_id = event['pathParameters']['member_id'];

  const sql = `SELECT json_build_object('member_id', m.member_id, 'firstname', m.firstname, 'lastname', m.lastname, 'nickname', m.nickname, 'phone', m.phone, 'quotes',
    (SELECT json_agg(json_build_object('quote_id', q.quote_id, 'quote_text', q.quote_text))
    FROM quotes q WHERE q.author_member_id = m.member_id )) json
  FROM members m
  WHERE m.member_id = '${member_id}'`;

  const member = await db.map(sql, [], a => a.json);
  return formResponse({member});
};

module.exports.GetQuotes = async () => {
  const sql = `SELECT json_build_object('quote_id', q.quote_id, 'quote_text', q.quote_text, 'content_id', q.content_id, 'member',
	  (SELECT json_agg(json_build_object('member_id', m.member_id, 'firstname', m.firstname, 'lastname', m.lastname, 'nickname', m.nickname, 'phone', m.phone))
	  FROM members m WHERE m.member_id = q.author_member_id )) json
  FROM quotes q`;

  const quotes = await db.map(sql, [], a => a.json);
  return formResponse( {quotes});
};

module.exports.GetQuote = async (event) => {
  const quote_id = event['pathParameters']['quote_id'];

  const sql = `SELECT json_build_object('quote_id', q.quote_id, 'quote_text', q.quote_text, 'content_id', q.content_id, 'member',
	  (SELECT json_agg(json_build_object('member_id', m.member_id, 'firstname', m.firstname, 'lastname', m.lastname, 'nickname', m.nickname, 'phone', m.phone))
	  FROM members m WHERE m.member_id = q.author_member_id )) json
  FROM quotes q
  WHERE q.quote_id = '${quote_id}'`;

  const quote = await db.map(sql, [], a => a.json);
  return formResponse( {quote});
};