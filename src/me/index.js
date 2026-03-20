const { GraphQLClient, gql } = require('graphql-request');
const Conf = require('conf');

const config = new Conf({ projectName: 'hostlink-cli' });
const ENDPOINT = 'https://isapi.hostlink.com.hk/';

function getClient() {
  const token = config.get('token');
  if (!token) {
    console.error('No token found. Run `hostlink set-token <token>` first.');
    process.exit(1);
  }
  return new GraphQLClient(ENDPOINT, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function register(program) {
  program
    .command('me')
    .description('Show current logged-in user profile')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const client = getClient();
      const query = gql`
        query {
          my {
            user_id
            username
            first_name
            last_name
            email
            phone
            addr1
            addr2
            addr3
            status
            language
            join_date
            expiry_date
          }
        }
      `;
      try {
        const data = await client.request(query);
        const me = data?.my;
        if (!me) {
          console.error('Failed to retrieve user profile.');
          process.exit(1);
        }
        if (options.json) {
          console.log(JSON.stringify(me, null, 2));
        } else {
          console.log(`User ID:    ${me.user_id}`);
          console.log(`Username:   ${me.username}`);
          console.log(`Name:       ${[me.first_name, me.last_name].filter(Boolean).join(' ')}`);
          console.log(`Email:      ${me.email ?? '-'}`);
          console.log(`Phone:      ${me.phone ?? '-'}`);
          console.log(`Address:    ${[me.addr1, me.addr2, me.addr3].filter(Boolean).join(', ') || '-'}`);
          console.log(`Status:     ${me.status ?? '-'}`);
          console.log(`Language:   ${me.language ?? '-'}`);
          console.log(`Join Date:  ${me.join_date ?? '-'}`);
          console.log(`Expiry:     ${me.expiry_date ?? '-'}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch profile: ${message}`);
        process.exit(1);
      }
    });
}

module.exports = { register };
