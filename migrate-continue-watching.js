import pg from 'pg';

const config = {
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  ssl: { rejectUnauthorized: false }
};

const client = new pg.Client(config);

async function run() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database!');
    // Add migration logic here
  } catch (err) {
    console.error('Error connecting to database:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
