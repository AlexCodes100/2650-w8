import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oidc';
import { connectDB } from '../db.js';
import { ObjectId } from 'mongodb';

const router = express.Router();
let db;

// Ensure the database connection is established
(async () => {
  db = await connectDB();
})();

// Configure the Google strategy for use by Passport.
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/oauth2/redirect/google',
  scope: ['profile']
}, async (issuer, profile, cb) => {
  try {
    const users = db.collection('users');
    let user = await users.findOne({ name: profile.displayName });
    if (!user) {
      const result = await users.insertOne({ name: profile.displayName });
      user = { id: result.insertedId, name: profile.displayName };
    }
    console.log('Authenticated user:', user); // Debug log
    return cb(null, user);
  } catch (err) {
    return cb(err);
  }
}));

passport.serializeUser((user, cb) => {
    console.log('Serializing user:', user); // Debug log
    cb(null, user._id); // Store only the user ID
  });

passport.deserializeUser(async (id, cb) => {
  console.log('Deserializing user ID:', id); // Debug log
  try {
    const users = db.collection('users');
    const dbUser = await users.findOne({ _id: new ObjectId(id) });
    console.log('Found user in DB:', dbUser); // Debug log
    cb(null, dbUser);
  } catch (err) {
    cb(err);
  }
});

// Route to initiate Google login
router.get('/login/federated/google', passport.authenticate('google'));

// Callback route to handle Google login response
router.get('/oauth2/redirect/google', passport.authenticate('google', {
  successReturnToOrRedirect: '/',
  failureRedirect: '/login'
}));

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});



export default router;
