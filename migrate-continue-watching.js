import pg from 'pg';

const config = {
  host: 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.iqgyymwzxujoqnmpayxy',
  password: '1AndScene@db',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
};

const client = new pg.Client(config);

async function run() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database!');

    const sql = `
      ALTER TABLE public.continue_watching ADD COLUMN IF NOT EXISTS season INTEGER;
      ALTER TABLE public.continue_watching ADD COLUMN IF NOT EXISTS episode INTEGER;
    `;

    await client.query(sql);
    console.log('Successfully added season and episode columns to continue_watching table!');
  } catch (err) {
    console.error('Error running migrations:', err);
  } finally {
    await client.end();
  }
}

run();
