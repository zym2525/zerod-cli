const fs = require('fs-extra')
const path = require('path')
const inquirer = require('inquirer')
// const Creator = require('./Creator')
// const { getPromptModules } = require('./util/createTools')
const { chalk, error, stopSpinner, exit, clearConsole, isFileExisted, logWithSpinner, request, semver, log } = require('../utils')
const validateProjectName = require('validate-npm-package-name')
const { TemplateNameType, TemplateRepoUrl, TemplateRepoInfoUrl } = require('../constants')
const { generate } = require('./generate')
const execSync = require('child_process').execSync;

async function create(projectName, options) {

  const cwd = options.cwd || process.cwd()
  const inCurrent = projectName === '.'
  const name = inCurrent ? path.relative('../', cwd) : projectName
  const targetDir = path.resolve(cwd, projectName || '.')

  const result = validateProjectName(name)
  if (!result.validForNewPackages) {
    console.error(chalk.red(`Invalid project name: "${name}"`))
    result.errors && result.errors.forEach(err => {
      console.error(chalk.red.dim('Error: ' + err))
    })
    result.warnings && result.warnings.forEach(warn => {
      console.error(chalk.red.dim('Warning: ' + warn))
    })
    exit(1)
  }

  if (!options.template) {
    await clearConsole()
    let templateNameTypes = [{
      type: 'list',
      name: 'templateNameType',
      message: 'which template do you want to create?',
      choices: Object.values(TemplateNameType)
    }];

    // 调用问题
    const { templateNameType } = await inquirer.prompt(templateNameTypes);
    options.template = templateNameType;
  }

  if (fs.existsSync(targetDir) && !options.merge) {
    if (options.force) {
      await fs.remove(targetDir)
    } else {
      await clearConsole()
      if (inCurrent) {
        const { ok } = await inquirer.prompt([
          {
            name: 'ok',
            type: 'confirm',
            message: `Generate project in current directory?`
          }
        ])
        if (!ok) {
          return
        }
      } else {
        const { action } = await inquirer.prompt([
          {
            name: 'action',
            type: 'list',
            message: `Target directory ${chalk.cyan(targetDir)} already exists. Pick an action:`,
            choices: [
              { name: 'Overwrite', value: 'overwrite' },
              { name: 'Merge', value: 'merge' },
              { name: 'Cancel', value: false }
            ]
          }
        ])
        if (!action) {
          return
        } else if (action === 'overwrite') {
          console.log(`\nRemoving ${chalk.cyan(targetDir)}...`)
          await fs.remove(targetDir)
        }
      }
    }
  }


  // targetDirtmp = 'E://lingdian/test';

  //await downloadAndGenerate(options.template, targetDirtmp);
  //stopSpinner(false)
  const templatePath = path.resolve(
    getPkgPath(),
    'node_modules',
    'zerod-template',
    options.template
  )

  await checkTemplateVersion(templatePath);

  generate(templatePath, targetDir, name, options);

  downloadPlugins(targetDir);

  log(`🎉  Successfully created project ${chalk.yellow(name)}.`)
}

async function checkTemplateVersion(templatePath) {
  try {
    var res = await isFileExisted(templatePath);
    const package = require(path.resolve(
      getPkgPath(),
      'node_modules',
      'zerod-template',
      'package.json'
    ));
    const localVersion = package.version;

    const latestVersion = (await request.get(TemplateRepoInfoUrl, {})).data.tag_name;

    const isNeedUpdate = semver.lt(localVersion, latestVersion);

    if (isNeedUpdate) {
      downloadTemplate();
    }
  } catch (error) {
    // console.log('error: ', error);
    downloadTemplate();
  }
}

function downloadTemplate() {
  logWithSpinner('⚓', `downloading template...`);
  execSync(
    `npm install ${TemplateRepoUrl} --save --save-exact`,
    { stdio: 'inherit', cwd: getPkgPath() },
  );
  stopSpinner(false)
}

function downloadPlugins(targetDir) {
  console.log('⚓', `install plugins...`)
  execSync(
    `npm install`,
    { stdio: 'inherit', cwd: targetDir },
  );
}

function getPkgPath() {
  return path.resolve(__dirname, '../')
}

module.exports = (...args) => {
  return create(...args).catch(err => {
    stopSpinner(false) // do not persist
    error(err)
    process.exit(1)
  })
}
