const { Pool } = require("pg");

module.exports = new Pool({
  connectionString:
    "postgresql://dulebondok:dusansrbija1@localhost:5432/members",
});