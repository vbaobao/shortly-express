const models = require('../models');
const Promise = require('bluebird');

var createNewSession = (req, res, next) => {
  models.Sessions.create()
    .then((packet) => {
      return models.Sessions.get({ 'id': packet.insertId });
    })
    .then((newSession) => {
      console.log('NewSession', newSession);
      req.session = {
        'hash': newSession.hash,
        'id': newSession.id
      };
      res.cookie('shortlyid', newSession.hash);
      next();
    })
    .catch((err) => {
      console.error('Error creating new session: ', err);
    });
};

module.exports.createSession = (req, res, next) => {
  // Accesses parsed cookies on req -> req.cookies.shortlyid
  let hash;
  if (!req.cookies.shortlyid) {
    createNewSession(req, res, next);
  } else {
    hash = req.cookies.shortlyid;
    models.Sessions.get({hash})
      .then((session) => {
        if (!session) {
          createNewSession(req, res, next);
        }

        console.log('Original:', session);
        req.session = session;
        console.log('Saved', req.session);
        next();
      })
      .catch((err) => {
        console.error('Error retrieving session information: ', err);
      });
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/