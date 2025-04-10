module.exports.ensureAuthenticated = (req, res, next) => {
  console.log("🔍 Checking authentication...");

  if (req.session && req.session.user) {
      console.log(`✅ User is authenticated: ${req.session.user.username}`);
      req.user = req.session.user; // Ensure `req.user` is available
      return next();
  }

  console.log("🚨 User is not authenticated. Redirecting to login.");
  res.redirect("/login");
};
