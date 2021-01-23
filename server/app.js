const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');
const cookieParser = require('./middleware/cookieParser');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use(cookieParser);
app.use(Auth.createSession);
app.use(Auth.verifySession);

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/create', (req, res) => {
  res.render('index');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.get('/links', (req, res, next) => {
  models.Links.getAll()
    .then((links) => {
      res.status(200).send(links);
    })
    .error((error) => {
      res.status(500).send(`Error at GET /links ${err.code} | ${err.message}`);
    });
});

app.get('/logout', (req, res) => {
  // Delete current session from database
  models.Sessions.delete({ hash: req.session.hash })
    .then(() => {
      res.cookie('shortlyid', '');
      res.session = {};
      res.redirect('/login');
    });
});

app.post('/links', (req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then((link) => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then((title) => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin,
      });
    })
    .then((results) => {
      return models.Links.get({ id: results.insertId });
    })
    .then((link) => {
      throw link;
    })
    .error((error) => {
      res.status(500).send(`Error at POST /links ${err.code} | ${err.message}`);
    })
    .catch((link) => {
      res.status(200).send(link);
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.post('/signup', (req, res, next) => {
  if (!req.body.username || !req.body.password) {
    res.sendStatus(401);
  } else {
    models.Users.create(req.body)
      .then((newUser) => {
        models.Sessions.update({ hash: req.session.hash }, { userId: newUser.insertId })
          .catch(err => console.error(`Error at POST /signup ${err.code} | ${err.message}`));
        res.redirect('/');
      })
      .catch((err) => res.redirect('/signup?errcode=1'));
  }
});

app.post('/login', (req, res, next) => {
  var userId;
  if (!req.body.username || !req.body.password) {
    res.redirect('/login');
  } else {
    models.Users.get({username: req.body.username})
      .then((targetUser) => {
        if (!targetUser) { throw 'User not found, redirecting...'; }
        userId = targetUser.id;
        return models.Users.compare(req.body.password, targetUser.password, targetUser.salt);
      })
      .then((isCorrect) => {
        if (isCorrect) {
          models.Sessions.update({ hash: req.session.hash }, { userId: userId });
          res.redirect('/');
        } else {
          // If incorrect login
          res.redirect('/login?errcode=2');
        }
      })
      .catch((err) => {
        console.error('Redirecting to /login while attempting POST /login. ');
        res.redirect('/login?errcode=2');
      });
  }
});

/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {
  return models.Links.get({ code: req.params.code })
    .tap((link) => {
      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap((link) => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error((error) => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
