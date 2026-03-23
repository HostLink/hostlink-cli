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
  const cs = program.command('client-services').description('Manage client services');

  cs
    .command('list')
    .description('List client services')
    .option('-c, --client <id>', 'Filter by client ID')
    .option('-s, --search <text>', 'Filter by name (contains)')
    .option('--service <id>', 'Filter by service ID')
    .option('-l, --limit <n>', 'Max records to return', '50')
    .option('-o, --offset <n>', 'Records to skip', '0')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const client = getClient();

      const filterParts = [];
      if (options.client) filterParts.push(`client_id: ${parseInt(options.client)}`);
      if (options.service) filterParts.push(`service_id: ${parseInt(options.service)}`);
      if (options.search) filterParts.push(`name: { contains: ${JSON.stringify(options.search)} }`);
      const filters = filterParts.length ? `filters: { ${filterParts.join(', ')} }` : '';
      const pagination = `limit: ${parseInt(options.limit)}, offset: ${parseInt(options.offset)}`;

      const query = gql`
        query {
          listClientService${filters ? `(${filters})` : ''} {
            meta { total }
            data(${pagination}) {
              clientservice_id
              client_id
              name
              title
              unit_price
              unit_month
              unit_quantity
              discount
              join_date
              end_date
              paidPeriodTo
              paymentPeriodTo
              no_invoice
              clientservice_type
            }
          }
        }
      `;

      try {
        const data = await client.request(query);
        const list = data?.listClientService?.data ?? [];
        const total = data?.listClientService?.meta?.total ?? list.length;
        if (options.json) {
          console.log(JSON.stringify({ total, data: list }, null, 2));
        } else if (list.length === 0) {
          console.log('No client services found.');
        } else {
          list.forEach(s =>
            console.log(`[${s.clientservice_id}] ${s.name ?? s.title ?? '-'} | client:${s.client_id} | $${s.unit_price ?? 0}/${s.unit_month ?? 1}mo | joined:${s.join_date ?? '-'} | paid to:${s.paidPeriodTo ?? '-'}${s.no_invoice ? ' [no-invoice]' : ''}`)
          );
          console.log(`\nTotal: ${total}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch client services: ${message}`);
        process.exit(1);
      }
    });

  cs
    .command('get <id>')
    .description('Get a client service by ID')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const client = getClient();
      const query = gql`
        query {
          listClientService(filters: { clientservice_id: ${parseInt(id)} }) {
            data {
              clientservice_id
              client_id
              service_id
              domain_id
              quotation_id
              name
              title
              join_date
              end_date
              unit_price
              unit_month
              unit_quantity
              discount
              remark
              clientservice_type
              no_invoice
              renew_day
              termination_date
              termination_no
              termination_reason
              expect_termination_date
              paidPeriodTo
              paymentPeriodTo
              revenue
              lastPaymentPeriod {
                paymentperiod_id
                period_from
                period_to
                total
              }
              lastInvoice {
                invoice_id
                invoice_no
                invoice_date
                status
                total
              }
            }
          }
        }
      `;
      try {
        const data = await client.request(query);
        const list = data?.listClientService?.data ?? [];
        if (list.length === 0) {
          console.error(`Client service [${id}] not found.`);
          process.exit(1);
        }
        const s = list[0];
        if (options.json) {
          console.log(JSON.stringify(s, null, 2));
        } else {
          console.log(`ID:                   ${s.clientservice_id}`);
          console.log(`Client ID:            ${s.client_id}`);
          console.log(`Service ID:           ${s.service_id ?? '-'}`);
          console.log(`Domain ID:            ${s.domain_id ?? '-'}`);
          console.log(`Quotation ID:         ${s.quotation_id ?? '-'}`);
          console.log(`Name:                 ${s.name ?? '-'}`);
          console.log(`Title:                ${s.title ?? '-'}`);
          console.log(`Join Date:            ${s.join_date ?? '-'}`);
          console.log(`End Date:             ${s.end_date ?? '-'}`);
          console.log(`Unit Price:           $${s.unit_price ?? 0}`);
          console.log(`Unit Month:           ${s.unit_month ?? 1}`);
          console.log(`Unit Quantity:        ${s.unit_quantity ?? 1}`);
          console.log(`Discount:             ${s.discount ?? 0}%`);
          console.log(`Renew Day:            ${s.renew_day ?? '-'}`);
          console.log(`Type:                 ${s.clientservice_type ?? '-'}`);
          console.log(`No Invoice:           ${s.no_invoice ? 'Yes' : 'No'}`);
          console.log(`Paid Period To:       ${s.paidPeriodTo ?? '-'}`);
          console.log(`Payment Period To:    ${s.paymentPeriodTo ?? '-'}`);
          console.log(`Revenue:              $${s.revenue ?? 0}`);
          if (s.remark) console.log(`Remark:               ${s.remark}`);
          if (s.termination_date) {
            console.log(`Termination Date:     ${s.termination_date}`);
            console.log(`Termination Reason:   ${s.termination_reason ?? '-'}`);
          }
          if (s.lastInvoice) {
            const inv = s.lastInvoice;
            console.log(`\nLast Invoice:         [${inv.invoice_id}] #${inv.invoice_no ?? '-'} | ${inv.invoice_date ?? '-'} | ${inv.status ?? '-'} | $${inv.total ?? 0}`);
          }
          if (s.lastPaymentPeriod) {
            const pp = s.lastPaymentPeriod;
            console.log(`Last Payment Period:  [${pp.paymentperiod_id}] ${pp.period_from ?? '-'} → ${pp.period_to ?? '-'} | $${pp.total ?? 0}`);
          }
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch client service: ${message}`);
        process.exit(1);
      }
    });

  cs
    .command('add')
    .description('Add a new client service')
    .requiredOption('-c, --client-id <id>', 'Client ID')
    .option('--service-id <n>', 'Service ID')
    .option('--domain-id <n>', 'Domain ID')
    .option('--quotation-id <n>', 'Linked quotation ID')
    .option('--quotationitem-id <n>', 'Linked quotation item ID')
    .option('--name <value>', 'Service name')
    .option('--title <value>', 'Display title')
    .option('--join-date <date>', 'Start date (YYYY-MM-DD)')
    .option('--end-date <date>', 'End date (YYYY-MM-DD)')
    .option('--unit-price <n>', 'Unit price')
    .option('--unit-month <n>', 'Billing cycle in months')
    .option('--unit-quantity <n>', 'Quantity')
    .option('--discount <n>', 'Discount percentage')
    .option('--remark <value>', 'Remark')
    .option('--clientservice-type <n>', 'Service type (int)')
    .option('--renew-day <n>', 'Renewal day')
    .option('--no-invoice', 'Exclude from invoicing')
    .option('--server-id <n>', 'Server ID')
    .action(async (options) => {
      const client = getClient();

      const fieldMap = {
        clientId: ['client_id', v => parseInt(v)],
        serviceId: ['service_id', v => parseInt(v)],
        domainId: ['domain_id', v => parseInt(v)],
        quotationId: ['quotation_id', v => parseInt(v)],
        quotationitemId: ['quotationitem_id', v => parseInt(v)],
        name: ['name', v => JSON.stringify(v)],
        title: ['title', v => JSON.stringify(v)],
        joinDate: ['join_date', v => JSON.stringify(v)],
        endDate: ['end_date', v => JSON.stringify(v)],
        unitPrice: ['unit_price', v => parseFloat(v)],
        unitMonth: ['unit_month', v => parseInt(v)],
        unitQuantity: ['unit_quantity', v => parseFloat(v)],
        discount: ['discount', v => parseFloat(v)],
        remark: ['remark', v => JSON.stringify(v)],
        clientserviceType: ['clientservice_type', v => parseInt(v)],
        renewDay: ['renew_day', v => parseInt(v)],
        serverId: ['server_id', v => parseInt(v)],
      };

      const fields = Object.entries(fieldMap)
        .filter(([optKey]) => options[optKey] != null)
        .map(([optKey, [gqlKey, transform]]) => `${gqlKey}: ${transform(options[optKey])}`);

      if (options.noInvoice) fields.push('no_invoice: true');

      const mutation = gql`
        mutation {
          addClientService(data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        const newId = data?.addClientService;
        console.log(`Created client service [${newId}].`);
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to add client service: ${message}`);
        process.exit(1);
      }
    });

  cs
    .command('update <id>')
    .description('Update a client service by ID')
    .option('--client-id <id>', 'Client ID')
    .option('--service-id <n>', 'Service ID')
    .option('--domain-id <n>', 'Domain ID')
    .option('--quotation-id <n>', 'Linked quotation ID')
    .option('--name <value>', 'Service name')
    .option('--title <value>', 'Display title')
    .option('--join-date <date>', 'Start date (YYYY-MM-DD)')
    .option('--end-date <date>', 'End date (YYYY-MM-DD)')
    .option('--unit-price <n>', 'Unit price')
    .option('--unit-month <n>', 'Billing cycle in months')
    .option('--unit-quantity <n>', 'Quantity')
    .option('--discount <n>', 'Discount percentage')
    .option('--remark <value>', 'Remark')
    .option('--clientservice-type <n>', 'Service type (int)')
    .option('--renew-day <n>', 'Renewal day')
    .option('--termination-date <date>', 'Termination date (YYYY-MM-DD)')
    .option('--termination-no <n>', 'Termination number')
    .option('--termination-reason <value>', 'Termination reason')
    .option('--expect-termination-date <date>', 'Expected termination date (YYYY-MM-DD)')
    .option('--no-invoice', 'Exclude from invoicing')
    .action(async (id, options) => {
      const client = getClient();

      const fieldMap = {
        clientId: ['client_id', v => parseInt(v)],
        serviceId: ['service_id', v => parseInt(v)],
        domainId: ['domain_id', v => parseInt(v)],
        quotationId: ['quotation_id', v => parseInt(v)],
        name: ['name', v => JSON.stringify(v)],
        title: ['title', v => JSON.stringify(v)],
        joinDate: ['join_date', v => JSON.stringify(v)],
        endDate: ['end_date', v => JSON.stringify(v)],
        unitPrice: ['unit_price', v => parseFloat(v)],
        unitMonth: ['unit_month', v => parseInt(v)],
        unitQuantity: ['unit_quantity', v => parseFloat(v)],
        discount: ['discount', v => parseFloat(v)],
        remark: ['remark', v => JSON.stringify(v)],
        clientserviceType: ['clientservice_type', v => parseInt(v)],
        renewDay: ['renew_day', v => parseInt(v)],
        terminationDate: ['termination_date', v => JSON.stringify(v)],
        terminationNo: ['termination_no', v => parseInt(v)],
        terminationReason: ['termination_reason', v => JSON.stringify(v)],
        expectTerminationDate: ['expect_termination_date', v => JSON.stringify(v)],
      };

      const fields = Object.entries(fieldMap)
        .filter(([optKey]) => options[optKey] != null)
        .map(([optKey, [gqlKey, transform]]) => `${gqlKey}: ${transform(options[optKey])}`);

      if (options.noInvoice) fields.push('no_invoice: true');

      if (fields.length === 0) {
        console.error('No fields to update. Provide at least one option.');
        process.exit(1);
      }

      const mutation = gql`
        mutation {
          updateClientService(id: ${parseInt(id)}, data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        if (data?.updateClientService) {
          console.log(`Updated client service [${id}].`);
        } else {
          console.error('Update failed.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to update client service: ${message}`);
        process.exit(1);
      }
    });

  cs
    .command('delete <id>')
    .description('Delete a client service by ID')
    .action(async (id) => {
      const client = getClient();
      const mutation = gql`
        mutation {
          deleteClientService(id: ${parseInt(id)})
        }
      `;
      try {
        const data = await client.request(mutation);
        if (data?.deleteClientService) {
          console.log(`Deleted client service [${id}].`);
        } else {
          console.error('Delete failed.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to delete client service: ${message}`);
        process.exit(1);
      }
    });
}

module.exports = { register };
