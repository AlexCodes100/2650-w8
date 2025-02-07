import "dotenv/config.js";
import createError from "http-errors";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import indexRouter from "./routes/index.js";
import session from "express-session";
import connectRedis from "connect-redis";
import { createClient } from "redis";
import passport from "passport";
import authRouter from "./routes/auth.js";
import { connectDB } from './db.js';
import RedisStore from "connect-redis";

// Constants
const port = process.env.PORT || 3000;


// Redis Client Setup
const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  password: process.env.REDIS_PASSWORD,
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

async function startServer() {
  try {
    // Connect to Redis
    await redisClient.connect();
    console.log('Connected to Redis');

    // Connect to MongoDB
    const db = await connectDB();
    
    // Create http server
    const app = express();

    // view engine setup
    app.set("views", path.join("views"));
    app.set("view engine", "pug");

    app.use(logger("dev"));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(express.static(path.join("public")));

    // Session management (Redis)
    app.use(
      session({
        store: new RedisStore({ client: redisClient }),
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENV === 'production', // Set to true if using HTTPS
          httpOnly: true,
          maxAge: 1000 * 60 * 60 * 24, // 1 day
        },
      })
    );

    // Passport middleware
    app.use(passport.initialize());
    app.use(passport.session());

    // Middleware to make user available in templates
    app.use((req, res, next) => {
      console.log('Setting user in res.locals:', req.user);
      res.locals.user = req.user || null;
      next();
    });

    app.use("/", indexRouter);
    app.use("/auth", authRouter);

    // Route to print sessions for debugging
    app.get('/print-sessions', (req, res) => {
      res.json(req.session);
    });

    // catch 404 and forward to error handler
    app.use(function (req, res, next) {
      next(createError(404));
    });

    // error handler
    app.use(function (err, req, res, next) {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get("env") === "development" ? err : {};

      // render the error page
      res.status(err.status || 500);
      res.render("error");
    });

    // Start http server
    app.listen(port, () => {
      console.log(`Server started at http://localhost:${port}`);
    });

  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
}

startServer();
