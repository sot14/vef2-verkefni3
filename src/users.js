import bcrypt from 'bcrypt';
import pg from 'pg';
import dotenv from 'dotenv';
import { db } from './db.js'
 
dotenv.config();

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString });

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function comparePasswords(password, hash) {
    const result = await bcrypt.compare(password, hash);
  
    return result;
  }
  
  export async function findByUsername(username) {
    const q = 'SELECT * FROM users WHERE username = $1';
  
    try {
      const result = await db.query(q, [username]);
  
      if (result.rowCount === 1) {
        return result.rows[0];
      }
    } catch (e) {
      console.error('Gat ekki fundið notanda eftir notendnafni');
      return null;
    }
  
    return false;
  }
  
  export async function findById(id) {
    const q = 'SELECT * FROM users WHERE id = $1';
  
    try {
      const result = await db.query(q, [id]);
  
      if (result.rowCount === 1) {
        return result.rows[0];
      }
    } catch (e) {
      console.error('Gat ekki fundið notanda eftir id');
    }
  
    return null;
  }
  
export async function createUser(username, password) {
    // Geymum hashað password!
    const hashedPassword = await bcrypt.hash(password, 11);
  
    const q = `
      INSERT INTO
        users (username, password)
      VALUES ($1, $2)
      RETURNING *
    `;
  
    try {
      const result = await db.query(q, [username, hashedPassword]);
      return result.rows[0];
    } catch (e) {
      console.error('Gat ekki búið til notanda');
    }
  
    return null;
  }

export async function showUsers() {
    const q = 'SELECT * FROM users;';
    const result = await db.query(q);
    return result.rows;
}