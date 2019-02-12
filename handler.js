'use strict';

const pgp = require('pg-promise')();
const aws = require('aws-sdk');
const lambda = new aws.Lambda({
  region: 'us-east-1'
});
const db = pgp({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

function formResponse(body, statusCode) {
  return {
    statusCode: (statusCode) ? statusCode : 200,
    body: JSON.stringify(body)
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

module.exports.GetMember = async (event) => {
  const member_id = event['pathParameters']['member_id'];

  const sql = `SELECT json_build_object('member_id', m.member_id, 'firstname', m.firstname, 'lastname', m.lastname, 'nickname', m.nickname, 'phone', m.phone, 'quotes',
    (SELECT json_agg(json_build_object('quote_id', q.quote_id, 'quote_text', q.quote_text))
    FROM quotes q WHERE q.author_member_id = m.member_id )) json
  FROM members m
  WHERE m.member_id = '${member_id}'`;

  const member = await db.map(sql, [], a => a.json);
  return formResponse({member});
};

module.exports.CreateMember = async (event) => {
  const uuidv1 = require('uuid/v1');
  const member = {
    member_id: uuidv1(),
    firstname: event['pathParameters']['firstname'],
    lastname: event['pathParameters']['lastname'],
    nickname: event['pathParameters']['nickname'],
    phone: event['pathParameters']['phone'],
    is_active: (event['pathParameters']['is_active'] == null) ? true : event['pathParameters']['is_active']
  };

  await db.none('INSERT INTO members(member_id, firstname, lastname, nickname, phone, is_active) ' +
      'VALUES( $1, $2, $3, $4, $5, $6 )', [
    member.member_id,
    member.firstname,
    member.lastname,
    member.nickname,
    member.phone,
    member.is_active
  ]);
  return formResponse({member});
};

module.exports.UpdateMember = async (event) => {
  const member_id = event['pathParameters']['member_id'];
  var newMember = {
    firstname: event['pathParameters']['firstname'],
    lastname: event['pathParameters']['lastname'],
    nickname: event['pathParameters']['nickname'],
    phone: event['pathParameters']['phone']
  };

  // Retrieve member as it currently exists
  var sql = `SELECT firstname, lastname, nickname, phone FROM members WHERE member_id='${member_id}'`;
  const oldMember = await db.one(sql);

  // Copy props from oldMember to newMember if they don't exist in newMember
  for (var property in oldMember) {
    if (newMember[property] == null) {
      newMember[property] = oldMember[property];
    }
  }

  sql = `UPDATE members SET firstname = $1, lastname = $2, nickname = $3, phone = $4 WHERE member_id='${member_id}'`;
  const memberValues = Object.values(newMember);
  await db.none(sql, memberValues);

  // Append member_id for response consistency
  newMember['member_id'] = member_id;
  return formResponse({member: newMember});
};

module.exports.ToggleMemberStatus = async (event) => {
  const member_id = event['pathParameters']['member_id'];
  const sql = `UPDATE members SET is_active = NOT is_active WHERE member_id='${member_id}' RETURNING is_active`;
  const memberStatus = await db.one(sql);
  const member = {
    member_id,
    is_active: memberStatus.is_active
  };
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