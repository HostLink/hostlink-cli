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

const LEAVE_TYPE_LABELS = {
  0: '年假 (Annual Leave)',
  1: '病假 (Sick Leave)',
  3: '時薪年假 (Hourly Annual Leave)',
  4: '無薪假 (No Pay Leave)',
};

function calculateLeaveDays(fromDate, toDate, fromTime, toTime) {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return fromTime === toTime ? 0.5 : 1;
  }

  let total = diffDays + 1;
  if (fromTime === 1) total -= 0.5;
  if (toTime === 0) total -= 0.5;
  return Math.max(total, 0);
}

function validateDate(input) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return 'Please use YYYY-MM-DD format';
  const d = new Date(input);
  if (isNaN(d.getTime())) return 'Invalid date';
  return true;
}

function validateTime(input) {
  if (!/^\d{2}:\d{2}$/.test(input)) return 'Please use HH:MM format (e.g. 09:30)';
  const [h, m] = input.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return 'Invalid time value';
  return true;
}

async function promptLeaveRequest() {
  const { type } = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: '請假類型 (Leave Type):',
      choices: [
        { name: '年假 (Annual Leave)', value: 0 },
        { name: '病假 (Sick Leave)', value: 1 },
        { name: '時薪年假 (Hourly Annual Leave)', value: 3 },
        { name: '無薪假 (No Pay Leave)', value: 4 },
      ],
    },
  ]);

  const { from_date } = await inquirer.prompt([
    {
      type: 'input',
      name: 'from_date',
      message: '開始日期 (From Date) [YYYY-MM-DD]:',
      validate: validateDate,
    },
  ]);

  let submitData = { type, from_date };

  if (type === 3) {
    // 時薪年假: start_time + hour
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'start_time',
        message: '開始時間 (Start Time) [HH:MM]:',
        validate: validateTime,
      },
      {
        type: 'input',
        name: 'hour',
        message: '小時數 (Hours) [0.5 - 8]:',
        validate: (input) => {
          const n = parseFloat(input);
          if (isNaN(n)) return 'Must be a number';
          if (n < 0.5 || n > 8) return 'Must be between 0.5 and 8';
          if (n % 0.5 !== 0) return 'Must be a multiple of 0.5';
          return true;
        },
      },
      {
        type: 'input',
        name: 'remark',
        message: '備註 (Remark) [optional]:',
      },
    ]);
    submitData.start_time = answers.start_time;
    submitData.hour = parseFloat(answers.hour);
    submitData.remark = answers.remark || '';
  } else {
    // 年假/病假/無薪假: from_time, to_date, to_time
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'from_time',
        message: '開始時間 (From Time):',
        choices: [
          { name: '上午 (AM)', value: 0 },
          { name: '下午 (PM)', value: 1 },
        ],
      },
      {
        type: 'input',
        name: 'to_date',
        message: '結束日期 (To Date) [YYYY-MM-DD]:',
        validate: (input) => {
          const r = validateDate(input);
          if (r !== true) return r;
          if (input < from_date) return 'End date cannot be before start date';
          return true;
        },
      },
      {
        type: 'list',
        name: 'to_time',
        message: '結束時間 (To Time):',
        choices: [
          { name: '上午 (AM)', value: 0 },
          { name: '下午 (PM)', value: 1 },
        ],
      },
      {
        type: 'input',
        name: 'remark',
        message: '備註 (Remark) [optional]:',
      },
    ]);

    submitData.from_time = answers.from_time;
    submitData.to_date = answers.to_date;
    submitData.to_time = answers.to_time;
    submitData.remark = answers.remark || '';

    const days = calculateLeaveDays(from_date, answers.to_date, answers.from_time, answers.to_time);
    console.log(`\n📅 預估請假天數 (Estimated): ${days} day(s)`);
  }

  // Confirm
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '確認提交請假申請? (Confirm submit?)',
      default: true,
    },
  ]);

  if (!confirm) {
    console.log('Cancelled.');
    process.exit(0);
  }

  return submitData;
}

function register(program) {
  const leave = program.command('leave').description('Manage leave requests');

  leave
    .command('add')
    .description('Submit a new leave request (interactive)')
    .action(async () => {
      const client = getClient();

      // Show leave balance first
      try {
        const balanceQuery = gql`
          query {
            myStaff {
              staff_first_name
              staff_last_name
              total_leave_day_available
              total_leave_hour_available
            }
          }
        `;
        const { myStaff } = await client.request(balanceQuery);
        if (myStaff) {
          console.log(`\n👤 ${myStaff.staff_first_name ?? ''} ${myStaff.staff_last_name ?? ''}`);
          console.log(`📊 Annual Leave Balance:     ${myStaff.total_leave_day_available ?? 0} day(s)`);
          console.log(`⏱  OT Comp Leave (hours):    ${myStaff.total_leave_hour_available ?? 0} hr(s)\n`);
        }
      } catch (_) {
        // Non-fatal: continue even if balance fetch fails
      }

      const submitData = await promptLeaveRequest();

      const mutation = gql`
        mutation AddLeave($data: CreateStaffLeaveInput!) {
          addStaffLeaveRequest(data: $data)
        }
      `;

      try {
        const result = await client.request(mutation, { data: submitData });
        const leaveRequestId = result?.addStaffLeaveRequest;
        console.log('\n✅ Leave request submitted successfully!');
        console.log(`   ID:        ${leaveRequestId}`);
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`\n❌ Failed to submit leave request: ${message}`);
        process.exit(1);
      }
    });

  leave
    .command('list')
    .description('List my leave requests')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const client = getClient();
      const query = gql`
        query {
          myStaffLeaveRequests {
            leave_request_id
            type
            from_date
            to_date
            from_time
            to_time
            start_time
            hour
            status
            remark
            created_at
          }
        }
      `;
      try {
        const data = await client.request(query);
        const requests = data?.myStaffLeaveRequests ?? [];
        if (options.json) {
          console.log(JSON.stringify(requests, null, 2));
          return;
        }
        if (requests.length === 0) {
          console.log('No leave requests found.');
          return;
        }
        requests.forEach((r) => {
          const typeLabel = LEAVE_TYPE_LABELS[r.type] ?? `Type ${r.type}`;
          const period = r.type === 3
            ? `${r.from_date} ${r.start_time ?? ''} (${r.hour}h)`
            : `${r.from_date} ${r.from_time === 0 ? 'AM' : 'PM'} → ${r.to_date} ${r.to_time === 0 ? 'AM' : 'PM'}`;
          console.log(`[${r.leave_request_id}] ${typeLabel} | ${period} | ${r.status}${r.remark ? ` | ${r.remark}` : ''}`);
        });
      } catch (err) {
        const message = err?.response?.errors?.[0]?.message ?? err.message;
        console.error(`Failed to fetch leave requests: ${message}`);
        process.exit(1);
      }
    });
}

module.exports = { register };
