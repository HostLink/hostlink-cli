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
  const iot = program.command('iot').description('Interact with office IoT devices (thermostat, sensors)');

  iot
    .command('info')
    .description('Get current IoT info (thermostat + feels-like temperature)')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const client = getClient();
      const query = gql`
        query {
          iotInfo
        }
      `;
      try {
        const data = await client.request(query);
        const info = data?.iotInfo ?? [];
        if (options.json) {
          console.log(JSON.stringify(info, null, 2));
        } else {
          if (info.length === 0) {
            console.log('No IoT info returned.');
            return;
          }
          info.forEach((entry, i) => {
            console.log(`--- Device [${i + 1}] ---`);
            if (entry && typeof entry === 'object') {
              Object.entries(entry).forEach(([k, v]) => {
                const value = typeof v === 'object' ? JSON.stringify(v) : v;
                console.log(`  ${k}: ${value}`);
              });
            } else {
              console.log(`  ${entry}`);
            }
          });
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch IoT info: ${message}`);
        console.error('(The office IoT endpoint may not be reachable from the API server.)');
        process.exit(1);
      }
    });

  iot
    .command('set-temperature <temp>')
    .description('Set the thermostat target temperature (e.g. 24 or 22.5)')
    .action(async (temp) => {
      const temperature = parseFloat(temp);
      if (isNaN(temperature)) {
        console.error(`Invalid temperature: ${temp}`);
        process.exit(1);
      }
      if (temperature < 10 || temperature > 35) {
        console.error('Temperature must be between 10 and 35 °C.');
        process.exit(1);
      }

      const client = getClient();
      const mutation = gql`
        mutation {
          updateIotTemperature(temperature: ${temperature})
        }
      `;
      try {
        const data = await client.request(mutation);
        if (data?.updateIotTemperature) {
          console.log(`✅ Set thermostat target to ${temperature} °C.`);
        } else {
          console.error('Update failed (IoT device did not return 200).');
          process.exit(1);
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to update temperature: ${message}`);
        console.error('(The office IoT endpoint may not be reachable from the API server.)');
        process.exit(1);
      }
    });
}

module.exports = { register };
