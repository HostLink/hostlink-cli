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

function printMixed(value, indent = 0) {
  const pad = '  '.repeat(indent);
  if (Array.isArray(value)) {
    value.forEach((v, i) => {
      const isObj = v && typeof v === 'object';
      console.log(`${pad}[${i}]${isObj ? '' : ' ' + v}`);
      if (isObj) printMixed(v, indent + 1);
    });
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => {
      if (v && typeof v === 'object') {
        console.log(`${pad}${k}:`);
        printMixed(v, indent + 1);
      } else {
        console.log(`${pad}${k}: ${v}`);
      }
    });
  } else {
    console.log(`${pad}${value}`);
  }
}

function register(program) {
  const ha = program.command('ha').description('Interact with Home Assistant (states, services, switches)');

  ha
    .command('states')
    .description('List all Home Assistant entity states')
    .option('--entity <id>', 'Filter to a single entity_id (contains)')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const client = getClient();
      const query = gql`
        query {
          ha {
            states
          }
        }
      `;
      try {
        const data = await client.request(query);
        const states = data?.ha?.states ?? [];
        const filtered = options.entity
          ? states.filter((s) => s?.entity_id?.includes(options.entity))
          : states;
        if (options.json) {
          console.log(JSON.stringify(filtered, null, 2));
        } else if (filtered.length === 0) {
          console.log('No states found.');
        } else {
          filtered.forEach((s) => {
            const attrs = s?.attributes
              ? Object.entries(s.attributes)
                  .filter(([k, v]) => v != null && v !== '' && !['friendly_name', 'icon'].includes(k))
                  .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
                  .join(' ')
              : '';
            console.log(`[${s?.state ?? '?'}] ${s?.entity_id ?? '?'}${attrs ? ` (${attrs})` : ''}`);
          });
          console.log(`\nTotal: ${filtered.length}`);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch HA states: ${message}`);
        process.exit(1);
      }
    });

  ha
    .command('services')
    .description('List all Home Assistant services')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const client = getClient();
      const query = gql`
        query {
          ha {
            services
          }
        }
      `;
      try {
        const data = await client.request(query);
        const services = data?.ha?.services ?? [];
        if (options.json) {
          console.log(JSON.stringify(services, null, 2));
        } else if (services.length === 0) {
          console.log('No services returned.');
        } else {
          services.forEach((s) => {
            console.log(`[${s?.domain ?? '?'}] ${s?.services ? Object.keys(s.services).join(', ') : '-'}`);
          });
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch HA services: ${message}`);
        process.exit(1);
      }
    });

  ha
    .command('entity <id>')
    .description('Get a single Home Assistant entity by entity_id')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const client = getClient();
      const query = gql`
        query {
          ha {
            entity(entityId: ${JSON.stringify(id)})
          }
        }
      `;
      try {
        const data = await client.request(query);
        const entity = data?.ha?.entity;
        if (options.json) {
          console.log(JSON.stringify(entity, null, 2));
        } else if (!entity) {
          console.log('No entity data returned.');
        } else {
          console.log(`entity_id: ${entity.entity_id ?? id}`);
          console.log(`state:     ${entity.state ?? '?'}`);
          console.log(`last_changed: ${entity.last_changed ?? '-'}`);
          console.log(`last_updated: ${entity.last_updated ?? '-'}`);
          if (entity.attributes && Object.keys(entity.attributes).length) {
            console.log('\nattributes:');
            printMixed(entity.attributes, 1);
          }
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch HA entity: ${message}`);
        process.exit(1);
      }
    });

  ha
    .command('set <entity_id> <state>')
    .description('Update a switch entity state (on/off)')
    .action(async (entityId, state) => {
      const normalized = state.toLowerCase();
      if (normalized !== 'on' && normalized !== 'off') {
        console.error('State must be "on" or "off".');
        process.exit(1);
      }
      const client = getClient();
      const mutation = gql`
        mutation {
          haStateUpdate(entity_id: ${JSON.stringify(entityId)}, state: ${JSON.stringify(normalized)})
        }
      `;
      try {
        const data = await client.request(mutation);
        if (data?.haStateUpdate) {
          console.log(`✅ ${entityId} → ${normalized}`);
        } else {
          console.error('Update returned false.');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to update HA state: ${message}`);
        process.exit(1);
      }
    });
}

module.exports = { register };
