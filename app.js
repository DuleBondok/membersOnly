const express = require("express");
const app = express();
const path = require("node:path");
const {Pool} = require("pg");
const session = require("express-session");
const passport = require("passport")
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");

const pool = new Pool ({
    user: "dulebondok",
    password: "dusansrbija1",
    host: "localhost",
    database: "dulebondok",
    port:5432,
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(session({secret: "cats", resave: "false", saveUninitialized: false}));
app.use(passport.session());
app.use(express.urlencoded({extended: false}));

app.get("/", (req,res) => {
    res.render("login");
});

app.listen(3000, () => console.log("App listening on port 3000"));
