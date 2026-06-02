import pg from 'pg';

const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'sa-east-1',
  'ca-central-1'
];

async function check() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const client = new pg.Client({
      host,
      port: 6543,
      user: 'postgres.iqgyymwzxujoqnmpayxy',
      password: '1AndScene@db',
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log(`FOUND REGION: ${region}! Connection successful!`);
      await client.end();
      break;
    } catch (err) {
      console.log(`Region ${region} threw:`, err.message);
    }
  }
  console.log('Probing finished.');
}

check();
