/**
 * Slot a new organization logo into the package.
 *
 * Cleans an exported SVG (strips Inkscape/editor cruft), then regenerates the
 * single source of truth in src/assets/logo.js and the matching `--ddl-logo`
 * data URI in src/styles/ddl-theme.css.
 *
 * Usage:
 *   node scripts/slot-logo.mjs [path/to/logo.svg]
 *   (defaults to ~/Downloads/ddl-logo.svg)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = process.argv[2] || `${process.env.HOME}/Downloads/ddl-logo.svg`;
const LOGO_JS = 'src/assets/logo.js';
const CSS = 'src/styles/ddl-theme.css';

let svg = readFileSync(SRC, 'utf8');

// --- Clean editor cruft ---------------------------------------------------
svg = svg
  .replace(/<\?xml[\s\S]*?\?>/g, '')                       // XML declaration
  .replace(/<metadata[\s\S]*?<\/metadata>/g, '')           // metadata block
  .replace(/<defs\b[^>]*\/>/g, '')                          // empty defs
  .replace(/<sodipodi:namedview[\s\S]*?\/>/g, '')          // editor view state
  .replace(/\s+(?:inkscape|sodipodi):[\w-]+="[^"]*"/g, '')  // editor attrs
  .replace(/\s+xmlns:(?:dc|cc|rdf|svg|sodipodi|inkscape)="[^"]*"/g, '') // unused ns
  .replace(/\s+id="[^"]*"/g, '')                            // element ids
  .replace(/\s+version="[^"]*"/g, '')                       // svg version attr
  .replace(/\s+(width|height)="[\d.]+in"/g, '');            // inch dimensions on root

// Ensure root carries an accessible role + label, then collapse whitespace.
svg = svg.replace(/<svg\b/, '<svg role="img" aria-label="Development Data Lab"');
svg = svg.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim();

// Sanity checks.
for (const bad of ['inkscape:', 'sodipodi:', '<metadata', '<?xml']) {
  if (svg.includes(bad)) throw new Error(`cleanup left behind: ${bad}`);
}
if (!/viewBox="[^"]+"/.test(svg)) throw new Error('viewBox missing');
if (svg.includes('`') || svg.includes('${')) throw new Error('template-literal-hostile chars');

// --- Rewrite logo.js ------------------------------------------------------
const dataUri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
const logoModule = `/**
 * DDL organization logo — single source of truth.
 *
 * Shipped as inlined SVG so it has zero path-resolution dependencies: every
 * consumer (and every bundler) gets the same mark whether they import the JS
 * module or reference it from CSS, without needing to copy a separate file.
 *
 * The artwork below is the "Development Data Lab" wordmark + mark, cleaned of
 * editor cruft. To replace it, run scripts/slot-logo.mjs (or paste new \`<svg>\`
 * markup into DDL_LOGO_SVG) and regenerate the data URI in ddl-theme.css.
 */

/** Raw SVG markup for the DDL logo. Edit this to swap in new artwork. */
export const DDL_LOGO_SVG = ${'`'}${svg}${'`'};

/**
 * The same SVG encoded as a data URI, suitable for \`background-image: url(...)\`,
 * an \`<img src>\`, or any CSS context.
 * @type {string}
 */
export const DDL_LOGO_DATA_URI = \`data:image/svg+xml,\${encodeURIComponent(DDL_LOGO_SVG)}\`;

/**
 * Renders the logo into a DOM element as inline SVG.
 * @param {Object} [options]
 * @param {string} [options.label='Dev Data Lab'] - Accessible label / tooltip.
 * @param {string} [options.className='ddl-logo'] - Class for the wrapper span.
 * @returns {HTMLSpanElement} A span containing the inline SVG logo.
 */
export function createLogo({ label = 'Dev Data Lab', className = 'ddl-logo' } = {}) {
  const el = document.createElement('span');
  el.className = className;
  el.title = label;
  el.setAttribute('aria-label', label);
  el.innerHTML = DDL_LOGO_SVG;
  return el;
}
`;
writeFileSync(LOGO_JS, logoModule);

// --- Patch the CSS data URI ----------------------------------------------
let css = readFileSync(CSS, 'utf8');
const re = /^ {2}--ddl-logo: url\("[\s\S]*?"\);$/m;
if (!re.test(css)) throw new Error('could not find --ddl-logo line in CSS');
css = css.replace(re, `  --ddl-logo: url("${dataUri}");`);
writeFileSync(CSS, css);

console.log(`Slotted ${SRC}`);
console.log('  cleaned SVG length:', svg.length);
console.log('  data URI length:', dataUri.length);
console.log('  updated src/assets/logo.js + src/styles/ddl-theme.css');
