const parseCookies = (req, res, next) => {
  // access the cookies on an incoming request header
  let cookies = req.headers.cookie
    ? (req.headers.cookie).split('; ')
    : [];
  let parsedCookies = {};
  // parse them into an object
  for (cookie of cookies) {
    let temp = cookie.split('=');
    parsedCookies[temp[0]] = temp[1];
  }
  // assign this object to a cookies property on the req
  req.cookies = parsedCookies;
  next();
};

module.exports = parseCookies;