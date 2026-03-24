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
  const domains = program.command('domains').description('Manage domains');

  domains
    .command('list')
    .description('List domains')
    .option('-c, --client <id>', 'Filter by client ID')
    .option('-s, --search <name>', 'Filter by domain name')
    .option('-l, --limit <n>', 'Max number of domains to return', '50')
    .option('-o, --offset <n>', 'Number of domains to skip', '0')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const client = getClient();

      const filterParts = [];
      if (options.client) filterParts.push(`client_id: ${parseInt(options.client)}`);
      if (options.search) filterParts.push(`domain_name: { contains: ${JSON.stringify(options.search)} }`);
      const filters = filterParts.length ? `filters: { ${filterParts.join(', ')} }` : '';
      const pagination = `limit: ${parseInt(options.limit)}, offset: ${parseInt(options.offset)}`;

      const query = gql`
        query {
          listDomain${filters ? `(${filters})` : ''} {
            meta { total }
            data(${pagination}) {
              domain_id
              domain_no
              domain_name
              client_id
              expiry_date
              registrar
              status
              primary_dns
              secondary_dns
            }
          }
        }
      `;

      try {
        const data = await client.request(query);
        const list = data?.listDomain?.data ?? [];
        const total = data?.listDomain?.meta?.total ?? list.length;
        if (options.json) {
          console.log(JSON.stringify({ total, data: list }, null, 2));
        } else if (list.length === 0) {
          console.log('No domains found.');
        } else {
          list.forEach(d =>
            console.log(`[${d.domain_id}] ${d.domain_no ? `#${d.domain_no} ` : ''}${d.domain_name} | client:${d.client_id} | expires:${d.expiry_date ?? '-'} | ${d.registrar ?? '-'} | ${d.status ?? '-'}`)
          );
          console.log(`\nTotal: ${total}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch domains: ${message}`);
        process.exit(1);
      }
    });

  domains
    .command('get <id>')
    .description('Get a domain by ID')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const client = getClient();
      const query = gql`
        query {
          listDomain(filters: { domain_id: ${parseInt(id)} }) {
            data {
              domain_id
              domain_name
              client_id
              domain_user_id
              primary_dns
              secondary_dns
              creation_date
              expiry_date
              registrar
              status
              monitor
              manage_by
              domain_type
              remark
              follow_remark
              is_project
              is_vm
              server_id
            }
          }
        }
      `;
      try {
        const data = await client.request(query);
        const list = data?.listDomain?.data ?? [];
        if (list.length === 0) {
          console.error(`Domain [${id}] not found.`);
          process.exit(1);
        }
        const d = list[0];
        if (options.json) {
          console.log(JSON.stringify(d, null, 2));
        } else {
          console.log(`ID:           ${d.domain_id}`);
          console.log(`Domain:       ${d.domain_name}`);
          console.log(`Client ID:    ${d.client_id}`);
          console.log(`User ID:      ${d.domain_user_id ?? '-'}`);
          console.log(`Primary DNS:  ${d.primary_dns ?? '-'}`);
          console.log(`Secondary DNS:${d.secondary_dns ?? '-'}`);
          console.log(`Created:      ${d.creation_date ?? '-'}`);
          console.log(`Expires:      ${d.expiry_date ?? '-'}`);
          console.log(`Registrar:    ${d.registrar ?? '-'}`);
          console.log(`Status:       ${d.status ?? '-'}`);
          console.log(`Monitor:      ${d.monitor ?? '-'}`);
          console.log(`Manage By:    ${d.manage_by ?? '-'}`);
          console.log(`Is Project:   ${d.is_project ?? '-'}`);
          console.log(`Is VM:        ${d.is_vm ?? '-'}`);
          if (d.remark) console.log(`Remark:       ${d.remark}`);
          if (d.follow_remark) console.log(`Follow Remark:${d.follow_remark}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch domain: ${message}`);
        process.exit(1);
      }
    });

  domains
    .command('add')
    .description('Add a new domain')
    .requiredOption('-c, --client-id <id>', 'Client ID')
    .requiredOption('-n, --domain-name <name>', 'Domain name')
    .option('--expiry-date <date>', 'Expiry date')
    .option('--creation-date <date>', 'Creation date')
    .option('--registrar <value>', 'Registrar')
    .option('--primary-dns <value>', 'Primary DNS')
    .option('--secondary-dns <value>', 'Secondary DNS')
    .option('--domain-user-id <value>', 'Domain user ID')
    .option('--domain-password <value>', 'Domain password')
    .option('--domain-type <n>', 'Domain type')
    .option('--remark <value>', 'Remark')
    .option('--is-project', 'Mark as project')
    .option('--is-vm', 'Mark as VM')
    .option('--server-id <n>', 'Server ID')
    .action(async (options) => {
      const client = getClient();

      const fieldMap = {
        clientId: ['client_id', v => parseInt(v)],
        domainName: ['domain_name', v => JSON.stringify(v)],
        expiryDate: ['expiry_date', v => JSON.stringify(v)],
        creationDate: ['creation_date', v => JSON.stringify(v)],
        registrar: ['registrar', v => JSON.stringify(v)],
        primaryDns: ['primary_dns', v => JSON.stringify(v)],
        secondaryDns: ['secondary_dns', v => JSON.stringify(v)],
        domainUserId: ['domain_user_id', v => JSON.stringify(v)],
        domainPassword: ['domain_password', v => JSON.stringify(v)],
        domainType: ['domain_type', v => parseInt(v)],
        remark: ['remark', v => JSON.stringify(v)],
        serverId: ['server_id', v => parseInt(v)],
      };

      const fields = Object.entries(fieldMap)
        .filter(([optKey]) => options[optKey] != null)
        .map(([optKey, [gqlKey, transform]]) => `${gqlKey}: ${transform(options[optKey])}`);

      if (options.isProject) fields.push('is_project: true');
      if (options.isVm) fields.push('is_vm: true');

      const mutation = gql`
        mutation {
          addDomain(data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        const newId = data?.addDomain;
        console.log(`Created domain [${newId}]: ${options.domainName}`);
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to add domain: ${message}`);
        process.exit(1);
      }
    });

  domains
    .command('update <id>')
    .description('Update a domain by ID')
    .option('--domain-name <value>', 'Domain name')
    .option('--client-id <id>', 'Client ID')
    .option('--expiry-date <date>', 'Expiry date')
    .option('--creation-date <date>', 'Creation date')
    .option('--registrar <value>', 'Registrar')
    .option('--primary-dns <value>', 'Primary DNS')
    .option('--secondary-dns <value>', 'Secondary DNS')
    .option('--domain-user-id <value>', 'Domain user ID')
    .option('--domain-password <value>', 'Domain password')
    .option('--domain-type <n>', 'Domain type')
    .option('--remark <value>', 'Remark')
    .option('--server-id <n>', 'Server ID')
    .action(async (id, options) => {
      const client = getClient();

      const fieldMap = {
        domainName: ['domain_name', v => JSON.stringify(v)],
        clientId: ['client_id', v => parseInt(v)],
        expiryDate: ['expiry_date', v => JSON.stringify(v)],
        creationDate: ['creation_date', v => JSON.stringify(v)],
        registrar: ['registrar', v => JSON.stringify(v)],
        primaryDns: ['primary_dns', v => JSON.stringify(v)],
        secondaryDns: ['secondary_dns', v => JSON.stringify(v)],
        domainUserId: ['domain_user_id', v => JSON.stringify(v)],
        domainPassword: ['domain_password', v => JSON.stringify(v)],
        domainType: ['domain_type', v => parseInt(v)],
        remark: ['remark', v => JSON.stringify(v)],
        serverId: ['server_id', v => parseInt(v)],
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
          updateDomain(id: ${parseInt(id)}, data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        if (data?.updateDomain) {
          console.log(`Updated domain [${id}].`);
        } else {
          console.error('Update failed.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to update domain: ${message}`);
        process.exit(1);
      }
    });

  domains
    .command('delete <id>')
    .description('Delete a domain by ID')
    .action(async (id) => {
      const client = getClient();
      const mutation = gql`
        mutation {
          deleteDomain(id: ${parseInt(id)})
        }
      `;
      try {
        const data = await client.request(mutation);
        if (data?.deleteDomain) {
          console.log(`Deleted domain [${id}].`);
        } else {
          console.error('Delete failed.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to delete domain: ${message}`);
        process.exit(1);
      }
    });
}

module.exports = { register };
