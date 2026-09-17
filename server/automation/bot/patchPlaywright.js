/**
 * Playwright Driver Hotfix: Firefox / Camoufox pageError Location Guard
 *
 * In Playwright Core (e.g. v1.62.x), when Firefox/Camoufox reports an unhandled
 * browser exception on complex sites like x.com where source location is absent,
 * Playwright's internal BrowserContext dispatcher accesses `pageError.location.url`
 * unconditionally, causing:
 *   "TypeError: Cannot read properties of undefined (reading 'url')"
 *
 * This script safely and idempotently patches playwright-core's bundled files to use
 * optional chaining (pageError.location?.url).
 */

const fs = require('fs');
const path = require('path');

function patchPlaywright() {
  try {
    const coreBundlePath = path.resolve(
      __dirname,
      '../../../node_modules/playwright-core/lib/coreBundle.js'
    );

    if (!fs.existsSync(coreBundlePath)) {
      return { success: false, message: 'playwright-core coreBundle.js not found' };
    }

    let content = fs.readFileSync(coreBundlePath, 'utf8');
    let modified = false;

    // 1. Guard pageError.location accesses in dispatcher and trace events
    const rawTarget =
      'url: pageError.location.url,\n              line: pageError.location.lineNumber,\n              column: pageError.location.columnNumber';
    const safeReplacement =
      'url: pageError.location?.url || "",\n              line: pageError.location?.lineNumber || 0,\n              column: pageError.location?.columnNumber || 0';

    if (content.includes(rawTarget)) {
      content = content.replaceAll(rawTarget, safeReplacement);
      modified = true;
    }

    // 2. Guard event.location.url in console event formatting
    const rawEventTarget = 'const url3 = event.location.url;';
    const safeEventReplacement = 'const url3 = event.location?.url;';

    if (content.includes(rawEventTarget)) {
      content = content.replaceAll(rawEventTarget, safeEventReplacement);
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(coreBundlePath, content, 'utf8');
      return { success: true, patched: true, message: 'Successfully applied Playwright location guard patch.' };
    }

    return { success: true, patched: false, message: 'Playwright is already patched.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Automatically execute if run directly
if (require.main === module) {
  const result = patchPlaywright();
  if (result.success) {
    console.log(`[Playwright Patch] ${result.message}`);
  } else {
    console.warn(`[Playwright Patch Warning] ${result.message || result.error}`);
  }
}

module.exports = { patchPlaywright };
