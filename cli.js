#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = yargs;

yargs(hideBin(process.argv))
    .commandDir(`cmds`)
    .argv;

