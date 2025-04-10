const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function(passport) {
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        console.log("🔍 Attempting login for:", email);
        const user = await User.findOne({ email });

        if (!user) {
          console.log("❌ User not found:", email);
          return done(null, false, { message: 'Email not registered' });
        }

        // Match password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          console.log("❌ Incorrect password for:", email);
          return done(null, false, { message: 'Password incorrect' });
        }

        console.log("✅ Login successful:", user.email);
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log("✅ Serializing User:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    console.log("🔄 Deserializing User ID:", id);
    try {
      const user = await User.findById(id).select("username email");
      if (!user) {
        console.log("❌ No user found for ID:", id);
        return done(null, false);
      }
      console.log("✅ User deserialized:", user);
      done(null, user); // ✅ Should return full user object, not just `id`
    } catch (err) {
      console.error("🔥 Error in deserialization:", err);
      done(err);
    }
  });  
};
