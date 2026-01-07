const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');

const TEMPLATE_REPO = 'https://github.com/DEV-TMI/tmi-rn-base.git';

// ============================================================================
// UTILITIES
// ============================================================================

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

async function confirm(rl, question) {
  const answer = await prompt(rl, chalk.yellow(`${question} (Y/n): `));
  return answer.toLowerCase() !== 'n';
}

async function select(rl, question, options) {
  console.log(chalk.yellow(`\n${question}`));
  options.forEach((opt, i) => {
    console.log(chalk.gray(`  ${i + 1}. ${opt.label}`));
  });
  const answer = await prompt(rl, chalk.white(`Enter choice (1-${options.length}): `));
  const index = parseInt(answer, 10) - 1;
  if (index >= 0 && index < options.length) {
    return options[index].value;
  }
  return options[0].value;
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

function validateProjectName(name) {
  if (!name) return 'Project name is required';
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    return 'Project name must start with a letter and contain only letters, numbers, hyphens, or underscores';
  }
  if (name.length < 2) return 'Project name must be at least 2 characters';
  if (name.length > 50) return 'Project name must be less than 50 characters';
  return null;
}

function validateBundleId(bundleId) {
  if (!bundleId) return 'Bundle identifier is required';
  if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(bundleId)) {
    return 'Bundle identifier must be in format: com.company.appname (lowercase)';
  }
  return null;
}

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  for (const [from, to] of Object.entries(replacements)) {
    content = content.replace(new RegExp(from, 'g'), to);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function replaceInDirectory(dirPath, replacements, extensions = ['.json', '.js', '.ts', '.tsx', '.java', '.kt', '.m', '.h', '.swift', '.pbxproj', '.plist', '.xml', '.gradle', '.xcconfig', '.xcscheme', '.xcworkspacedata', '.storyboard', '.entitlements']) {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);

    if (item.isDirectory()) {
      if (!['node_modules', '.git', '.yarn', 'Pods', 'build', '.beads', '.claude', '.cursor', '.github', 'conductor', 'docs', 'history', 'mayor', 'polecats', 'refinery'].includes(item.name)) {
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

function printStep(step, total, message) {
  console.log(chalk.cyan(`\n[${step}/${total}] ${message}`));
}

function printSuccess(message) {
  console.log(chalk.green(`  ✓ ${message}`));
}

function printInfo(message) {
  console.log(chalk.gray(`  ℹ ${message}`));
}

function printWarning(message) {
  console.log(chalk.yellow(`  ⚠ ${message}`));
}

function printError(message) {
  console.log(chalk.red(`  ✗ ${message}`));
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function initReactNative(args) {
  const rl = createReadlineInterface();
  const TOTAL_STEPS = 8;

  console.log(chalk.cyan('\n════════════════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('   🚀 TMI React Native Boilerplate Generator'));
  console.log(chalk.cyan('════════════════════════════════════════════════════════════\n'));

  console.log(chalk.white('This wizard will guide you through setting up a new React Native'));
  console.log(chalk.white('project using the TMI boilerplate.\n'));

  try {
    // ========================================================================
    // STEP 1: Project Name
    // ========================================================================
    printStep(1, TOTAL_STEPS, 'Project Configuration');

    let projectName = args[0];
    if (!projectName) {
      console.log(chalk.gray('\n  The project name will be used for:'));
      console.log(chalk.gray('  • Directory name (kebab-case)'));
      console.log(chalk.gray('  • iOS scheme and project name (PascalCase)'));
      console.log(chalk.gray('  • Android app name (PascalCase)\n'));

      while (true) {
        projectName = await prompt(rl, chalk.yellow('  Enter project name (e.g., MyAwesomeApp): '));
        const error = validateProjectName(projectName);
        if (error) {
          printError(error);
        } else {
          break;
        }
      }
    } else {
      const error = validateProjectName(projectName);
      if (error) {
        throw new Error(error);
      }
    }

    const pascalName = toPascalCase(projectName);
    const kebabName = toKebabCase(projectName);
    const targetDir = path.resolve(process.cwd(), kebabName);

    printSuccess(`Project name: ${chalk.white(pascalName)}`);
    printInfo(`Directory: ${chalk.white(kebabName)}/`);

    if (fs.existsSync(targetDir)) {
      throw new Error(`Directory "${kebabName}" already exists! Please choose a different name or remove the existing directory.`);
    }

    // ========================================================================
    // STEP 2: Bundle Identifier
    // ========================================================================
    printStep(2, TOTAL_STEPS, 'Bundle Identifier');

    console.log(chalk.gray('\n  The bundle identifier uniquely identifies your app on:'));
    console.log(chalk.gray('  • App Store (iOS)'));
    console.log(chalk.gray('  • Google Play Store (Android)\n'));

    const defaultBundleId = `com.${kebabName.replace(/-/g, '').toLowerCase()}`;
    let bundleId;

    while (true) {
      bundleId = await prompt(rl, chalk.yellow(`  Enter bundle identifier (default: ${defaultBundleId}): `));
      bundleId = bundleId || defaultBundleId;
      const error = validateBundleId(bundleId);
      if (error) {
        printError(error);
      } else {
        break;
      }
    }

    printSuccess(`Bundle ID: ${chalk.white(bundleId)}`);

    // ========================================================================
    // STEP 3: Display Name
    // ========================================================================
    printStep(3, TOTAL_STEPS, 'App Display Name');

    console.log(chalk.gray('\n  The display name appears on the home screen under the app icon.\n'));

    const defaultDisplayName = pascalName;
    let displayName = await prompt(rl, chalk.yellow(`  Enter display name (default: ${defaultDisplayName}): `));
    displayName = displayName || defaultDisplayName;

    printSuccess(`Display name: ${chalk.white(displayName)}`);

    // ========================================================================
    // STEP 4: Features Selection
    // ========================================================================
    printStep(4, TOTAL_STEPS, 'Feature Selection');

    console.log(chalk.gray('\n  Select which features to include in your project:\n'));

    const features = {
      firebase: await confirm(rl, '  Include Firebase (Auth, Firestore, Analytics)?'),
      revenueCat: await confirm(rl, '  Include RevenueCat (In-App Purchases)?'),
      biometric: await confirm(rl, '  Include Biometric Authentication?'),
      pushNotifications: await confirm(rl, '  Include Push Notifications?'),
    };

    console.log('');
    if (features.firebase) printSuccess('Firebase: Enabled');
    else printInfo('Firebase: Disabled');
    if (features.revenueCat) printSuccess('RevenueCat: Enabled');
    else printInfo('RevenueCat: Disabled');
    if (features.biometric) printSuccess('Biometric Auth: Enabled');
    else printInfo('Biometric Auth: Disabled');
    if (features.pushNotifications) printSuccess('Push Notifications: Enabled');
    else printInfo('Push Notifications: Disabled');

    // ========================================================================
    // STEP 5: Confirmation
    // ========================================================================
    printStep(5, TOTAL_STEPS, 'Confirmation');

    console.log(chalk.white('\n  Summary:'));
    console.log(chalk.gray('  ─────────────────────────────────'));
    console.log(chalk.gray(`  Project name:    ${chalk.white(pascalName)}`));
    console.log(chalk.gray(`  Directory:       ${chalk.white(kebabName)}/`));
    console.log(chalk.gray(`  Bundle ID:       ${chalk.white(bundleId)}`));
    console.log(chalk.gray(`  Display name:    ${chalk.white(displayName)}`));
    console.log(chalk.gray('  ─────────────────────────────────\n'));

    const proceed = await confirm(rl, '  Proceed with project creation?');
    if (!proceed) {
      console.log(chalk.yellow('\n  Project creation cancelled.\n'));
      rl.close();
      process.exit(0);
    }

    // ========================================================================
    // STEP 6: Clone & Configure
    // ========================================================================
    printStep(6, TOTAL_STEPS, 'Creating Project');

    console.log(chalk.gray('\n  Cloning boilerplate template...'));
    execSync(`git clone --depth 1 ${TEMPLATE_REPO} "${targetDir}"`, { stdio: 'pipe' });
    printSuccess('Template cloned successfully');

    console.log(chalk.gray('  Cleaning up template files...'));
    fs.rmSync(path.join(targetDir, '.git'), { recursive: true, force: true });
    fs.rmSync(path.join(targetDir, 'cli'), { recursive: true, force: true });
    fs.rmSync(path.join(targetDir, '.beads'), { recursive: true, force: true });
    fs.rmSync(path.join(targetDir, '.claude'), { recursive: true, force: true });
    fs.rmSync(path.join(targetDir, '.cursor'), { recursive: true, force: true });
    fs.rmSync(path.join(targetDir, '.github'), { recursive: true, force: true });
    fs.rmSync(path.join(targetDir, 'conductor'), { recursive: true, force: true });
    fs.rmSync(path.join(targetDir, 'docs'), { recursive: true, force: true });
    fs.rmSync(path.join(targetDir, 'history'), { recursive: true, force: true });
    fs.rmSync(path.join(targetDir, 'mayor'), { recursive: true, force: true });
    fs.rmSync(path.join(targetDir, 'polecats'), { recursive: true, force: true });
    fs.rmSync(path.join(targetDir, 'refinery'), { recursive: true, force: true });
    printSuccess('Template files cleaned');

    console.log(chalk.gray('  Updating project configuration...'));

    const oldName = 'TMI';
    const oldBundleId = 'com.tmi.app';
    const oldBundleIdDev = 'com.tmisoft.app.dev';
    const oldBundleIdStaging = 'com.tmisoft.app.staging';
    const oldBundleIdProd = 'com.tmisoft.app';

    const replacements = {
      // Project name replacements (order matters - more specific first)
      'TMI\\.app': `${pascalName}.app`,
      'TMI\\.xcodeproj': `${pascalName}.xcodeproj`,
      'TMI\\.xcworkspace': `${pascalName}.xcworkspace`,
      [oldName]: pascalName,
      'tmi-rn-base': kebabName,
      'tmi_rn_base': kebabName.replace(/-/g, '_'),
      // Bundle ID replacements
      [oldBundleIdDev]: `${bundleId}.dev`,
      [oldBundleIdStaging]: `${bundleId}.staging`,
      [oldBundleIdProd]: bundleId,
      [oldBundleId]: bundleId,
      'com\\.tmisoft\\.base': bundleId,
      // Display name
      '"displayName": "TMI"': `"displayName": "${displayName}"`,
    };

    replaceInDirectory(targetDir, replacements);
    printSuccess('Configuration files updated');

    // Fix xcworkspacedata to remove duplicate/old references
    const xcworkspaceDataPath = path.join(targetDir, 'ios', `${pascalName}.xcworkspace`, 'contents.xcworkspacedata');
    if (fs.existsSync(xcworkspaceDataPath)) {
      const xcworkspaceContent = `<?xml version="1.0" encoding="UTF-8"?>
<Workspace
   version = "1.0">
   <FileRef
      location = "group:${pascalName}.xcodeproj">
   </FileRef>
   <FileRef
      location = "group:Pods/Pods.xcodeproj">
   </FileRef>
</Workspace>
`;
      fs.writeFileSync(xcworkspaceDataPath, xcworkspaceContent, 'utf8');
      printSuccess('xcworkspace fixed');
    }

    // Update package.json
    const pkgPath = path.join(targetDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.name = kebabName;
    pkg.version = '1.0.0';
    pkg.private = true;
    delete pkg.bin;
    delete pkg.files;
    delete pkg.repository;
    delete pkg.keywords;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    printSuccess('package.json updated');

    // Update app.json
    const appJsonPath = path.join(targetDir, 'app.json');
    const appJson = {
      name: pascalName,
      displayName: displayName,
    };
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
    printSuccess('app.json updated');

    // Rename iOS files and folders
    console.log(chalk.gray('  Renaming iOS project files...'));
    const iosDir = path.join(targetDir, 'ios');
    if (fs.existsSync(iosDir)) {
      renameFilesAndFolders(iosDir, oldName, pascalName);

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
    printSuccess('iOS project renamed');

    // Rename Android package
    console.log(chalk.gray('  Renaming Android project files...'));
    const androidMainDir = path.join(targetDir, 'android', 'app', 'src', 'main', 'java', 'com');
    if (fs.existsSync(androidMainDir)) {
      const oldPackageDir = path.join(androidMainDir, 'tmi');
      const bundleParts = bundleId.split('.');
      const newPackageName = bundleParts.length > 1 ? bundleParts[1] : kebabName.replace(/-/g, '');
      const newPackageDir = path.join(androidMainDir, newPackageName);

      if (fs.existsSync(oldPackageDir) && oldPackageDir !== newPackageDir) {
        fs.cpSync(oldPackageDir, newPackageDir, { recursive: true });
        fs.rmSync(oldPackageDir, { recursive: true, force: true });
      }
    }
    printSuccess('Android project renamed');

    // Create .env file
    console.log(chalk.gray('  Creating environment file...'));
    const envExamplePath = path.join(targetDir, '.env.example');
    const envPath = path.join(targetDir, '.env');
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
    }
    printSuccess('.env file created from .env.example');

    // Generate features.config.ts based on user selections
    console.log(chalk.gray('  Generating features configuration...'));
    const featuresConfigPath = path.join(targetDir, 'src', 'shared', 'config', 'features.config.ts');
    const featuresConfigContent = `/**
 * Feature Configuration
 *
 * This file controls which features are enabled in the app.
 * Modify these flags to enable/disable features without removing code.
 *
 * When a feature is disabled:
 * - Related UI components won't render
 * - Related services won't initialize
 * - Related navigation routes won't be registered
 *
 * Note: Disabling a feature here does NOT remove the code/dependencies.
 * To reduce bundle size, you need to remove the actual packages.
 */

export const FeaturesConfig = {
  // ============================================================================
  // CORE FEATURES
  // ============================================================================

  /**
   * Firebase services (Auth, Firestore, Analytics, Crashlytics, Remote Config)
   * When disabled: App uses local/mock authentication and storage
   */
  FIREBASE_ENABLED: ${features.firebase},

  /**
   * RevenueCat / In-App Purchases
   * When disabled: Billing screens hidden, all premium features unlocked (dev mode)
   */
  BILLING_ENABLED: ${features.revenueCat ? '!__DEV__' : 'false'},

  /**
   * Biometric Authentication (Face ID, Touch ID, Fingerprint)
   * When disabled: Biometric options hidden in settings
   */
  BIOMETRIC_ENABLED: ${features.biometric},

  /**
   * Push Notifications (Firebase Cloud Messaging + Notifee)
   * When disabled: Notification permissions not requested, push handlers not registered
   */
  PUSH_NOTIFICATIONS_ENABLED: ${features.pushNotifications},

  // ============================================================================
  // OPTIONAL FEATURES
  // ============================================================================

  /**
   * Analytics tracking (Firebase Analytics)
   * When disabled: No events sent to analytics
   */
  ANALYTICS_ENABLED: ${features.firebase ? '!__DEV__' : 'false'},

  /**
   * Crashlytics error reporting
   * When disabled: Crashes not reported to Firebase Crashlytics
   */
  CRASHLYTICS_ENABLED: ${features.firebase ? '!__DEV__' : 'false'},

  /**
   * Remote Config (Firebase Remote Config)
   * When disabled: Uses local default values only
   */
  REMOTE_CONFIG_ENABLED: ${features.firebase},

  /**
   * Onboarding flow
   * When disabled: Skips onboarding, goes directly to main app
   */
  ONBOARDING_ENABLED: true,

  /**
   * Demo screens (component showcase)
   * When disabled: Demo tab/screens hidden
   */
  DEMO_SCREENS_ENABLED: __DEV__,

  // ============================================================================
  // DEV FEATURES
  // ============================================================================

  /**
   * Dev bypass for authentication (skip login in development)
   */
  DEV_BYPASS_AUTH: __DEV__ && false,

  /**
   * Show dev menu in settings
   */
  DEV_MENU_ENABLED: __DEV__,
} as const;

// Type for feature keys
export type FeatureKey = keyof typeof FeaturesConfig;

// Helper to check if a feature is enabled
export function isFeatureEnabled(feature: FeatureKey): boolean {
  return FeaturesConfig[feature];
}
`;
    fs.writeFileSync(featuresConfigPath, featuresConfigContent, 'utf8');
    printSuccess('features.config.ts generated');

    // ========================================================================
    // STEP 7: Install Dependencies
    // ========================================================================
    printStep(7, TOTAL_STEPS, 'Installing Dependencies');

    console.log(chalk.gray('\n  This may take a few minutes...\n'));
    execSync('yarn install', { cwd: targetDir, stdio: 'inherit' });
    printSuccess('Dependencies installed');

    // Initialize git
    console.log(chalk.gray('\n  Initializing git repository...'));
    execSync('git init', { cwd: targetDir, stdio: 'ignore' });
    execSync('git add .', { cwd: targetDir, stdio: 'ignore' });
    execSync('git commit -m "Initial commit from TMI boilerplate"', { cwd: targetDir, stdio: 'ignore' });
    printSuccess('Git repository initialized');

    // ========================================================================
    // STEP 8: Final Instructions
    // ========================================================================
    printStep(8, TOTAL_STEPS, 'Setup Complete!');

    console.log(chalk.green('\n════════════════════════════════════════════════════════════'));
    console.log(chalk.green.bold('   ✅ Project created successfully!'));
    console.log(chalk.green('════════════════════════════════════════════════════════════\n'));

    console.log(chalk.white.bold('📁 Next Steps:\n'));

    console.log(chalk.cyan('1. Navigate to your project:'));
    console.log(chalk.gray(`   cd ${kebabName}\n`));

    console.log(chalk.cyan('2. Install iOS dependencies (CocoaPods):'));
    console.log(chalk.gray('   cd ios && pod install && cd ..\n'));

    if (features.firebase) {
      console.log(chalk.cyan('3. Configure Firebase:'));
      console.log(chalk.gray('   • Create a Firebase project at https://console.firebase.google.com'));
      console.log(chalk.gray('   • Download GoogleService-Info.plist (iOS) → ios/' + pascalName + '/'));
      console.log(chalk.gray('   • Download google-services.json (Android) → android/app/'));
      console.log(chalk.gray('   • Enable Authentication, Firestore, and Analytics\n'));
    }

    if (features.revenueCat) {
      console.log(chalk.cyan(`${features.firebase ? '4' : '3'}. Configure RevenueCat:`));
      console.log(chalk.gray('   • Create a project at https://app.revenuecat.com'));
      console.log(chalk.gray('   • Add your API keys to .env file\n'));
    }

    console.log(chalk.cyan(`${features.firebase && features.revenueCat ? '5' : features.firebase || features.revenueCat ? '4' : '3'}. Update environment variables:`));
    console.log(chalk.gray('   • Edit .env file with your API keys and configuration\n'));

    console.log(chalk.cyan('🚀 Run your app:\n'));
    console.log(chalk.gray('   yarn ios       # Run on iOS Simulator'));
    console.log(chalk.gray('   yarn android   # Run on Android Emulator\n'));

    console.log(chalk.white('📚 Documentation:'));
    console.log(chalk.gray('   See README.md for detailed documentation\n'));

    console.log(chalk.cyan('════════════════════════════════════════════════════════════\n'));

    rl.close();

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    rl.close();
    process.exit(1);
  }
}

module.exports = initReactNative;
