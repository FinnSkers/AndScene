import pg from 'pg';

const client = new pg.Client({
  host: '2406:da12:1f1:f802:9dde:e180:3b69:9399',
  port: 5432,
  user: 'postgres',
  password: '1AndScene@db',
  database: 'postgres'
});

async function run() {
  try {
    await client.connect();
    console.log('Direct connection successful!');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
  } catch (err) {
    console.error('Direct connection failed:', err.message);
  } finally {
    await client.end();
  }
}

run();
