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

const CLIENT_FIELDS = `
  client_id
  client_no
  client_name
  client_email
  client_phone
  client_city
  status
  join_date
  bill_title
  bill_first_name
  bill_last_name
  bill_department
  bill_name
  bill_addr1
  bill_addr2
  bill_addr3
  bill_city
  bill_phone
  bill_fax
  bill_email
`;

function register(program) {
  const clients = program.command('clients').description('Manage clients');

  clients
    .command('list')
    .description('List clients')
    .option('-l, --limit <n>', 'Max number of clients to return', '50')
    .option('-o, --offset <n>', 'Number of clients to skip', '0')
    .option('-s, --search <name>', 'Filter by client name')
    .option('--sort <field>', 'Sort by field: client_no, client_no:desc, client_name, client_name:desc, join_date, join_date:desc', 'client_no')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const client = getClient();

      const VALID_SORTS = ['client_no', 'client_no:desc', 'client_name', 'client_name:desc', 'join_date', 'join_date:desc'];
      if (!VALID_SORTS.includes(options.sort)) {
        console.error(`Invalid sort value. Must be one of: ${VALID_SORTS.join(', ')}`);
        process.exit(1);
      }

      const args = [];
      if (options.search) args.push(`filters: { client_name: { contains: ${JSON.stringify(options.search)} } }`);
      args.push(`sort: ${JSON.stringify(options.sort)}`);
      const pagination = `limit: ${parseInt(options.limit)}, offset: ${parseInt(options.offset)}`;

      const query = gql`
        query {
          listClient(${args.join(', ')}) {
            meta { total }
            data(${pagination}) {
              ${CLIENT_FIELDS}
            }
          }
        }
      `;

      try {
        const data = await client.request(query);
        const list = data?.listClient?.data ?? [];
        const total = data?.listClient?.meta?.total ?? list.length;
        if (options.json) {
          console.log(JSON.stringify({ total, data: list }, null, 2));
        } else if (list.length === 0) {
          console.log('No clients found.');
        } else {
          list.forEach(c =>
            console.log(`[${c.client_id}] ${c.client_no ? `#${c.client_no} ` : ''}${c.client_name} | ${c.client_email ?? '-'} | ${c.client_phone ?? '-'} | ${c.status ?? '-'}`)
          );
          console.log(`\nTotal: ${total}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch clients: ${message}`);
        process.exit(1);
      }
    });

  clients
    .command('get <id>')
    .description('Get a client by ID')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const client = getClient();
      const query = gql`
        query {
          listClient(filters: { client_id: ${parseInt(id)} }) {
            data {
              client_id
              client_name
              client_email
              client_phone
              client_fax
              client_addr1
              client_addr2
              client_addr3
              client_city
              client_website
              br_no
              br_expiry_date
              status
              join_date
              remark
            }
          }
        }
      `;
      try {
        const data = await client.request(query);
        const list = data?.listClient?.data ?? [];
        if (list.length === 0) {
          console.error(`Client [${id}] not found.`);
          process.exit(1);
        }
        const c = list[0];
        if (options.json) {
          console.log(JSON.stringify(c, null, 2));
        } else {
          console.log(`ID:      ${c.client_id}`);
          console.log(`Name:    ${c.client_name}`);
          console.log(`Email:   ${c.client_email ?? '-'}`);
          console.log(`Phone:   ${c.client_phone ?? '-'}`);
          console.log(`Fax:     ${c.client_fax ?? '-'}`);
          console.log(`Address: ${[c.client_addr1, c.client_addr2, c.client_addr3, c.client_city].filter(Boolean).join(', ')}`);
          console.log(`Website: ${c.client_website ?? '-'}`);
          console.log(`BR No:   ${c.br_no ?? '-'}`);
          console.log(`Status:  ${c.status ?? '-'}`);
          console.log(`Joined:  ${c.join_date ?? '-'}`);
          if (c.remark) console.log(`Remark:  ${c.remark}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch client: ${message}`);
        process.exit(1);
      }
    });

  clients
    .command('update <id>')
    .description('Update a client by ID')
    .option('--client-name <value>', 'Client name')
    .option('--client-email <value>', 'Client email')
    .option('--client-phone <value>', 'Client phone')
    .option('--client-fax <value>', 'Client fax')
    .option('--client-addr1 <value>', 'Address line 1')
    .option('--client-addr2 <value>', 'Address line 2')
    .option('--client-addr3 <value>', 'Address line 3')
    .option('--client-city <value>', 'City')
    .option('--client-website <value>', 'Website')
    .option('--br-no <value>', 'BR number')
    .option('--br-expiry-date <value>', 'BR expiry date')
    .option('--remark <value>', 'Remark')
    .option('--join-date <value>', 'Join date')
    .option('--suspend-date <value>', 'Suspend date')
    .option('--termination-date <value>', 'Termination date')
    .option('--bill-name <value>', 'Billing name')
    .option('--bill-email <value>', 'Billing email')
    .option('--bill-phone <value>', 'Billing phone')
    .action(async (id, options) => {
      const client = getClient();

      const fieldMap = {
        clientName: 'client_name',
        clientEmail: 'client_email',
        clientPhone: 'client_phone',
        clientFax: 'client_fax',
        clientAddr1: 'client_addr1',
        clientAddr2: 'client_addr2',
        clientAddr3: 'client_addr3',
        clientCity: 'client_city',
        clientWebsite: 'client_website',
        brNo: 'br_no',
        brExpiryDate: 'br_expiry_date',
        remark: 'remark',
        joinDate: 'join_date',
        suspendDate: 'suspend_date',
        terminationDate: 'termination_date',
        billName: 'bill_name',
        billEmail: 'bill_email',
        billPhone: 'bill_phone',
      };

      const fields = Object.entries(fieldMap)
        .filter(([optKey]) => options[optKey] != null)
        .map(([optKey, gqlKey]) => `${gqlKey}: ${JSON.stringify(options[optKey])}`);

      if (fields.length === 0) {
        console.error('No fields to update. Provide at least one option.');
        process.exit(1);
      }

      const mutation = gql`
        mutation {
          updateClient(id: ${parseInt(id)}, data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        if (data?.updateClient) {
          console.log(`Updated client [${id}].`);
        } else {
          console.error('Update failed.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to update client: ${message}`);
        process.exit(1);
      }
    });

  clients
    .command('delete <id>')
    .description('Delete a client by ID')
    .action(async (id) => {
      const client = getClient();
      const mutation = gql`
        mutation {
          deleteClient(id: ${parseInt(id)})
        }
      `;
      try {
        const data = await client.request(mutation);
        if (data?.deleteClient) {
          console.log(`Deleted client [${id}].`);
        } else {
          console.error('Delete failed.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to delete client: ${message}`);
        process.exit(1);
      }
    });
}

module.exports = { register };
