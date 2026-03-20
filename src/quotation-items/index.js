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
  const items = program.command('quotation-items').description('Manage quotation items');

  items
    .command('list <quotation_id>')
    .description('List items of a quotation')
    .option('--json', 'Output as JSON')
    .action(async (quotation_id, options) => {
      const client = getClient();
      const query = gql`
        query {
          listQuotationItem(filters: { quotation_id: ${parseInt(quotation_id)} }) {
            data {
              quotationitem_id
              quotation_id
              sequence
              name
              remark
              unit_price
              unit_month
              unit_quantity
              discount
              subtotal
              optional
              accept
              hidden_number
              hidden_quantity
              hidden_price
              page_break
            }
          }
        }
      `;
      try {
        const data = await client.request(query);
        const list = data?.listQuotationItem?.data ?? [];
        if (options.json) {
          console.log(JSON.stringify(list, null, 2));
        } else if (list.length === 0) {
          console.log('No items found.');
        } else {
          list.forEach(i =>
            console.log(`[${i.quotationitem_id}] #${i.sequence ?? '-'} ${i.name} | qty:${i.unit_quantity ?? '-'} x $${i.unit_price ?? 0} x ${i.unit_month ?? 1}mo | discount:${i.discount ?? 0}% | subtotal:$${i.subtotal ?? 0}`)
          );
          console.log(`\nTotal items: ${list.length}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch quotation items: ${message}`);
        process.exit(1);
      }
    });

  items
    .command('get <id>')
    .description('Get a quotation item by ID')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const client = getClient();
      const query = gql`
        query {
          listQuotationItem(filters: { quotationitem_id: ${parseInt(id)} }) {
            data {
              quotationitem_id
              quotation_id
              sequence
              name
              remark
              unit_price
              unit_month
              unit_quantity
              discount
              subtotal
              service_id
              domain_id
              optional
              accept
              hidden_number
              hidden_quantity
              hidden_price
              page_break
            }
          }
        }
      `;
      try {
        const data = await client.request(query);
        const list = data?.listQuotationItem?.data ?? [];
        if (list.length === 0) {
          console.error(`Quotation item [${id}] not found.`);
          process.exit(1);
        }
        const i = list[0];
        if (options.json) {
          console.log(JSON.stringify(i, null, 2));
        } else {
          console.log(`ID:            ${i.quotationitem_id}`);
          console.log(`Quotation ID:  ${i.quotation_id}`);
          console.log(`Sequence:      ${i.sequence ?? '-'}`);
          console.log(`Name:          ${i.name}`);
          console.log(`Remark:        ${i.remark ?? '-'}`);
          console.log(`Unit Price:    $${i.unit_price ?? 0}`);
          console.log(`Unit Month:    ${i.unit_month ?? 1}`);
          console.log(`Unit Quantity: ${i.unit_quantity ?? '-'}`);
          console.log(`Discount:      ${i.discount ?? 0}%`);
          console.log(`Subtotal:      $${i.subtotal ?? 0}`);
          console.log(`Service ID:    ${i.service_id ?? '-'}`);
          console.log(`Domain ID:     ${i.domain_id ?? '-'}`);
          console.log(`Optional:      ${i.optional ?? false}`);
          console.log(`Accept:        ${i.accept ?? false}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch quotation item: ${message}`);
        process.exit(1);
      }
    });

  items
    .command('add')
    .description('Add a new item to a quotation')
    .requiredOption('-q, --quotation-id <id>', 'Quotation ID')
    .requiredOption('-n, --name <value>', 'Item name')
    .option('--unit-price <n>', 'Unit price')
    .option('--unit-month <n>', 'Number of months', '1')
    .option('--unit-quantity <n>', 'Quantity')
    .option('--discount <n>', 'Discount percentage')
    .option('--remark <value>', 'Remark')
    .option('--sequence <n>', 'Display sequence order')
    .option('--service-id <n>', 'Service ID')
    .option('--domain-id <n>', 'Domain ID')
    .option('--optional', 'Mark as optional item')
    .option('--accept', 'Mark as accepted')
    .option('--hidden-price', 'Hide price')
    .option('--hidden-quantity', 'Hide quantity')
    .option('--hidden-number', 'Hide number')
    .option('--page-break', 'Insert page break after item')
    .action(async (options) => {
      const client = getClient();

      const fieldMap = {
        quotationId: ['quotation_id', v => parseInt(v)],
        name: ['name', v => JSON.stringify(v)],
        unitPrice: ['unit_price', v => parseFloat(v)],
        unitMonth: ['unit_month', v => parseInt(v)],
        unitQuantity: ['unit_quantity', v => parseFloat(v)],
        discount: ['discount', v => parseFloat(v)],
        remark: ['remark', v => JSON.stringify(v)],
        sequence: ['sequence', v => parseInt(v)],
        serviceId: ['service_id', v => parseInt(v)],
        domainId: ['domain_id', v => parseInt(v)],
      };

      const fields = Object.entries(fieldMap)
        .filter(([optKey]) => options[optKey] != null)
        .map(([optKey, [gqlKey, transform]]) => `${gqlKey}: ${transform(options[optKey])}`);

      if (options.optional) fields.push('optional: true');
      if (options.accept) fields.push('accept: true');
      if (options.hiddenPrice) fields.push('hidden_price: true');
      if (options.hiddenQuantity) fields.push('hidden_quantity: true');
      if (options.hiddenNumber) fields.push('hidden_number: true');
      if (options.pageBreak) fields.push('page_break: true');

      const mutation = gql`
        mutation {
          addQuotationItem(data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        const newId = data?.addQuotationItem;
        console.log(`Created quotation item [${newId}]: ${options.name}`);
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to add quotation item: ${message}`);
        process.exit(1);
      }
    });

  items
    .command('update <id>')
    .description('Update a quotation item by ID')
    .option('-n, --name <value>', 'Item name')
    .option('--unit-price <n>', 'Unit price')
    .option('--unit-month <n>', 'Number of months')
    .option('--unit-quantity <n>', 'Quantity')
    .option('--discount <n>', 'Discount percentage')
    .option('--remark <value>', 'Remark')
    .option('--sequence <n>', 'Display sequence order')
    .option('--service-id <n>', 'Service ID')
    .option('--domain-id <n>', 'Domain ID')
    .action(async (id, options) => {
      const client = getClient();

      const fieldMap = {
        name: ['name', v => JSON.stringify(v)],
        unitPrice: ['unit_price', v => parseFloat(v)],
        unitMonth: ['unit_month', v => parseInt(v)],
        unitQuantity: ['unit_quantity', v => parseFloat(v)],
        discount: ['discount', v => parseFloat(v)],
        remark: ['remark', v => JSON.stringify(v)],
        sequence: ['sequence', v => parseInt(v)],
        serviceId: ['service_id', v => parseInt(v)],
        domainId: ['domain_id', v => parseInt(v)],
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
          updateQuotationItem(id: ${parseInt(id)}, data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        if (data?.updateQuotationItem) {
          console.log(`Updated quotation item [${id}].`);
        } else {
          console.error('Update failed.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to update quotation item: ${message}`);
        process.exit(1);
      }
    });

  items
    .command('delete <id>')
    .description('Delete a quotation item by ID')
    .action(async (id) => {
      const client = getClient();
      const mutation = gql`
        mutation {
          deleteQuotationItem(id: ${parseInt(id)})
        }
      `;
      try {
        const data = await client.request(mutation);
        if (data?.deleteQuotationItem) {
          console.log(`Deleted quotation item [${id}].`);
        } else {
          console.error('Delete failed.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to delete quotation item: ${message}`);
        process.exit(1);
      }
    });
}

module.exports = { register };
