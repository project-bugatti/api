'use strict';
const { db, formSuccessResponse, formErrorResponse } = require('./utils');
const { authorize } = require('./auth');
const uuidv1 = require('uuid/v1');

module.exports.getMembers = async (event) => {
  let isActive = true;
  if (event.queryStringParameters && event.queryStringParameters.isActive) {
    isActive = event.queryStringParameters.isActive;
  }

  try {
    const members = await db.any('SELECT * FROM members WHERE is_active = $1', [isActive]);
    return formSuccessResponse({members} );
  } catch (e) {
    return formErrorResponse(e);
  }
};

/*
  Get member information and all quotes and media linked to member
*/
module.exports.getMember = event => {
  return authorize(event)
    .then( async () => {
      const member_id = event.pathParameters.member_id;
      const sql =
        " SELECT json_build_object('member_id', m.member_id, 'firstname', m.firstname, 'lastname', m.lastname,  " +
        " 'nickname', m.nickname, 'phone', m.phone, 'is_active', m.is_active, 'quotes', " +
        "   (SELECT json_agg(json_build_object('quote_id', q.quote_id, 'quote_text', q.quote_text)) " +
        "   FROM quotes q WHERE q.author_member_id = m.member_id)," +
        " 'media', " +
        "   (SELECT json_agg(json_build_object('media_id', media.media_id, 'title', media.title,  " +
        "   'description', media.description, 'file_type', media.file_type, 'media_date', media.media_date))  " +
        "   FROM media, members_media " +
        "   WHERE media.media_id = members_media.media_id " +
        "   AND members_media.member_id = m.member_id " +
        "   )" +
        " ) json " +
        " FROM members m WHERE m.member_id = $1";
      try {
        // Returns an array of size one
        let member = await db.map(sql, [member_id], a => a.json);
        // get 0th element in the array
        member = member[0];
        // If no quotes or media exists, return empty arrays instead of null
        if (!member.quotes) {
          member.quotes = [];
        }
        if (!member.media) {
          member.media = [];
        }
        return formSuccessResponse({member: member});
      } catch (e) {
        return formErrorResponse(e);
      }
    })
    .catch( e => {
      return formErrorResponse(e);
    });
};

module.exports.createMember = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    body = event.body;
  }

  const firstname = body.firstname, lastname = body.lastname, phone = body.phone;
  if (firstname == null || lastname == null || phone == null) {
    const error = { message: 'Missing a required body parameter' };
    return formErrorResponse(error);
  }

  const member = {
    member_id: uuidv1(),
    firstname,
    lastname,
    nickname: body.nickname,
    phone,
    is_active: body.is_active || true
  };

  const sql = 'INSERT INTO members(member_id, firstname, lastname, nickname, phone, is_active) ' +
    'VALUES( $1, $2, $3, $4, $5, $6 )';
  try {
    await db.none(sql, [
      member.member_id,
      member.firstname,
      member.lastname,
      member.nickname,
      member.phone,
      member.is_active
    ]);
    return formSuccessResponse({member});
  } catch (e) {
    return formErrorResponse(e);
  }
};

module.exports.updateMember = async (event) => {
  const member_id = event.pathParameters.member_id;
  let body = {};
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    body = event.body;
  }

  let newMember = {
    firstname: body.firstname,
    lastname: body.lastname,
    nickname: body.nickname,
    phone: body.phone
  };

  // Retrieve member as it currently exists
  let oldMember = {};
  let sql = 'SELECT firstname, lastname, nickname, phone FROM members WHERE member_id = $1';
  try {
    oldMember = await db.one(sql, member_id);
  } catch (e) {
    return formErrorResponse(e);
  }

  let memberKeys = Object.getOwnPropertyNames(oldMember);

  // Copy props from oldMember to newMember if they don't exist in newMember
  for (var i = 0; i < memberKeys.length; i++) {
    if (newMember[memberKeys[i]] == null) {
      newMember[memberKeys[i]] = oldMember[memberKeys[i]];
    }
  }

  sql = 'UPDATE members SET firstname = $1, lastname = $2, nickname = $3, phone = $4 WHERE member_id = $5';
  let newMemberValues = Object.values(newMember); // Array of updated member values
  newMemberValues.push(member_id); // Append member_id for response consistency
  try {
    await db.none(sql, newMemberValues);
    return formSuccessResponse({member: newMemberValues});
  } catch (e) {
    return formErrorResponse(e);
  }
};

module.exports.linkMemberMedia = async (event) => {
  const member_id = event.pathParameters.member_id;
  const media_id = event.pathParameters.media_id;

  const sql = 'INSERT INTO members_media VALUES($1, $2)';
  try {
    await db.none(sql, [member_id, media_id]);
    return formSuccessResponse();
  } catch (e) {
    return formErrorResponse(e);
  }
};

module.exports.unlinkMemberMedia = async (event) => {
  const member_id = event.pathParameters.member_id;
  const media_id = event.pathParameters.media_id;

  const sql = 'DELETE FROM members_media WHERE member_id = $1 AND media_id = $2';
  try {
    const result = await db.result(sql, [member_id, media_id]);
    if (result.rowCount === 1) {
      return formSuccessResponse();
    } else {
      const error = {
        message: 'Combination of member and media item does not exist; cannot remove link that does not exist.',
        detail: 'Delete query returned zero rows affected'
      };
      return formErrorResponse(error);
    }
  } catch (e) {
    return formErrorResponse(e);
  }
};

module.exports.toggleMemberStatus = async (event) => {
  const member_id = event.pathParameters.member_id;
  const sql = 'UPDATE members SET is_active = NOT is_active WHERE member_id = $1 RETURNING is_active';
  try {
    const memberStatus = await db.one(sql, member_id);
    const member = { member_id, is_active: memberStatus.is_active };
    return formSuccessResponse({member});
  } catch (e) {
    return formErrorResponse(e);
  }
};
