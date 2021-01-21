const models = require('../models');
const Promise = require('bluebird');

var createNewSession = (req, res, next) => {
  models.Sessions.create()
    .then((packet) => {
      return models.Sessions.get({ 'id': packet.insertId });
    })
    .then((newSession) => {
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

        req.session = session;
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

module.exports.verifySession = (req, res, next) => {
  // Check which route they're going to
  let path = req.path;
  // If route is / , /links, or /create AND not signed in, redirect to login
  if ((path === '/' || path === '/links' || path === '/create') && !models.Sessions.isLoggedIn(req.session)) {
    res.redirect(301, '/login');
  } else {
    res.status(200);
  }
  console.log(`accessing ${req.path}`, 'forwarding');
  next();
};
