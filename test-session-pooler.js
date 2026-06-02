import pg from 'pg';

const client = new pg.Client({
  host: 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: 5432, // Session pooler port
  user: 'postgres.iqgyymwzxujoqnmpayxy',
  password: '1AndScene@db',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Session pooler connection successful!');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
  } catch (err) {
    console.error('Session pooler connection failed:', err.message);
  } finally {
    await client.end();
  }
}

run();
