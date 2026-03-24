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

const DOMAIN_PASSWORD_FIELDS = `
  domainpassword_id
  domain_id
  name
  username
  password
  host
  port
  remark
`;

function register(program) {
  const dp = program.command('domain-passwords').description('Manage domain passwords');

  dp
    .command('list <domain_id>')
    .description('List passwords for a domain')
    .option('--json', 'Output as JSON')
    .action(async (domain_id, options) => {
      const client = getClient();
      const query = gql`
        query {
          listDomainPassword(filters: { domain_id: ${parseInt(domain_id)} }) {
            data {
              ${DOMAIN_PASSWORD_FIELDS}
            }
          }
        }
      `;
      try {
        const data = await client.request(query);
        const list = data?.listDomainPassword?.data ?? [];
        if (options.json) {
          console.log(JSON.stringify(list, null, 2));
        } else if (list.length === 0) {
          console.log('No domain passwords found.');
        } else {
          list.forEach(p =>
            console.log(`[${p.domainpassword_id}] ${p.name ?? '-'} | ${p.username ?? '-'} | ${p.host ?? '-'}${p.port ? `:${p.port}` : ''}${p.remark ? ` | ${p.remark}` : ''}`)
          );
          console.log(`\nTotal: ${list.length}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch domain passwords: ${message}`);
        process.exit(1);
      }
    });

  dp
    .command('get <id>')
    .description('Get a domain password by ID')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const client = getClient();
      const query = gql`
        query {
          listDomainPassword(filters: { domainpassword_id: ${parseInt(id)} }) {
            data {
              ${DOMAIN_PASSWORD_FIELDS}
            }
          }
        }
      `;
      try {
        const data = await client.request(query);
        const list = data?.listDomainPassword?.data ?? [];
        if (list.length === 0) {
          console.error(`Domain password [${id}] not found.`);
          process.exit(1);
        }
        const p = list[0];
        if (options.json) {
          console.log(JSON.stringify(p, null, 2));
        } else {
          console.log(`ID:       ${p.domainpassword_id}`);
          console.log(`Domain ID:${p.domain_id}`);
          console.log(`Name:     ${p.name ?? '-'}`);
          console.log(`Username: ${p.username ?? '-'}`);
          console.log(`Password: ${p.password ?? '-'}`);
          console.log(`Host:     ${p.host ?? '-'}`);
          console.log(`Port:     ${p.port ?? '-'}`);
          if (p.remark) console.log(`Remark:   ${p.remark}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch domain password: ${message}`);
        process.exit(1);
      }
    });

  dp
    .command('add')
    .description('Add a password to a domain')
    .requiredOption('-d, --domain-id <id>', 'Domain ID')
    .requiredOption('--name <value>', 'Name / label')
    .option('--username <value>', 'Username')
    .option('--password <value>', 'Password')
    .option('--host <value>', 'Host')
    .option('--port <n>', 'Port')
    .option('--remark <value>', 'Remark')
    .action(async (options) => {
      const client = getClient();

      const fieldMap = {
        domainId: ['domain_id', v => parseInt(v)],
        name: ['name', v => JSON.stringify(v)],
        username: ['username', v => JSON.stringify(v)],
        password: ['password', v => JSON.stringify(v)],
        host: ['host', v => JSON.stringify(v)],
        port: ['port', v => parseInt(v)],
        remark: ['remark', v => JSON.stringify(v)],
      };

      const fields = Object.entries(fieldMap)
        .filter(([optKey]) => options[optKey] != null)
        .map(([optKey, [gqlKey, transform]]) => `${gqlKey}: ${transform(options[optKey])}`);

      const mutation = gql`
        mutation {
          addDomainPassword(data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        const newId = data?.addDomainPassword;
        console.log(`Created domain password [${newId}].`);
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to add domain password: ${message}`);
        process.exit(1);
      }
    });

  dp
    .command('update <id>')
    .description('Update a domain password by ID')
    .option('--name <value>', 'Name / label')
    .option('--username <value>', 'Username')
    .option('--password <value>', 'Password')
    .option('--host <value>', 'Host')
    .option('--port <n>', 'Port')
    .option('--remark <value>', 'Remark')
    .action(async (id, options) => {
      const client = getClient();

      const fieldMap = {
        name: ['name', v => JSON.stringify(v)],
        username: ['username', v => JSON.stringify(v)],
        password: ['password', v => JSON.stringify(v)],
        host: ['host', v => JSON.stringify(v)],
        port: ['port', v => parseInt(v)],
        remark: ['remark', v => JSON.stringify(v)],
      };

      const fields = Object.entries(fieldMap)
        .filter(([optKey]) => options[optKey] != null)
        .map(([optKey, [gqlKey, transform]]) => `${gqlKey}: ${transform(options[optKey])}`);

      if (fields.length === 0) {
        console.error('No fields to update. Provide at least one option.');
        process.exit(1);
      }

      const mutation = gql`
        mutation {
          updateDomainPassword(id: ${parseInt(id)}, data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        if (data?.updateDomainPassword) {
          console.log(`Updated domain password [${id}].`);
        } else {
          console.error('Update failed.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to update domain password: ${message}`);
        process.exit(1);
      }
    });

  dp
    .command('delete <id>')
    .description('Delete a domain password by ID')
    .action(async (id) => {
      const client = getClient();
      const mutation = gql`
        mutation {
          deleteDomainPassword(id: ${parseInt(id)})
        }
      `;
      try {
        const data = await client.request(mutation);
        if (data?.deleteDomainPassword) {
          console.log(`Deleted domain password [${id}].`);
        } else {
          console.error('Delete failed.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to delete domain password: ${message}`);
        process.exit(1);
      }
    });
}

module.exports = { register };
