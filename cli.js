#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers')

yargs(hideBin(process.argv))
    .commandDir(`cmds`)
    .argv;

