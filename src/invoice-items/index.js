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

// CLI command: hostlink invoice-items
// API resource: PaymentPeriod (listPaymentPeriod / addPaymentPeriod / updatePaymentPeriod / deletePaymentPeriod)

function register(program) {
  const items = program.command('invoice-items').description('Manage invoice items (PaymentPeriod)');

  items
    .command('list <invoice_id>')
    .description('List items of an invoice')
    .option('--json', 'Output as JSON')
    .action(async (invoice_id, options) => {
      const client = getClient();
      const query = gql`
        query {
          listPaymentPeriod(filters: { invoice_id: ${parseInt(invoice_id)} }) {
            data {
              paymentperiod_id
              invoice_id
              sequence
              description
              unit_price
              qty
              free_month
              discount
              subtotal
              total
              remark
              period_from
              period_to
              clientservice_id
            }
          }
        }
      `;
      try {
        const data = await client.request(query);
        const list = data?.listPaymentPeriod?.data ?? [];
        if (options.json) {
          console.log(JSON.stringify(list, null, 2));
        } else if (list.length === 0) {
          console.log('No items found.');
        } else {
          list.forEach(i =>
            console.log(`[${i.paymentperiod_id}] #${i.sequence ?? '-'} ${i.description ?? '-'} | qty:${i.qty ?? '-'} x $${i.unit_price ?? 0} | discount:${i.discount ?? 0}% | total:$${i.total ?? 0}${i.remark ? ` | ${i.remark}` : ''}`)
          );
          console.log(`\nTotal items: ${list.length}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch invoice items: ${message}`);
        process.exit(1);
      }
    });

  items
    .command('get <id>')
    .description('Get an invoice item by ID')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const client = getClient();
      const query = gql`
        query {
          listPaymentPeriod(filters: { paymentperiod_id: ${parseInt(id)} }) {
            data {
              paymentperiod_id
              invoice_id
              sequence
              description
              unit_price
              qty
              unit_month
              free_month
              discount
              subtotal
              total
              remark
              period_from
              period_to
              clientservice_id
              quotation_id
            }
          }
        }
      `;
      try {
        const data = await client.request(query);
        const list = data?.listPaymentPeriod?.data ?? [];
        if (list.length === 0) {
          console.error(`Invoice item [${id}] not found.`);
          process.exit(1);
        }
        const i = list[0];
        if (options.json) {
          console.log(JSON.stringify(i, null, 2));
        } else {
          console.log(`ID:              ${i.paymentperiod_id}`);
          console.log(`Invoice ID:      ${i.invoice_id}`);
          console.log(`Sequence:        ${i.sequence ?? '-'}`);
          console.log(`Description:     ${i.description ?? '-'}`);
          console.log(`Unit Price:      $${i.unit_price ?? 0}`);
          console.log(`Qty:             ${i.qty ?? '-'}`);
          console.log(`Unit Month:      ${i.unit_month ?? 1}`);
          console.log(`Free Month:      ${i.free_month ?? 0}`);
          console.log(`Discount:        ${i.discount ?? 0}%`);
          console.log(`Subtotal:        $${i.subtotal ?? 0}`);
          console.log(`Total:           $${i.total ?? 0}`);
          console.log(`Period:          ${i.period_from ?? '-'} → ${i.period_to ?? '-'}`);
          if (i.remark) console.log(`Remark:          ${i.remark}`);
          if (i.clientservice_id) console.log(`Client Svc ID:   ${i.clientservice_id}`);
          if (i.quotation_id) console.log(`Quotation ID:    ${i.quotation_id}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch invoice item: ${message}`);
        process.exit(1);
      }
    });

  items
    .command('add')
    .description('Add a new item to an invoice')
    .requiredOption('-i, --invoice-id <id>', 'Invoice ID')
    .option('--unit-price <n>', 'Unit price')
    .option('--qty <n>', 'Quantity')
    .option('--unit-month <n>', 'Number of months', '1')
    .option('--free-month <n>', 'Free months')
    .option('--discount <n>', 'Discount percentage')
    .option('--subtotal <n>', 'Subtotal (override)')
    .option('--remark <value>', 'Remark')
    .option('--sequence <n>', 'Display sequence order')
    .option('--period-from <date>', 'Service period start (YYYY-MM-DD)')
    .option('--period-to <date>', 'Service period end (YYYY-MM-DD)')
    .option('--clientservice-id <n>', 'Client service ID')
    .option('--quotation-id <n>', 'Linked quotation ID')
    .action(async (options) => {
      const client = getClient();

      const fieldMap = {
        invoiceId: ['invoice_id', v => parseInt(v)],
        unitPrice: ['unit_price', v => parseFloat(v)],
        qty: ['qty', v => parseFloat(v)],
        unitMonth: ['unit_month', v => parseInt(v)],
        freeMonth: ['free_month', v => parseInt(v)],
        discount: ['discount', v => parseFloat(v)],
        subtotal: ['subtotal', v => parseFloat(v)],
        remark: ['remark', v => JSON.stringify(v)],
        sequence: ['sequence', v => parseInt(v)],
        periodFrom: ['period_from', v => JSON.stringify(v)],
        periodTo: ['period_to', v => JSON.stringify(v)],
        clientserviceId: ['clientservice_id', v => parseInt(v)],
        quotationId: ['quotation_id', v => parseInt(v)],
      };

      const fields = Object.entries(fieldMap)
        .filter(([optKey]) => options[optKey] != null)
        .map(([optKey, [gqlKey, transform]]) => `${gqlKey}: ${transform(options[optKey])}`);

      const mutation = gql`
        mutation {
          addPaymentPeriod(data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        const newId = data?.addPaymentPeriod;
        console.log(`Created invoice item [${newId}].`);
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to add invoice item: ${message}`);
        process.exit(1);
      }
    });

  items
    .command('update <id>')
    .description('Update an invoice item by ID')
    .option('--invoice-id <id>', 'Invoice ID')
    .option('--unit-price <n>', 'Unit price')
    .option('--qty <n>', 'Quantity')
    .option('--unit-month <n>', 'Number of months')
    .option('--free-month <n>', 'Free months')
    .option('--discount <n>', 'Discount percentage')
    .option('--subtotal <n>', 'Subtotal (override)')
    .option('--remark <value>', 'Remark')
    .option('--sequence <n>', 'Display sequence order')
    .option('--period-from <date>', 'Service period start (YYYY-MM-DD)')
    .option('--period-to <date>', 'Service period end (YYYY-MM-DD)')
    .option('--clientservice-id <n>', 'Client service ID')
    .option('--quotation-id <n>', 'Linked quotation ID')
    .action(async (id, options) => {
      const client = getClient();

      const fieldMap = {
        invoiceId: ['invoice_id', v => parseInt(v)],
        unitPrice: ['unit_price', v => parseFloat(v)],
        qty: ['qty', v => parseFloat(v)],
        unitMonth: ['unit_month', v => parseInt(v)],
        freeMonth: ['free_month', v => parseInt(v)],
        discount: ['discount', v => parseFloat(v)],
        subtotal: ['subtotal', v => parseFloat(v)],
        remark: ['remark', v => JSON.stringify(v)],
        sequence: ['sequence', v => parseInt(v)],
        periodFrom: ['period_from', v => JSON.stringify(v)],
        periodTo: ['period_to', v => JSON.stringify(v)],
        clientserviceId: ['clientservice_id', v => parseInt(v)],
        quotationId: ['quotation_id', v => parseInt(v)],
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
          updatePaymentPeriod(id: ${parseInt(id)}, data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        if (data?.updatePaymentPeriod) {
          console.log(`Updated invoice item [${id}].`);
        } else {
          console.error('Update failed.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to update invoice item: ${message}`);
        process.exit(1);
      }
    });

  items
    .command('delete <id>')
    .description('Delete an invoice item by ID')
    .action(async (id) => {
      const client = getClient();
      const mutation = gql`
        mutation {
          deletePaymentPeriod(id: ${parseInt(id)})
        }
      `;
      try {
        const data = await client.request(mutation);
        if (data?.deletePaymentPeriod) {
          console.log(`Deleted invoice item [${id}].`);
        } else {
          console.error('Delete failed.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to delete invoice item: ${message}`);
        process.exit(1);
      }
    });
}

module.exports = { register };
