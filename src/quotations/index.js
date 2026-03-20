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
  const quotations = program.command('quotations').description('Manage quotations');

  quotations
    .command('list')
    .description('List quotations')
    .option('-c, --client <id>', 'Filter by client ID')
    .option('-s, --search <name>', 'Filter by client name (contains)')
    .option('--status <value>', 'Filter by status')
    .option('-l, --limit <n>', 'Max number of quotations to return', '50')
    .option('-o, --offset <n>', 'Number of quotations to skip', '0')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const client = getClient();

      const filterParts = [];
      if (options.client) filterParts.push(`client_id: ${parseInt(options.client)}`);
      if (options.search) filterParts.push(`client_name: { contains: ${JSON.stringify(options.search)} }`);
      if (options.status) filterParts.push(`status: ${JSON.stringify(options.status)}`);
      const filters = filterParts.length ? `filters: { ${filterParts.join(', ')} }` : '';
      const pagination = `limit: ${parseInt(options.limit)}, offset: ${parseInt(options.offset)}`;

      const query = gql`
        query {
          listQuotation${filters ? `(${filters})` : ''} {
            meta { total }
            data(${pagination}) {
              quotation_id
              quotation_no
              quotation_date
              client_id
              client_name
              status
              due_date
              total
            }
          }
        }
      `;

      try {
        const data = await client.request(query);
        const list = data?.listQuotation?.data ?? [];
        const total = data?.listQuotation?.meta?.total ?? list.length;
        if (options.json) {
          console.log(JSON.stringify({ total, data: list }, null, 2));
        } else if (list.length === 0) {
          console.log('No quotations found.');
        } else {
          list.forEach(q =>
            console.log(`[${q.quotation_id}] ${q.quotation_no ?? '-'} | ${q.client_name ?? '-'} | ${q.quotation_date ?? '-'} | due:${q.due_date ?? '-'} | ${q.status ?? '-'} | $${q.total ?? 0}`)
          );
          console.log(`\nTotal: ${total}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch quotations: ${message}`);
        process.exit(1);
      }
    });

  quotations
    .command('get <id>')
    .description('Get a quotation by ID')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const client = getClient();
      const query = gql`
        query {
          listQuotation(filters: { quotation_id: ${parseInt(id)} }) {
            data {
              quotation_id
              quotation_no
              quotation_date
              due_date
              sign_date
              client_id
              client_name
              email
              phone
              fax
              addr1
              addr2
              addr3
              city
              status
              note
              remark
              header
              total
              total2
              version
              service_type
              quotation_type
              renew
            }
          }
        }
      `;
      try {
        const data = await client.request(query);
        const list = data?.listQuotation?.data ?? [];
        if (list.length === 0) {
          console.error(`Quotation [${id}] not found.`);
          process.exit(1);
        }
        const q = list[0];
        if (options.json) {
          console.log(JSON.stringify(q, null, 2));
        } else {
          console.log(`ID:        ${q.quotation_id}`);
          console.log(`No:        ${q.quotation_no ?? '-'}`);
          console.log(`Version:   ${q.version ?? '-'}`);
          console.log(`Client ID: ${q.client_id}`);
          console.log(`Client:    ${q.client_name ?? '-'}`);
          console.log(`Email:     ${q.email ?? '-'}`);
          console.log(`Phone:     ${q.phone ?? '-'}`);
          console.log(`Address:   ${[q.addr1, q.addr2, q.addr3, q.city].filter(Boolean).join(', ')}`);
          console.log(`Date:      ${q.quotation_date ?? '-'}`);
          console.log(`Due Date:  ${q.due_date ?? '-'}`);
          console.log(`Sign Date: ${q.sign_date ?? '-'}`);
          console.log(`Status:    ${q.status ?? '-'}`);
          console.log(`Total:     $${q.total ?? 0}`);
          if (q.note) console.log(`Note:      ${q.note}`);
          if (q.remark) console.log(`Remark:    ${q.remark}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch quotation: ${message}`);
        process.exit(1);
      }
    });

  quotations
    .command('add')
    .description('Add a new quotation')
    .requiredOption('-c, --client-id <id>', 'Client ID')
    .option('--client-name <value>', 'Client name')
    .option('--quotation-date <date>', 'Quotation date (YYYY-MM-DD)')
    .option('--due-date <date>', 'Due date (YYYY-MM-DD)')
    .option('--email <value>', 'Email')
    .option('--phone <value>', 'Phone')
    .option('--addr1 <value>', 'Address line 1')
    .option('--addr2 <value>', 'Address line 2')
    .option('--addr3 <value>', 'Address line 3')
    .option('--city <value>', 'City')
    .option('--note <value>', 'Note')
    .option('--remark <value>', 'Remark')
    .option('--header <value>', 'Header')
    .option('--status <value>', 'Status')
    .option('--service-type <n>', 'Service type')
    .option('--quotation-type <n>', 'Quotation type')
    .option('--renew', 'Mark as renewal')
    .action(async (options) => {
      const client = getClient();

      const fieldMap = {
        clientId: ['client_id', v => parseInt(v)],
        clientName: ['client_name', v => JSON.stringify(v)],
        quotationDate: ['quotation_date', v => JSON.stringify(v)],
        dueDate: ['due_date', v => JSON.stringify(v)],
        email: ['email', v => JSON.stringify(v)],
        phone: ['phone', v => JSON.stringify(v)],
        addr1: ['addr1', v => JSON.stringify(v)],
        addr2: ['addr2', v => JSON.stringify(v)],
        addr3: ['addr3', v => JSON.stringify(v)],
        city: ['city', v => JSON.stringify(v)],
        note: ['note', v => JSON.stringify(v)],
        remark: ['remark', v => JSON.stringify(v)],
        header: ['header', v => JSON.stringify(v)],
        status: ['status', v => JSON.stringify(v)],
        serviceType: ['service_type', v => parseInt(v)],
        quotationType: ['quotation_type', v => parseInt(v)],
      };

      const fields = Object.entries(fieldMap)
        .filter(([optKey]) => options[optKey] != null)
        .map(([optKey, [gqlKey, transform]]) => `${gqlKey}: ${transform(options[optKey])}`);

      if (options.renew) fields.push('renew: true');

      const mutation = gql`
        mutation {
          addQuotation(data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        const newId = data?.addQuotation;
        console.log(`Created quotation [${newId}].`);
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to add quotation: ${message}`);
        process.exit(1);
      }
    });

  quotations
    .command('update <id>')
    .description('Update a quotation by ID')
    .option('--client-id <id>', 'Client ID')
    .option('--client-name <value>', 'Client name')
    .option('--quotation-date <date>', 'Quotation date (YYYY-MM-DD)')
    .option('--due-date <date>', 'Due date (YYYY-MM-DD)')
    .option('--sign-date <date>', 'Sign date (YYYY-MM-DD)')
    .option('--email <value>', 'Email')
    .option('--phone <value>', 'Phone')
    .option('--addr1 <value>', 'Address line 1')
    .option('--addr2 <value>', 'Address line 2')
    .option('--addr3 <value>', 'Address line 3')
    .option('--city <value>', 'City')
    .option('--note <value>', 'Note')
    .option('--remark <value>', 'Remark')
    .option('--header <value>', 'Header')
    .option('--status <value>', 'Status')
    .option('--service-type <n>', 'Service type')
    .option('--quotation-type <n>', 'Quotation type')
    .action(async (id, options) => {
      const client = getClient();

      const fieldMap = {
        clientId: ['client_id', v => parseInt(v)],
        clientName: ['client_name', v => JSON.stringify(v)],
        quotationDate: ['quotation_date', v => JSON.stringify(v)],
        dueDate: ['due_date', v => JSON.stringify(v)],
        signDate: ['sign_date', v => JSON.stringify(v)],
        email: ['email', v => JSON.stringify(v)],
        phone: ['phone', v => JSON.stringify(v)],
        addr1: ['addr1', v => JSON.stringify(v)],
        addr2: ['addr2', v => JSON.stringify(v)],
        addr3: ['addr3', v => JSON.stringify(v)],
        city: ['city', v => JSON.stringify(v)],
        note: ['note', v => JSON.stringify(v)],
        remark: ['remark', v => JSON.stringify(v)],
        header: ['header', v => JSON.stringify(v)],
        status: ['status', v => JSON.stringify(v)],
        serviceType: ['service_type', v => parseInt(v)],
        quotationType: ['quotation_type', v => parseInt(v)],
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
          updateQuotation(id: ${parseInt(id)}, data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        if (data?.updateQuotation) {
          console.log(`Updated quotation [${id}].`);
        } else {
          console.error('Update failed.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to update quotation: ${message}`);
        process.exit(1);
      }
    });

  quotations
    .command('delete <id>')
    .description('Delete a quotation by ID')
    .action(async (id) => {
      const client = getClient();
      const mutation = gql`
        mutation {
          deleteQuotation(id: ${parseInt(id)})
        }
      `;
      try {
        const data = await client.request(mutation);
        if (data?.deleteQuotation) {
          console.log(`Deleted quotation [${id}].`);
        } else {
          console.error('Delete failed.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to delete quotation: ${message}`);
        process.exit(1);
      }
    });
}

module.exports = { register };
