import * as dotenv from "dotenv";
dotenv.config();
import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  user: process.env.POSTGRESQL_USER,
  host: process.env.POSTDRESQL_HOST,
  database: process.env.POSTDRESQL_DB,
  password: process.env.POSTGRESQL_PASSWORD,
  port: process.env.POSTGRESQL_PORT,
});
