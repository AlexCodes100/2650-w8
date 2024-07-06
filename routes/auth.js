import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oidc';
import { MongoClient } from 'mongodb';

const router = express.Router();

// MongoDB setup
const client = new MongoClient(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
let db;

// Connect to MongoDB
client.connect((err) => {
  if (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
  db = client.db();
  console.log('Connected to MongoDB');
});

// Configure the Google strategy for use by Passport.
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  scope: ['profile']
}, async (issuer, profile, cb) => {
  try {
    const users = db.collection('users');
    const federatedCredentials = db.collection('federated_credentials');
    let user = await federatedCredentials.findOne({ provider: issuer, subject: profile.id });
    if (!user) {
      const result = await users.insertOne({ name: profile.displayName });
      user = { id: result.insertedId, name: profile.displayName };
      await federatedCredentials.insertOne({ user_id: user.id, provider: issuer, subject: profile.id });
    } else {
      user = await users.findOne({ _id: user.user_id });
    }
    return cb(null, user);
  } catch (err) {
    return cb(err);
  }
}));

passport.serializeUser((user, cb) => {
  cb(null, { id: user._id, name: user.name });
});

passport.deserializeUser(async (user, cb) => {
  try {
    const users = db.collection('users');
    const dbUser = await users.findOne({ _id: user.id });
    cb(null, dbUser);
  } catch (err) {
    cb(err);
  }
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.get('/login/federated/google', passport.authenticate('google'));

router.get('/oauth2/redirect/google', passport.authenticate('google', {
  successReturnToOrRedirect: '/',
  failureRedirect: '/login'
}));

router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

export default router;
