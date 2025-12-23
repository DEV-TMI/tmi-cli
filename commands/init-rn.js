const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');

const TEMPLATE_REPO = 'https://github.com/DEV-TMI/tmi-rn-base.git'; // Update with actual repo

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function prompt(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

function toPascalCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, c => c.toUpperCase());
}

function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  for (const [from, to] of Object.entries(replacements)) {
    content = content.replace(new RegExp(from, 'g'), to);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function replaceInDirectory(dirPath, replacements, extensions = ['.json', '.js', '.ts', '.tsx', '.java', '.kt', '.m', '.h', '.swift', '.pbxproj', '.plist', '.xml', '.gradle']) {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);

    if (item.isDirectory()) {
      if (!['node_modules', '.git', '.yarn', 'Pods', 'build'].includes(item.name)) {
        replaceInDirectory(fullPath, replacements, extensions);
      }
    } else if (item.isFile()) {
      const ext = path.extname(item.name);
      if (extensions.includes(ext) || item.name === 'Podfile') {
        replaceInFile(fullPath, replacements);
      }
    }
  }
}

function renameFilesAndFolders(dirPath, oldName, newName) {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);

    if (item.isDirectory()) {
      if (!['node_modules', '.git', '.yarn', 'Pods', 'build'].includes(item.name)) {
        renameFilesAndFolders(fullPath, oldName, newName);

        if (item.name.includes(oldName)) {
          const newDirName = item.name.replace(new RegExp(oldName, 'g'), newName);
          const newDirPath = path.join(dirPath, newDirName);
          fs.renameSync(fullPath, newDirPath);
        }
      }
    } else if (item.name.includes(oldName)) {
      const newFileName = item.name.replace(new RegExp(oldName, 'g'), newName);
      const newFilePath = path.join(dirPath, newFileName);
      fs.renameSync(fullPath, newFilePath);
    }
  }
}

async function initReactNative(args) {
  const rl = createReadlineInterface();

  console.log(chalk.cyan('\n🚀 TMI React Native Boilerplate Generator\n'));

  // Get project name
  let projectName = args[0];
  if (!projectName) {
    projectName = await prompt(rl, chalk.yellow('Enter project name (e.g., MyAwesomeApp): '));
  }

  if (!projectName) {
    console.log(chalk.red('❌ Project name is required!'));
    rl.close();
    process.exit(1);
  }

  const pascalName = toPascalCase(projectName);
  const kebabName = toKebabCase(projectName);
  const targetDir = path.resolve(process.cwd(), kebabName);

  // Check if directory exists
  if (fs.existsSync(targetDir)) {
    console.log(chalk.red(`❌ Directory "${kebabName}" already exists!`));
    rl.close();
    process.exit(1);
  }

  // Get bundle identifier
  let bundleId = await prompt(rl, chalk.yellow(`Enter bundle identifier (default: com.${kebabName.replace(/-/g, '')}): `));
  bundleId = bundleId || `com.${kebabName.replace(/-/g, '')}`;

  rl.close();

  console.log(chalk.cyan('\n📦 Creating React Native project...\n'));

  try {
    // Clone template from git
    console.log(chalk.gray('  Cloning template from repository...'));
    execSync(`git clone --depth 1 ${TEMPLATE_REPO} "${targetDir}"`, { stdio: 'pipe' });

    // Remove .git folder and cli folder
    console.log(chalk.gray('  Cleaning up...'));
    fs.rmSync(path.join(targetDir, '.git'), { recursive: true, force: true });
    fs.rmSync(path.join(targetDir, 'cli'), { recursive: true, force: true });

    console.log(chalk.gray('  Updating project configuration...'));

    // Replacements - TMI is the base template name
    const oldName = 'TMI';
    const oldBundleId = 'com.tmi.app';

    const replacements = {
      [oldName]: pascalName,
      'tmi-rn-base': kebabName,
      [oldBundleId]: bundleId,
    };

    // Replace in all files
    replaceInDirectory(targetDir, replacements);

    // Update package.json
    const pkgPath = path.join(targetDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.name = kebabName;
    pkg.private = true;
    // Remove CLI-related fields
    delete pkg.bin;
    delete pkg.files;
    delete pkg.repository;
    delete pkg.keywords;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

    // Rename folders (iOS & Android)
    console.log(chalk.gray('  Renaming project files...'));

    // Rename iOS scheme and project files
    const iosDir = path.join(targetDir, 'ios');
    if (fs.existsSync(iosDir)) {
      // Rename files and folders
      renameFilesAndFolders(iosDir, oldName, pascalName);
      
      // Remove old folders if they still exist (cleanup)
      const oldFolders = [
        path.join(iosDir, oldName),
        path.join(iosDir, `${oldName}.xcodeproj`),
        path.join(iosDir, `${oldName}.xcworkspace`),
      ];
      for (const oldFolder of oldFolders) {
        if (fs.existsSync(oldFolder)) {
          fs.rmSync(oldFolder, { recursive: true, force: true });
        }
      }
    }

    // Rename Android package folders
    const androidMainDir = path.join(targetDir, 'android', 'app', 'src', 'main', 'java', 'com');
    if (fs.existsSync(androidMainDir)) {
      // Handle nested package structure (com/tmi/app -> com/newpackage)
      const oldPackageDir = path.join(androidMainDir, 'tmi');
      const bundleParts = bundleId.split('.');
      const newPackageName = bundleParts.length > 1 ? bundleParts[1] : kebabName.replace(/-/g, '');
      const newPackageDir = path.join(androidMainDir, newPackageName);
      
      if (fs.existsSync(oldPackageDir) && oldPackageDir !== newPackageDir) {
        // Copy contents to new location
        fs.cpSync(oldPackageDir, newPackageDir, { recursive: true });
        // Remove old folder
        fs.rmSync(oldPackageDir, { recursive: true, force: true });
      }
    }

    // Initialize git
    console.log(chalk.gray('  Initializing git repository...'));
    execSync('git init', { cwd: targetDir, stdio: 'ignore' });

    // Install dependencies
    console.log(chalk.gray('  Installing dependencies (this may take a while)...'));
    execSync('yarn install', { cwd: targetDir, stdio: 'inherit' });

    console.log(chalk.green('\n✅ React Native project created successfully!\n'));
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.white(`  cd ${kebabName}`));
    console.log(chalk.white('  cd ios && pod install && cd ..'));
    console.log(chalk.white('  yarn ios     # Run on iOS'));
    console.log(chalk.white('  yarn android # Run on Android\n'));

  } catch (error) {
    console.error(chalk.red('❌ Error creating project:'), error.message);
    // Cleanup on error
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    process.exit(1);
  }
}

module.exports = initReactNative;
