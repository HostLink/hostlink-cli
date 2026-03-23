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
  const invoices = program.command('invoices').description('Manage invoices');

  invoices
    .command('list')
    .description('List invoices')
    .option('-c, --client <id>', 'Filter by client ID')
    .option('-s, --search <text>', 'Filter by client name (contains)')
    .option('--status <value>', 'Filter by status')
    .option('-l, --limit <n>', 'Max number of invoices to return', '50')
    .option('-o, --offset <n>', 'Number of invoices to skip', '0')
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
          listInvoice${filters ? `(${filters})` : ''} {
            meta { total }
            data(${pagination}) {
              invoice_id
              invoice_no
              invoice_date
              due_date
              client_id
              client_name
              status
              total
              paidTotal
            }
          }
        }
      `;

      try {
        const data = await client.request(query);
        const list = data?.listInvoice?.data ?? [];
        const total = data?.listInvoice?.meta?.total ?? list.length;
        if (options.json) {
          console.log(JSON.stringify({ total, data: list }, null, 2));
        } else if (list.length === 0) {
          console.log('No invoices found.');
        } else {
          list.forEach(inv =>
            console.log(`[${inv.invoice_id}] #${inv.invoice_no ?? '-'} | ${inv.client_name ?? '-'} | ${inv.invoice_date ?? '-'} | due:${inv.due_date ?? '-'} | ${inv.status ?? '-'} | $${inv.total ?? 0} | paid:$${inv.paidTotal ?? 0}`)
          );
          console.log(`\nTotal: ${total}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch invoices: ${message}`);
        process.exit(1);
      }
    });

  invoices
    .command('get <id>')
    .description('Get an invoice by ID')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const client = getClient();
      const query = gql`
        query {
          listInvoice(filters: { invoice_id: ${parseInt(id)} }) {
            data {
              invoice_id
              invoice_no
              invoice_date
              due_date
              client_id
              client_name
              attn
              phone
              email
              fax
              addr1
              addr2
              addr3
              city
              status
              total
              paidTotal
              invoice_remark
              invoice_type
              invoice_send_via
              void_date
              items {
                paymentperiod_id
                description
                unit_price
                qty
                discount
                total
                remark
                period_from
                period_to
              }
            }
          }
        }
      `;
      try {
        const data = await client.request(query);
        const list = data?.listInvoice?.data ?? [];
        if (list.length === 0) {
          console.error(`Invoice [${id}] not found.`);
          process.exit(1);
        }
        const inv = list[0];
        if (options.json) {
          console.log(JSON.stringify(inv, null, 2));
        } else {
          console.log(`ID:          ${inv.invoice_id}`);
          console.log(`No:          ${inv.invoice_no ?? '-'}`);
          console.log(`Client ID:   ${inv.client_id}`);
          console.log(`Client:      ${inv.client_name ?? '-'}`);
          console.log(`Attn:        ${inv.attn ?? '-'}`);
          console.log(`Email:       ${inv.email ?? '-'}`);
          console.log(`Phone:       ${inv.phone ?? '-'}`);
          console.log(`Address:     ${[inv.addr1, inv.addr2, inv.addr3, inv.city].filter(Boolean).join(', ') || '-'}`);
          console.log(`Date:        ${inv.invoice_date ?? '-'}`);
          console.log(`Due Date:    ${inv.due_date ?? '-'}`);
          console.log(`Status:      ${inv.status ?? '-'}`);
          console.log(`Total:       $${inv.total ?? 0}`);
          console.log(`Paid:        $${inv.paidTotal ?? 0}`);
          if (inv.void_date) console.log(`Void Date:   ${inv.void_date}`);
          if (inv.invoice_remark) console.log(`Remark:      ${inv.invoice_remark}`);
          if (inv.items?.length) {
            console.log('\n--- Items ---');
            inv.items.forEach((item, i) => {
              console.log(`  [${i + 1}] ${item.description ?? '-'} | qty:${item.qty ?? 1} x $${item.unit_price ?? 0} | total:$${item.total ?? 0}${item.remark ? ` | ${item.remark}` : ''}`);
            });
          }
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch invoice: ${message}`);
        process.exit(1);
      }
    });

  invoices
    .command('add')
    .description('Add a new invoice')
    .requiredOption('-c, --client-id <id>', 'Client ID')
    .option('--client-name <value>', 'Client name')
    .option('--invoice-date <date>', 'Invoice date (YYYY-MM-DD)')
    .option('--due-date <date>', 'Due date (YYYY-MM-DD)')
    .option('--attn <value>', 'Attention (recipient name)')
    .option('--email <value>', 'Email')
    .option('--phone <value>', 'Phone')
    .option('--addr1 <value>', 'Address line 1')
    .option('--addr2 <value>', 'Address line 2')
    .option('--addr3 <value>', 'Address line 3')
    .option('--city <value>', 'City')
    .option('--invoice-remark <value>', 'Remark')
    .option('--invoice-type <n>', 'Invoice type')
    .option('--invoice-send-via <n>', 'Send via (int)')
    .option('--quotation-ids <value>', 'Linked quotation IDs')
    .action(async (options) => {
      const client = getClient();

      const fieldMap = {
        clientId: ['client_id', v => parseInt(v)],
        clientName: ['client_name', v => JSON.stringify(v)],
        invoiceDate: ['invoice_date', v => JSON.stringify(v)],
        dueDate: ['due_date', v => JSON.stringify(v)],
        attn: ['attn', v => JSON.stringify(v)],
        email: ['email', v => JSON.stringify(v)],
        phone: ['phone', v => JSON.stringify(v)],
        addr1: ['addr1', v => JSON.stringify(v)],
        addr2: ['addr2', v => JSON.stringify(v)],
        addr3: ['addr3', v => JSON.stringify(v)],
        city: ['city', v => JSON.stringify(v)],
        invoiceRemark: ['invoice_remark', v => JSON.stringify(v)],
        invoiceType: ['invoice_type', v => parseInt(v)],
        invoiceSendVia: ['invoice_send_via', v => parseInt(v)],
        quotationIds: ['quotation_ids', v => JSON.stringify(v)],
      };

      const fields = Object.entries(fieldMap)
        .filter(([optKey]) => options[optKey] != null)
        .map(([optKey, [gqlKey, transform]]) => `${gqlKey}: ${transform(options[optKey])}`);

      const mutation = gql`
        mutation {
          addInvoice(data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        const newId = data?.addInvoice;
        console.log(`Created invoice [${newId}].`);
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to add invoice: ${message}`);
        process.exit(1);
      }
    });

  invoices
    .command('update <id>')
    .description('Update an invoice by ID')
    .option('--client-id <id>', 'Client ID')
    .option('--client-name <value>', 'Client name')
    .option('--invoice-date <date>', 'Invoice date (YYYY-MM-DD)')
    .option('--due-date <date>', 'Due date (YYYY-MM-DD)')
    .option('--attn <value>', 'Attention (recipient name)')
    .option('--email <value>', 'Email')
    .option('--phone <value>', 'Phone')
    .option('--addr1 <value>', 'Address line 1')
    .option('--addr2 <value>', 'Address line 2')
    .option('--addr3 <value>', 'Address line 3')
    .option('--city <value>', 'City')
    .option('--invoice-remark <value>', 'Remark')
    .option('--invoice-type <n>', 'Invoice type')
    .option('--invoice-send-via <n>', 'Send via (int)')
    .option('--void-date <date>', 'Void date (YYYY-MM-DD)')
    .action(async (id, options) => {
      const client = getClient();

      const fieldMap = {
        clientId: ['client_id', v => parseInt(v)],
        clientName: ['client_name', v => JSON.stringify(v)],
        invoiceDate: ['invoice_date', v => JSON.stringify(v)],
        dueDate: ['due_date', v => JSON.stringify(v)],
        attn: ['attn', v => JSON.stringify(v)],
        email: ['email', v => JSON.stringify(v)],
        phone: ['phone', v => JSON.stringify(v)],
        addr1: ['addr1', v => JSON.stringify(v)],
        addr2: ['addr2', v => JSON.stringify(v)],
        addr3: ['addr3', v => JSON.stringify(v)],
        city: ['city', v => JSON.stringify(v)],
        invoiceRemark: ['invoice_remark', v => JSON.stringify(v)],
        invoiceType: ['invoice_type', v => parseInt(v)],
        invoiceSendVia: ['invoice_send_via', v => parseInt(v)],
        voidDate: ['void_date', v => JSON.stringify(v)],
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
          updateInvoice(id: ${parseInt(id)}, data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        if (data?.updateInvoice) {
          console.log(`Updated invoice [${id}].`);
        } else {
          console.error('Update failed.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to update invoice: ${message}`);
        process.exit(1);
      }
    });

  invoices
    .command('delete <id>')
    .description('Delete an invoice by ID')
    .action(async (id) => {
      const client = getClient();
      const mutation = gql`
        mutation {
          deleteInvoice(id: ${parseInt(id)})
        }
      `;
      try {
        const data = await client.request(mutation);
        if (data?.deleteInvoice) {
          console.log(`Deleted invoice [${id}].`);
        } else {
          console.error('Delete failed.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to delete invoice: ${message}`);
        process.exit(1);
      }
    });

  invoices
    .command('pdf <id>')
    .description('Get the PDF download link for an invoice')
    .option('-s, --save [filename]', 'Download and save PDF to local file')
    .action(async (id, options) => {
      const client = getClient();
      const query = gql`
        query {
          listInvoice(filters: { invoice_id: ${parseInt(id)} }) {
            data {
              invoice_id
              invoice_no
              pdfLink
              downloadUrl
            }
          }
        }
      `;
      try {
        const data = await client.request(query);
        const list = data?.listInvoice?.data ?? [];
        if (list.length === 0) {
          console.error(`Invoice [${id}] not found.`);
          process.exit(1);
        }
        const inv = list[0];
        const link = inv.pdfLink || inv.downloadUrl;
        if (!link) {
          console.error('No PDF link available for this invoice.');
          process.exit(1);
        }

        if (options.save !== undefined) {
          const https = require('https');
          const http = require('http');
          const fs = require('fs');
          const path = require('path');

          const filename = typeof options.save === 'string'
            ? options.save
            : `invoice-${inv.invoice_no ?? id}.pdf`;

          const filepath = path.resolve(filename);
          const protocol = link.startsWith('https') ? https : http;

          const token = config.get('token');
          const urlObj = new URL(link);

          const reqOptions = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            headers: { Authorization: `Bearer ${token}` },
          };

          console.log(`Downloading to: ${filepath}`);

          const file = fs.createWriteStream(filepath);
          protocol.get(reqOptions, (res) => {
            if (res.statusCode !== 200) {
              console.error(`Download failed: HTTP ${res.statusCode}`);
              fs.unlinkSync(filepath);
              process.exit(1);
            }
            res.pipe(file);
            file.on('finish', () => {
              file.close();
              console.log(`Saved: ${filepath}`);
            });
          }).on('error', (err) => {
            fs.unlinkSync(filepath);
            console.error(`Download error: ${err.message}`);
            process.exit(1);
          });
        } else {
          console.log(`Invoice:  [${inv.invoice_id}] #${inv.invoice_no ?? ''}`);
          console.log(`PDF Link: ${link}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch PDF link: ${message}`);
        process.exit(1);
      }
    });
}

module.exports = { register };
