#!/usr/bin/env node

const chalk = require('chalk');

const commands = {
  'init-rn': require('./commands/init-rn'),
  // Future commands:
  // 'init-next': require('./commands/init-next'),
  // 'init-expo': require('./commands/init-expo'),
};

const args = process.argv.slice(2);
const command = args[0];
const commandArgs = args.slice(1);

function showHelp() {
  console.log(chalk.cyan('\n🚀 TMI CLI - Project Generator\n'));
  console.log(chalk.white('Usage: tmi <command> [options]\n'));
  console.log(chalk.yellow('Available commands:\n'));
  console.log(chalk.white('  init-rn [name]    Create a new React Native project'));
  // console.log(chalk.white('  init-next [name]  Create a new Next.js project'));
  // console.log(chalk.white('  init-expo [name]  Create a new Expo project'));
  console.log(chalk.white('\nExamples:\n'));
  console.log(chalk.gray('  tmi init-rn MyApp'));
  console.log(chalk.gray('  tmi init-rn\n'));
}

function showVersion() {
  const pkg = require('../package.json');
  console.log(`tmi-cli v${pkg.version}`);
}

async function main() {
  if (!command || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  if (command === '--version' || command === '-v') {
    showVersion();
    process.exit(0);
  }

  const commandHandler = commands[command];

  if (!commandHandler) {
    console.log(chalk.red(`\n❌ Unknown command: ${command}\n`));
    showHelp();
    process.exit(1);
  }

  try {
    await commandHandler(commandArgs);
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
  }
}

main();
