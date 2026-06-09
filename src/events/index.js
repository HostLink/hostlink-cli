const { GraphQLClient, gql } = require('graphql-request');
const Conf = require('conf');
const inquirer = require('inquirer');

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

function validateDate(input) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return 'Please use YYYY-MM-DD format';
  const d = new Date(input);
  if (isNaN(d.getTime())) return 'Invalid date';
  return true;
}

function validateTime(input) {
  if (input === '' || input == null) return true;
  if (!/^\d{2}:\d{2}$/.test(input)) return 'Please use HH:MM format (e.g. 09:30)';
  const [h, m] = input.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return 'Invalid time value';
  return true;
}

const EVENT_FIELDS = `
  event_id
  name
  remark
  date
  time
  end_date
  end_time
  type
  private
  user_id
  created_by
  created_time
  updated_time
  canDelete
  canUpdate
`;

async function promptEventInput(defaults = {}) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '名稱 (Name):',
      default: defaults.name,
      validate: (v) => (v && v.trim() ? true : 'Name is required'),
    },
    {
      type: 'input',
      name: 'date',
      message: '開始日期 (Date) [YYYY-MM-DD]:',
      default: defaults.date,
      validate: validateDate,
    },
    {
      type: 'input',
      name: 'time',
      message: '開始時間 (Time) [HH:MM, optional]:',
      default: defaults.time,
      validate: validateTime,
    },
    {
      type: 'input',
      name: 'end_date',
      message: '結束日期 (End Date) [YYYY-MM-DD, optional]:',
      default: defaults.end_date,
      validate: (v) => (v === '' || v == null ? true : validateDate(v)),
    },
    {
      type: 'input',
      name: 'end_time',
      message: '結束時間 (End Time) [HH:MM, optional]:',
      default: defaults.end_time,
      validate: (v) => (v === '' || v == null ? true : validateTime(v)),
    },
    {
      type: 'input',
      name: 'remark',
      message: '備註 (Remark) [optional]:',
      default: defaults.remark,
    },
  ]);

  return {
    name: answers.name.trim(),
    date: answers.date,
    time: answers.time || null,
    end_date: answers.end_date || null,
    end_time: answers.end_time || null,
    remark: answers.remark || null,
  };
}

function buildEventFields(values) {
  const map = {
    name: ['name', (v) => JSON.stringify(v)],
    remark: ['remark', (v) => JSON.stringify(v)],
    date: ['date', (v) => JSON.stringify(v)],
    time: ['time', (v) => JSON.stringify(v)],
    end_date: ['end_date', (v) => JSON.stringify(v)],
    end_time: ['end_time', (v) => JSON.stringify(v)],
  };

  return Object.entries(map)
    .filter(([k]) => values[k] != null && values[k] !== '')
    .map(([k, [gqlKey, transform]]) => `${gqlKey}: ${transform(values[k])}`);
}

function register(program) {
  const event = program.command('event').description('Manage events');

  event
    .command('list')
    .description('List events')
    .option('--from <date>', 'Filter events with date >= YYYY-MM-DD')
    .option('--to <date>', 'Filter events with date <= YYYY-MM-DD')
    .option('--name <text>', 'Filter by name (contains)')
    .option('-l, --limit <n>', 'Max number of events to return', '50')
    .option('-o, --offset <n>', 'Number of events to skip', '0')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      if (options.from && !validateDate(options.from)) {
        console.error(`Invalid --from: ${validateDate(options.from)}`);
        process.exit(1);
      }
      if (options.to && !validateDate(options.to)) {
        console.error(`Invalid --to: ${validateDate(options.to)}`);
        process.exit(1);
      }

      const client = getClient();

      const filterParts = [];
      if (options.from) filterParts.push(`date: { gte: ${JSON.stringify(options.from)} }`);
      if (options.to) filterParts.push(`date: { lte: ${JSON.stringify(options.to)} }`);
      if (options.name) filterParts.push(`name: { contains: ${JSON.stringify(options.name)} }`);
      const filters = filterParts.length ? `filters: { ${filterParts.join(', ')} }` : '';
      const pagination = `limit: ${parseInt(options.limit)}, offset: ${parseInt(options.offset)}`;

      const query = gql`
        query {
          listEvent${filters ? `(${filters})` : ''} {
            meta { total }
            data(${pagination}) {
              ${EVENT_FIELDS}
            }
          }
        }
      `;

      try {
        const data = await client.request(query);
        const list = data?.listEvent?.data ?? [];
        const total = data?.listEvent?.meta?.total ?? list.length;
        if (options.json) {
          console.log(JSON.stringify({ total, data: list }, null, 2));
        } else if (list.length === 0) {
          console.log('No events found.');
        } else {
          list.forEach((e) => {
            const period = e.end_date
              ? `${e.date}${e.time ? ' ' + e.time : ''} → ${e.end_date}${e.end_time ? ' ' + e.end_time : ''}`
              : `${e.date}${e.time ? ' ' + e.time : ''}`;
            const flags = [
              e.private ? 'private' : null,
              e.canDelete ? '✗del' : null,
              e.canUpdate ? '✗upd' : null,
            ].filter(Boolean).join(',');
            console.log(`[${e.event_id}] ${e.name} | ${period}${e.remark ? ` | ${e.remark}` : ''}${flags ? ` | ${flags}` : ''}`);
          });
          console.log(`\nTotal: ${total}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch events: ${message}`);
        process.exit(1);
      }
    });

  event
    .command('get <id>')
    .description('Get an event by ID')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const client = getClient();
      const query = gql`
        query {
          listEvent(filters: { event_id: ${parseInt(id)} }) {
            data {
              ${EVENT_FIELDS}
            }
          }
        }
      `;
      try {
        const data = await client.request(query);
        const list = data?.listEvent?.data ?? [];
        if (list.length === 0) {
          console.error(`Event [${id}] not found.`);
          process.exit(1);
        }
        const e = list[0];
        if (options.json) {
          console.log(JSON.stringify(e, null, 2));
        } else {
          console.log(`ID:          ${e.event_id}`);
          console.log(`Name:        ${e.name}`);
          console.log(`Date:        ${e.date}${e.time ? ' ' + e.time : ''}`);
          console.log(`End Date:    ${e.end_date ?? '-'}${e.end_time ? ' ' + e.end_time : ''}`);
          console.log(`Type:        ${e.type}`);
          console.log(`Private:     ${e.private}`);
          console.log(`Created By:  ${e.created_by ?? '-'}`);
          console.log(`Created At:  ${e.created_time}`);
          console.log(`Updated At:  ${e.updated_time ?? '-'}`);
          if (e.remark) console.log(`Remark:      ${e.remark}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch event: ${message}`);
        process.exit(1);
      }
    });

  event
    .command('add')
    .description('Add a new event (interactive or via flags)')
    .option('--name <value>', 'Event name')
    .option('--date <date>', 'Start date (YYYY-MM-DD)')
    .option('--time <hh:mm>', 'Start time (HH:MM)')
    .option('--end-date <date>', 'End date (YYYY-MM-DD)')
    .option('--end-time <hh:mm>', 'End time (HH:MM)')
    .option('--remark <value>', 'Remark')
    .action(async (options) => {
      const client = getClient();

      let values;
      if (options.name && options.date) {
        values = {
          name: options.name,
          date: options.date,
          time: options.time || null,
          end_date: options.end_date || null,
          end_time: options.end_time || null,
          remark: options.remark || null,
        };
      } else {
        values = await promptEventInput();
      }

      if (!validateDate(values.date)) {
        console.error(`Invalid date: ${values.date}`);
        process.exit(1);
      }
      if (values.time && !validateTime(values.time)) {
        console.error(`Invalid time: ${values.time}`);
        process.exit(1);
      }
      if (values.end_date && !validateDate(values.end_date)) {
        console.error(`Invalid end_date: ${values.end_date}`);
        process.exit(1);
      }
      if (values.end_time && !validateTime(values.end_time)) {
        console.error(`Invalid end_time: ${values.end_time}`);
        process.exit(1);
      }
      if (values.end_date && values.end_date < values.date) {
        console.error('End date cannot be before start date.');
        process.exit(1);
      }

      const fields = buildEventFields(values);
      if (fields.length === 0 || !values.name) {
        console.error('Name and date are required.');
        process.exit(1);
      }

      const mutation = gql`
        mutation {
          addEvent(data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        const newId = data?.addEvent;
        console.log(`Created event [${newId}].`);
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to add event: ${message}`);
        process.exit(1);
      }
    });

  event
    .command('update <id>')
    .description('Update an event by ID')
    .option('--name <value>', 'Event name')
    .option('--date <date>', 'Start date (YYYY-MM-DD)')
    .option('--time <hh:mm>', 'Start time (HH:MM)')
    .option('--end-date <date>', 'End date (YYYY-MM-DD)')
    .option('--end-time <hh:mm>', 'End time (HH:MM)')
    .option('--remark <value>', 'Remark')
    .action(async (id, options) => {
      const client = getClient();

      const values = {
        name: options.name,
        date: options.date,
        time: options.time,
        end_date: options.end_date,
        end_time: options.end_time,
        remark: options.remark,
      };

      if (values.date && !validateDate(values.date)) {
        console.error(`Invalid date: ${values.date}`);
        process.exit(1);
      }
      if (values.time && !validateTime(values.time)) {
        console.error(`Invalid time: ${values.time}`);
        process.exit(1);
      }
      if (values.end_date && !validateDate(values.end_date)) {
        console.error(`Invalid end_date: ${values.end_date}`);
        process.exit(1);
      }
      if (values.end_time && !validateTime(values.end_time)) {
        console.error(`Invalid end_time: ${values.end_time}`);
        process.exit(1);
      }

      const fields = buildEventFields(values);
      if (fields.length === 0) {
        console.error('No fields to update. Provide at least one option.');
        process.exit(1);
      }

      const mutation = gql`
        mutation {
          updateEvent(id: ${parseInt(id)}, data: { ${fields.join(', ')} })
        }
      `;

      try {
        const data = await client.request(mutation);
        if (data?.updateEvent) {
          console.log(`Updated event [${id}].`);
        } else {
          console.error('Update failed (event not found or you do not have permission).');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to update event: ${message}`);
        process.exit(1);
      }
    });

  event
    .command('delete <id>')
    .description('Delete an event by ID')
    .action(async (id) => {
      const client = getClient();
      const mutation = gql`
        mutation {
          deleteEvent(id: ${parseInt(id)})
        }
      `;
      try {
        const data = await client.request(mutation);
        if (data?.deleteEvent) {
          console.log(`Deleted event [${id}].`);
        } else {
          console.error('Delete failed (event not found or you do not have permission).');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to delete event: ${message}`);
        process.exit(1);
      }
    });
}

module.exports = { register };
