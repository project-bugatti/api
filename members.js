'use strict';
const { db } = require('./utils');
const { formSuccessResponse } = require('./utils');
const { formErrorResponse } = require('./utils');
const uuidv1 = require('uuid/v1');

module.exports.GetMembers = async () => {
    try {
        const members = await db.any('SELECT * FROM members');
        return formSuccessResponse({members} );
    } catch (e) {
        return formErrorResponse(e);
    }
};

module.exports.GetMember = async (event) => {
    const member_id = event['pathParameters']['member_id'];

    const sql = "SELECT json_build_object('member_id', m.member_id, 'firstname', m.firstname, 'lastname', m.lastname, " +
        "'nickname', m.nickname, 'phone', m.phone, 'is_active', m.is_active,'quotes', " +
        "(SELECT json_agg(json_build_object('quote_id', q.quote_id, 'quote_text', q.quote_text)) " +
        "FROM quotes q WHERE q.author_member_id = m.member_id )) json " +
        "FROM members m WHERE m.member_id = $1";
    try {
        let member = (await db.map(sql, [member_id], a => a.json))[0];
        // Returns an array of Member objects of size one, get the 0th element

        // If member has no quotes, set quotes as empty array instead of null
        if (!member.quotes) member.quotes = [];
        return formSuccessResponse({member: member});
    } catch (e) {
        return formErrorResponse(e);
    }
};

module.exports.CreateMember = async (event) => {
    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        body = event.body;
    }
    const firstname = body['firstname'], lastname = body['lastname'], phone = body['phone'];
    if (firstname == null || lastname == null || phone == null) {
        const error = { name: 'error', detail: 'Missing a required body parameter' };
        return formErrorResponse(error);
    }

    const member = {
        member_id: uuidv1(),
        firstname,
        lastname,
        nickname: body['nickname'],
        phone,
        is_active: body['is_active'] || true
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

module.exports.UpdateMember = async (event) => {
    const member_id = event['pathParameters']['member_id'];
    const body = JSON.parse(event.body);

    let newMember = {
        firstname: body['firstname'],
        lastname: body['lastname'],
        nickname: body['nickname'],
        phone: body['phone']
    };

    let oldMember = {};

    // Retrieve member as it currently exists
    let sql = 'SELECT firstname, lastname, nickname, phone FROM members WHERE member_id = $1';
    try {
        oldMember = await db.one(sql, member_id);
    } catch (e) {
        return formErrorResponse(e);
    }

    // Copy props from oldMember to newMember if they don't exist in newMember
    for (let property in oldMember) {
        if (newMember[property] == null) {
            newMember[property] = oldMember[property];
        }
    }

    sql = 'UPDATE members SET firstname = $1, lastname = $2, nickname = $3, phone = $4 WHERE member_id = $5';
    let memberValues = Object.values(newMember); // Array of updated member values
    memberValues.push(member_id); // Append member_id for response consistency
    try {
        await db.none(sql, memberValues);
        return formSuccessResponse({member: newMember});
    } catch (e) {
        return formErrorResponse(e);
    }
};

module.exports.ToggleMemberStatus = async (event) => {
    const member_id = event['pathParameters']['member_id'];
    const sql = 'UPDATE members SET is_active = NOT is_active WHERE member_id = $1 RETURNING is_active';
    try {
        const memberStatus = await db.one(sql, member_id);
        const member = { member_id, is_active: memberStatus.is_active };
        return formSuccessResponse({member});
    } catch (e) {
        return formErrorResponse(e);
    }
};
