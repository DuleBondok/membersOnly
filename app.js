const express = require("express");
const app = express();
const path = require("node:path");
const { Pool } = require("pg");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { error } = require("node:console");

const pool = new Pool({
  user: "dulebondok",
  password: "dusansrbija1",
  host: "localhost",
  database: "members",
  port: 5432,
});

app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use(session({ secret: "cats", resave: "false", saveUninitialized: false }));
app.use(passport.session());
app.use(passport.initialize());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.render("login", { user: req.user || null, error: null });
});

app.get("/sign-up", (req, res) => {
  res.render("signup", { errors: [] });
});

app.post(
  "/sign-up",
  [
    body("firstName")
      .trim()
      .notEmpty()
      .withMessage("First name is required!")
      .escape(),
    body("lastName")
      .trim()
      .notEmpty()
      .withMessage("Last name is required!")
      .escape(),
    body("signUpEmail")
      .trim()
      .isEmail()
      .withMessage("Invalid email address!")
      .normalizeEmail(),
    body("signUpPassword")
      .isLength({ min: 5 })
      .withMessage("Password must be at least 5 characters long!"),
    body("confirmPassword").custom((value, { req }) => {
      if (value != req.body.signUpPassword) {
        throw new Error("Passwords do not match!");
      }
      return true;
    }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("signup", { errors: errors.array() });
    }

    try {
      const hashedPassword = await bcrypt.hash(req.body.signUpPassword, 10);
      await pool.query(
        "INSERT INTO members (first_name, last_name, email, membership, password) VALUES ($1, $2, $3, $4, $5)",
        [
          req.body.firstName,
          req.body.lastName,
          req.body.signUpEmail,
          "Standard",
          hashedPassword,
        ]
      );
      console.log("User registered sucessfully!");
      res.redirect("/");
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);

passport.use(
  new LocalStrategy(
    { usernameField: "logInEmail", passwordField: "logInPassword" },
    async (logInEmail, logInPassword, done) => {
      try {
        const { rows } = await pool.query(
          "SELECT * FROM members WHERE email = $1",
          [logInEmail]
        );
        const user = rows[0];

        if (!user) {
          return done(null, false, { message: "Incorrect email address!" });
        }

        const match = await bcrypt.compare(logInPassword, user.password);
        if (!match) {
          return done(null, false, { message: "Incorrect password!" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await pool.query("SELECT * FROM members WHERE id = $1", [
      id,
    ]);
    const user = rows[0];
    done(null, user);
  } catch (err) {
    done(err);
  }
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/account",
    failureRedirect: "/",
  })
);

app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/account", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/");
  }
  res.render("account", { user: req.user });
});

app.post("/submit-message", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send("You must be logged in to send messages!");
  }

  const { newMsg } = req.body;
  const userId = req.user.id;

  if (!newMsg.trim()) {
    return res.redirect("/account");
  }

  try {
    await pool.query(
      "INSERT INTO messages (user_id, message) VALUES ($1, $2)",
      [userId, newMsg]
    );
    res.redirect("/account");
  } catch (error) {
    console.error("Error inserting message: ", error);
    res.status(500).send("Error saving message!");
  }
});

app.get("/homepage", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/");
  }

  try {
    const messages = await pool.query(
      "SELECT messages.message, messages.created_at, members.first_name FROM messages JOIN members ON messages.user_id = members.id ORDER BY messages.created_at DESC"
    );
    res.render("homepage", { user: req.user, messages: messages.rows });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).send("Error loading messages");
  }
});

app.listen(3000, () => console.log("App listening on port 3000"));
