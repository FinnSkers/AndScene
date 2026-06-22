import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  host: 'db.iqgyymwzxujoqnmpayxy.supabase.co',
  port: 5432,
  user: 'postgres',
  password: process.env.PG_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
};

const client = new pg.Client(config);

async function run() {
  try {
    await client.connect();
    const sqlPath = path.join(__dirname, process.argv[2]);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log(`Executed ${process.argv[2]} successfully!`);
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

run();
