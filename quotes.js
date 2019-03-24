'use strict';
const { db } = require('./utils');
const { formSuccessResponse } = require('./utils');
const { formErrorResponse } = require('./utils');
const uuidv1 = require('uuid/v1');

module.exports.GetQuotes = async () => {
  const sql = "SELECT json_build_object('quote_id', q.quote_id, 'quote_text', q.quote_text, 'member', " +
    " (SELECT json_build_object('member_id', m.member_id, 'firstname', m.firstname, 'lastname', m.lastname, " +
    " 'nickname', m.nickname) " +
    " FROM members m WHERE m.member_id = q.author_member_id )) json FROM quotes q";
  try {
    const quotes = await db.map(sql, [], a => a.json);
    return formSuccessResponse( {quotes});
  } catch (e) {
    return formErrorResponse(e);
  }
};

/*
  Get quote information, its author-member information, and all media related to it
*/
module.exports.GetQuote = async (event) => {
  const quote_id = event.pathParameters.quote_id;
  const sql =
    " SELECT json_build_object( 'quote_id', q.quote_id, 'quote_text', q.quote_text, 'member', " +
    "   (SELECT json_build_object('member_id', m.member_id, 'firstname', m.firstname, 'lastname', m.lastname, " +
    "     'nickname', m.nickname, 'phone', m.phone) " +
    "   FROM members m WHERE m.member_id = q.author_member_id " +
    "   )," +
    " 'media', " +
    "   (SELECT json_agg(json_build_object('media_id', media.media_id, 'title', media.title," +
    "       'description', media.description, 'media_date', media.media_date, 'file_type', media.file_type)) " +
    "   FROM media, quotes_media, quotes " +
    "   WHERE media.is_visible = TRUE " +
    "   AND media.media_id = quotes_media.media_id " +
    "   AND quotes_media.quote_id = quotes.quote_id " +
    " )) json " +
    " FROM quotes q WHERE q.quote_id = $1;";
  try {
    // Returns an array of size one
    let quote = await db.map(sql, [quote_id], a => a.json);
    // get 0th element in the array
    quote = quote[0];
    // If no media exists, return an empty array instead of null
    if (!quote.media) {
      quote.media = [];
    }
    return formSuccessResponse( {quote: quote});
  } catch (e) {
    return formErrorResponse(e);
  }
};

module.exports.CreateQuote = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    body = event.body;
  }
  if (body.quote_text == null || body.author_member_id == null) {
    const error = { name: 'error', detail: 'Missing a required body parameter' };
    return formErrorResponse(error);
  }

  const quote = {
    quote_id: uuidv1(),
    quote_text: body.quote_text,
    author_member_id: body.author_member_id,
    is_visible: body.is_visible || true
  };
  const sql = 'INSERT INTO quotes(quote_id, quote_text, author_member_id, is_visible) ' +
    'VALUES( $1, $2, $3, $4, $5 )';
  try {
    await db.none(sql, [
      quote.quote_id,
      quote.quote_text,
      quote.author_member_id,
      quote.is_visible
    ]);
    return formSuccessResponse( {quote});
  } catch (e) {
    return formErrorResponse(e);
  }
};

/*
  Change a quote's author or text
*/
module.exports.UpdateQuote = async (event) => {
  const quote_id = event.pathParameters.quote_id;
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    body = event.body;
  }

  let newQuote = {
    quote_text: body.quote_text,
    author_member_id: body.author_member_id
  };

  // Retrieve quote as it currently exists
  let oldQuote = {};
  let sql = 'SELECT quote_text, author_member_id FROM quotes WHERE quote_id = $1';
  try {
    oldQuote = await db.one(sql, [quote_id]);
  } catch (e) {
    return formErrorResponse(e);
  }

  // Copy props from oldQuote to newQuote if they don't exist in newQuote
  for (let property in oldQuote) {
    if (newQuote[property] == null) {
      newQuote[property] = oldQuote[property];
    }
  }

  sql = 'UPDATE quotes SET quote_text = $1, author_member_id = $2';
  let quoteValues = Object.values(newQuote); // Array of updated quote values
  quoteValues.push(quote_id); // Append quote_id for response consistency
  try {
    await db.none(sql, quoteValues);
    return formSuccessResponse({quote: newQuote});
  } catch (e) {
    return formErrorResponse(e);
  }
};

/*
  Link a media item to a quote
*/
module.exports.LinkQuoteMedia = async (event) => {
  const quote_id = event.pathParameters.quote_id;
  const media_id = event.pathParameters.media_id;

  const sql = 'INSERT INTO quotes_media VALUES($1, $2)';
  try {
    await db.none(sql, [quote_id, media_id]);
    return formSuccessResponse();
  } catch (e) {
    return formErrorResponse(e);
  }
};

/*
  Remove the link between a quote and media item
*/
module.exports.UnlinkQuoteMedia = async (event) => {
  const quote_id = event.pathParameters.quote_id;
  const media_id = event.pathParameters.media_id;

  const sql = 'DELETE FROM quotes_media WHERE quote_id = $1 AND media_id = $2';
  try {
    const result = await db.result(sql, [quote_id, media_id]);
    if (result.rowCount === 1) {
      return formSuccessResponse();
    } else {
      const error = {
        message: 'Combination of quote and media item does not exist; cannot remove link that does not exist.',
        detail: 'Delete query returned zero rows affected'
      };
      return formErrorResponse(error);
    }
  } catch (e) {
    return formErrorResponse(e);
  }
};

module.exports.ToggleQuoteVisibility = async (event) => {
  const quote_id = event.pathParameters.quote_id;
  const sql = 'UPDATE quotes SET is_visible = NOT is_visible WHERE quote_id = $1 RETURNING is_visible';
  try {
    const quoteVisiblity = await db.one(sql, [quote_id]);
    const quote = { quote_id, is_visible: quoteVisiblity };
    return formSuccessResponse({quote});
  } catch (e) {
    return formErrorResponse(e);
  }
};