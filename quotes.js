'use strict';
const { db } = require('./utils');
const { formSuccessResponse } = require('./utils');
const { formErrorResponse } = require('./utils');
const uuidv1 = require('uuid/v1');

module.exports.GetQuotes = async () => {
    const sql = "SELECT json_build_object('quote_id', q.quote_id, 'quote_text', q.quote_text, 'content_id', q.content_id, 'member', " +
        " (SELECT json_build_object('member_id', m.member_id, 'firstname', m.firstname, 'lastname', m.lastname, " +
        " 'nickname', m.nickname, 'phone', m.phone) " +
        " FROM members m WHERE m.member_id = q.author_member_id )) json FROM quotes q";
    try {
        const quotes = await db.map(sql, [], a => a.json);
        return formSuccessResponse( {quotes});
    } catch (e) {
        return formErrorResponse(e);
    }
};

module.exports.GetQuote = async (event) => {
    const quote_id = event['pathParameters']['quote_id'];

    const sql = "SELECT json_build_object('quote_id', q.quote_id, 'quote_text', q.quote_text, 'content_id', q.content_id, 'member', " +
        " (SELECT json_build_object('member_id', m.member_id, 'firstname', m.firstname, 'lastname', m.lastname, 'nickname', m.nickname, 'phone', m.phone) " +
        " FROM members m WHERE m.member_id = q.author_member_id )) json " +
        " FROM quotes q WHERE q.quote_id = $1";
    try {
        const quote = await db.map(sql, [quote_id], a => a.json);
        // Returns an array of Quote objects of size one, so return 0th element in the array
        return formSuccessResponse( {quote: quote[0]});
    } catch (e) {
        return formErrorResponse(e);
    }
};

module.exports.CreateQuote = async (event) => {
    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        body = event.body;
    }
    const quote_text = body['quote_text'], author_member_id = body['author_member_id'];
    if (quote_text == null || author_member_id == null) {
        const error = { name: 'error', detail: 'Missing a required body parameter' };
        return formErrorResponse(error);
    }

    const quote = {
        quote_id: uuidv1(),
        quote_text,
        author_member_id,
        content_id: event['content_id'],
        is_visible: event['is_visible'] || true
    };
    const sql = 'INSERT INTO quotes(quote_id, quote_text, author_member_id, content_id, is_visible) ' +
        'VALUES( $1, $2, $3, $4, $5 )';
    try {
        await db.none(sql, [
            quote.quote_id,
            quote.quote_text,
            quote.author_member_id,
            quote.content_id,
            quote.is_visible
        ]);
        return formSuccessResponse( {quote});
    } catch (e) {
        console.log(e);
        return formErrorResponse(e);
    }
};

module.exports.UpdateQuote = async (event) => {
    const quote_id = event['pathParameter']['quote_id'];
};

module.exports.ToggleQuoteVisibility = async (event) => {
    const quote_id = event['pathParameters']['quote_id'];
    const sql = 'UPDATE quotes SET is_visible = NOT is_visible WHERE quote_id = $1 RETURNING is_visible';
    try {
        const quoteVisiblity = await db.one(sql, [quote_id]);
        const quote = { quote_id, is_visible: quoteVisiblity };
        return formSuccessResponse({quote});
    } catch (e) {
        return formErrorResponse(e);
    }
};