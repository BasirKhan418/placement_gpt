import sqlite3 from "sqlite3";
import { open } from "sqlite";

// Open SQLite DB connection
export async function openDb() {
  return open({
    filename: "./mydb.sqlite",
    driver: sqlite3.Database,
  });
}
