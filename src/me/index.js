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
  program
    .command('me')
    .description('Show current logged-in user profile and leave balances')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const client = getClient();
      const query = gql`
        query {
          my {
            user_id
            username
            first_name
            last_name
            email
            phone
            addr1
            addr2
            addr3
            status
            language
            join_date
            expiry_date
          }
          myStaff {
            staff_id
            join_date
            resign_date
            totalJoinDay
            totalJoinDayDisplay
            total_leave_day_available
            total_leave_hour_available
            annual_leave_hour
            total_compensatory_leave
            total_compensatory_leave_hour
            total_ot_to_cleave
            total_no_pay_leave
            total_annual_leave_to_no_pay_leave
          }
        }
      `;
      try {
        const data = await client.request(query);
        const me = data?.my;
        const staff = data?.myStaff;

        if (!me) {
          console.error('Failed to retrieve user profile.');
          process.exit(1);
        }

        if (options.json) {
          console.log(JSON.stringify({ profile: me, staff }, null, 2));
        } else {
          console.log('=== Profile ===');
          console.log(`User ID:    ${me.user_id}`);
          console.log(`Username:   ${me.username}`);
          console.log(`Name:       ${[me.first_name, me.last_name].filter(Boolean).join(' ')}`);
          console.log(`Email:      ${me.email ?? '-'}`);
          console.log(`Phone:      ${me.phone ?? '-'}`);
          console.log(`Address:    ${[me.addr1, me.addr2, me.addr3].filter(Boolean).join(', ') || '-'}`);
          console.log(`Status:     ${me.status ?? '-'}`);
          console.log(`Language:   ${me.language ?? '-'}`);
          console.log(`Join Date:  ${me.join_date ?? '-'}`);
          console.log(`Expiry:     ${me.expiry_date ?? '-'}`);

          if (staff) {
            console.log('\n=== Staff & Leave ===');
            console.log(`Staff ID:              ${staff.staff_id}`);
            console.log(`Join Date:             ${staff.join_date ?? '-'}`);
            console.log(`Resign Date:           ${staff.resign_date ?? '-'}`);
            console.log(`Days in Service:       ${staff.totalJoinDayDisplay ?? staff.totalJoinDay ?? '-'}`);
            console.log(`Annual Leave Balance:  ${staff.total_leave_day_available ?? 0} day(s)`);
            console.log(`OT Comp Leave (hours): ${staff.total_leave_hour_available ?? 0} hr(s)`);
            console.log(`Annual Leave (hours):  ${staff.annual_leave_hour ?? 0} hr(s)`);
            console.log(`Comp Leave (days):     ${staff.total_compensatory_leave ?? 0} day(s)`);
            console.log(`Comp Leave (hours):    ${staff.total_compensatory_leave_hour ?? 0} hr(s)`);
            console.log(`OT → Comp Leave:       ${staff.total_ot_to_cleave ?? 0}`);
            console.log(`No Pay Leave:          ${staff.total_no_pay_leave ?? 0} day(s)`);
            console.log(`Annual → No Pay:       ${staff.total_annual_leave_to_no_pay_leave ?? 0} day(s)`);
          }
        }
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch profile: ${message}`);
        process.exit(1);
      }
    });
}

module.exports = { register };
