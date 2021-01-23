const models = require('../models');
const Promise = require('bluebird');

var createNewSession = (req, res, next) => {
  models.Sessions.create()
    .then((packet) => {
      return models.Sessions.get({ 'id': packet.insertId });
    })
    .then((newSession) => {
      req.session = {
        'hash': newSession.data,
        'id': newSession.id
      };
      res.cookie('shortlyid', newSession.data);
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
    data = req.cookies.shortlyid;
    models.Sessions.get({data})
      .then((session) => {
        if (!session) {
          createNewSession(req, res, next);
        } else {
          // signed Cookie check, apply secret
          // hash(session.data + secret) === session.hash
          models.Sessions.compare(session.data, session.hash);
          req.session = session;
          next();
        }
      })
      .catch((err) => {
        console.error('Error retrieving session information: ', err);
      });
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

module.exports.verifySession = (req, res, next) => {
  // Check which route they're going to
  let path = req.path;
  // If route is / , /links, or /create AND not signed in, redirect to login
  if ((path === '/' || path === '/links' || path === '/create') && !models.Sessions.isLoggedIn(req.session)) {
    res.redirect('/login');
  } else {
    res.status(200);
    next();
  }
};
