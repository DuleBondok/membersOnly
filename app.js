const express = require("express");
const app = express();
const path = require("node:path");
const { Pool } = require("pg");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");

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
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.render("login");
});

app.get("/sign-up", (req, res) => {
  res.render("signup", {errors: []});
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
    const errors =validationResult(req);
    if(!errors.isEmpty()) {
        return res.render("signup", {errors: errors.array()});
    }
    const password = req.body.signUpPassword;
    const confirmPassword = req.body.confirmPassword;
    try {
      if (password === confirmPassword) {
        const hashedPassword = await bcrypt.hash(password, 10);
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
        console.log("Passwords match exactly!");
        res.redirect("/");
      } else {
        console.log("Passwords dont match!");
      }
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);

app.listen(3000, () => console.log("App listening on port 3000"));
