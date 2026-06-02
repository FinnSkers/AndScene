import dns from 'dns';

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
  // Let's resolve the CNAME of db.iqgyymwzxujoqnmpayxy.supabase.co
  dns.resolveCname('db.iqgyymwzxujoqnmpayxy.supabase.co', (err, addresses) => {
    if (err) {
      console.log('CNAME lookup failed, checking text resolve...');
    } else {
      console.log('CNAME addresses:', addresses);
    }
  });

  // Try direct lookup of dns.resolve4 for db.iqgyymwzxujoqnmpayxy.supabase.co
  dns.resolve4('db.iqgyymwzxujoqnmpayxy.supabase.co', (err, addresses) => {
    if (err) {
      console.log('IPv4 direct lookup failed:', err.message);
    } else {
      console.log('IPv4 addresses:', addresses);
    }
  });

  // Resolve TXT records or other records
  dns.resolveTxt('db.iqgyymwzxujoqnmpayxy.supabase.co', (err, addresses) => {
    if (!err) console.log('TXT records:', addresses);
  });

  // Ping regions to find pooler host
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    dns.lookup(host, (err, address) => {
      if (!err && address) {
        console.log(`Region ${region} resolved to ${address}`);
      }
    });
  }
}

check();
