#!/usr/bin/env node

const { Command } = require('commander');
const Conf = require('conf');
const clients = require('./src/clients');
const domains = require('./src/domains');
const quotations = require('./src/quotations');
const quotationItems = require('./src/quotation-items');
const me = require('./src/me');
const leave = require('./src/leave');
const invoices = require('./src/invoices');

const config = new Conf({ projectName: 'hostlink-cli' });

const program = new Command();

program
  .name('hostlink')
  .description('HostLink CLI')
  .version(require('./package.json').version);

program
  .command('set-token <token>')
  .description('Save your access token')
  .action((token) => {
    config.set('token', token);
    console.log('Token saved.');
  });

me.register(program);
clients.register(program);
domains.register(program);
quotations.register(program);
quotationItems.register(program);
leave.register(program);
invoices.register(program);

program.parse(process.argv);
