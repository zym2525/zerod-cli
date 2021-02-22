#!/usr/bin/env node

// Check node version

const { chalk, semver } = require('../utils')
const package = require('../package')
const requiredVersion = package.engines.node
const leven = require('leven')

function checkNodeVersion(wanted, id) {
    if (!semver.satisfies(process.version, wanted)) {
        console.log(chalk.red(
            'You are using Node ' + process.version + ', but this version of ' + id +
            ' requires Node ' + wanted + '.\nPlease upgrade your Node version.'
        ))
        process.exit(1)
    }
}

checkNodeVersion(requiredVersion, package.name)

if (semver.satisfies(process.version, '9.x')) {
    console.log(chalk.red(
        `You are using Node ${process.version}.\n` +
        `Node.js 9.x has already reached end-of-life and will not be supported in future major releases.\n` +
        `It's strongly recommended to use an active LTS version instead.`
    ))
}

const minimist = require('minimist')
const program = require('commander')
const inquirer = require('inquirer')

program
    .version(`${package.name} ${package.version}`)
    .usage('<command> [options]')

program
    .command('create <app-name>')
    .description('create a new project powered by zero-cli')
    // .option('-p, --preset <presetName>', 'Skip prompts and use saved or remote preset')
    // .option('-d, --default', 'Skip prompts and use default preset')
    // .option('-i, --inlinePreset <json>', 'Skip prompts and use inline JSON string as preset')
    // .option('-m, --packageManager <command>', 'Use specified npm client when installing dependencies')
    // .option('-r, --registry <url>', 'Use specified npm registry when installing dependencies (only for npm)')
    // .option('-g, --git [message]', 'Force git initialization with initial commit message')
    // .option('-n, --no-git', 'Skip git initialization')
    .option('-f, --force', 'Overwrite target directory if it exists')
    .option('--merge', 'Merge target directory if it exists')
    // .option('-c, --clone', 'Use git clone when fetching remote preset')
    // .option('-b, --bare', 'Scaffold project without beginner instructions')
    // .option('--skipGetStarted', 'Skip displaying "Get started" instructions')
    .option('-t, --template <templateName>', 'specified one template for zerod-cli, for example rn-app')
    .action((name, cmd) => {
        const options = cleanArgs(cmd)

        if (minimist(process.argv.slice(3))._.length > 1) {
            console.log(chalk.yellow('\n Info: You provided more than one argument. The first one will be used as the app\'s name, the rest are ignored.'))
        }

        require('../lib/create')(name, options)
    })


// output help information on unknown commands
program
    .arguments('<command>')
    .action((cmd) => {
        program.outputHelp()
        console.log(`  ` + chalk.red(`Unknown command ${chalk.yellow(cmd)}.`))
        console.log()
        suggestCommands(cmd)
    })

// add some useful info on help
program.on('--help', () => {
    console.log()
    console.log(`  Run ${chalk.cyan(`zerod <command> --help`)} for detailed usage of given command.`)
    console.log()
})

program.commands.forEach(c => c.on('--help', () => console.log()))

// enhance common error messages
const enhanceErrorMessages = require('../utils/enhanceErrorMessages')

enhanceErrorMessages('missingArgument', argName => {
    return `Missing required argument ${chalk.yellow(`<${argName}>`)}.`
})

enhanceErrorMessages('unknownOption', optionName => {
    return `Unknown option ${chalk.yellow(optionName)}.`
})

enhanceErrorMessages('optionMissingArgument', (option, flag) => {
    return `Missing required argument for option ${chalk.yellow(option.flags)}` + (
        flag ? `, got ${chalk.yellow(flag)}` : ``
    )
})

program.parse(process.argv)

if (!process.argv.slice(2).length) {
    program.outputHelp()
}

function suggestCommands(unknownCommand) {
    const availableCommands = program.commands.map(cmd => cmd._name)

    let suggestion

    availableCommands.forEach(cmd => {
        const isBestMatch = leven(cmd, unknownCommand) < leven(suggestion || '', unknownCommand)
        if (leven(cmd, unknownCommand) < 3 && isBestMatch) {
            suggestion = cmd
        }
    })

    if (suggestion) {
        console.log(`  ` + chalk.red(`Did you mean ${chalk.yellow(suggestion)}?`))
    }
}

function camelize(str) {
    return str.replace(/-(\w)/g, (_, c) => c ? c.toUpperCase() : '')
}

// commander passes the Command object itself as options,
// extract only actual options into a fresh object.
function cleanArgs(cmd) {
    const args = {}
    cmd.options.forEach(o => {
        const key = camelize(o.long.replace(/^--/, ''))
        // if an option is not present and Command has a method with the same name
        // it should not be copied
        if (typeof cmd[key] !== 'function' && typeof cmd[key] !== 'undefined') {
            args[key] = cmd[key]
        }
    })
    return args
}