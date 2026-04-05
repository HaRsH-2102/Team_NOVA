module.exports = {
  generateIP: function (userContext, events, done) {
    const ip =
      Math.floor(Math.random() * 255) + "." +
      Math.floor(Math.random() * 255) + "." +
      Math.floor(Math.random() * 255) + "." +
      Math.floor(Math.random() * 255);

    userContext.vars.ip = ip;
    return done();
  }
};