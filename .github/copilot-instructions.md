# Copilot Instructions for Eldraeverse

This is a Ghost theme based on the Source theme, maintained for the Associated Worlds blog.

## Build, Test, and Lint Commands

- **`npm run dev`** or **`yarn dev`** - Start development mode with live reload
  - Watches `.hbs` files, `assets/css/**`, and `assets/js/**` for changes
  - Automatically rebuilds CSS and JS, triggers browser reload
  
- **`npm test`** - Build and validate the theme
  - Runs `gulp build` (pretest hook) to compile CSS and JS to `assets/built/`
  - Then runs `gscan` to check Ghost theme compatibility

- **`npm run zip`** or **`yarn zip`** - Create distributable `.zip` file
  - Runs build first, then packages theme (excludes node_modules, dist, gulpfile.js)
  - Output: `dist/eldraeverse.zip`

- **`npm run test:ci`** or **`yarn test:ci`** - Strict CI version of theme validation
  - Runs build first, then runs `gscan` with `--fatal` and `--verbose` flags
  - Treats warnings as errors (recommended for pre-deployment)

## Architecture

**Eldraeverse is a Ghost theme with the following structure:**

### Template Files (root `.hbs` files)
- **`home.hbs`** - Homepage (overrides default landing page)
- **`index.hbs`** - Main index/archive page
- **`post.hbs`** - Single post template
- **`page.hbs`** - Static page template
- **`tag.hbs`** - Tag archive page
- **`author.hbs`** - Author profile page
- **`default.hbs`** - Base wrapper for all templates

### Partials (`partials/` directory)
- **`components/`** - Reusable component partials
- **`typography/`** - Font and text styling partials
- **`icons/`** - Icon SVG partials
- Post card variants: `post-card.hbs`, `related.hbs`, `related-simple.hbs`, `related-two.hbs`
- **`email-subscription.hbs`** - Newsletter signup form
- **`feature-image.hbs`** - Featured image display logic
- **`lightbox.hbs`** - Image lightbox implementation
- **`search-toggle.hbs`** - Search UI toggle

### Assets (`assets/` directory)
- **`css/screen.css`** - Main stylesheet (PostCSS with nested imports)
- **`js/`** - JavaScript source files
  - `lib/` - Library/dependency files (loaded first)
  - Other `.js` files (concatenated after lib)
- **`built/`** - Compiled/minified output (gitignored during development)
- **`fonts/`** - Web fonts
- **`images/`** - Static images
- **`icons/`** - SVG icons for use in templates

### Build Pipeline
The Gulp build system processes:
1. **CSS** - PostCSS imports (easyimport), autoprefixer, and cssnano minification
2. **JS** - Library files first, then application code, concatenated into `source.js`, uglified
3. **HBS files** - Watched for changes, trigger live reload (no processing)

## Key Conventions

### CSS
- Uses **PostCSS** with `postcss-easy-import` for modular stylesheets
- Autoprefixer adds vendor prefixes automatically
- cssnano minifies the output (no separate minification step needed)
- Source maps are generated during build

### JavaScript
- Organized with `lib/` subdirectory for dependencies loaded first
- Files are concatenated in glob order into `assets/built/source.js`
- Uglified automatically during build
- Source maps are generated during build

### Handlebars Templates
- Ghost context helpers and variables are available in all templates
- Partials use `{{> name}}` syntax
- Custom theme configuration exposed in `@custom` context (see package.json `custom` field)

### Ghost Theme Configuration
- Theme customization options defined in `package.json` under `config.custom`
- Options include navigation layout, fonts, colors, and feature toggles
- Image sizes configured under `config.image_sizes`
- Posts per page configured in `config.posts_per_page` (default: 12)

### Release Workflow
- Use `npm run ship` to version and push (runs tests automatically)
- Use `npm run release` to create GitHub release draft (requires `GST_TOKEN` environment variable)
- Requires clean git working directory (no uncommitted changes)

### Compatibility
- Minimum Ghost version: **5.0.0** (defined in package.json engines)
- Currently tested and deployed against: **Ghost 6.32.0**
- Uses browserslist default targets for browser support
- Can use any features supported by Ghost 6.32.0 and later

## Deployment

**Target:** `wraith:/opt/ghost/data/ghost/themes/eldraeverse`

The theme is deployed using a tar archive to avoid syncing build artifacts and dependencies. Before deploying, ensure:
1. All changes are committed and pushed
2. Run `npm test` to validate the theme with gscan
3. Verify `assets/built/` contains the latest compiled CSS and JS (run `npm run build` if needed)

**Quick deployment:**
Use the provided deployment script to avoid manual command construction:
```bash
./_local/deploy.sh
```

**Manual deployment (if script unavailable):**

1. **Create a deployment archive** (excludes node_modules, build tools, sourcemaps):
```bash
tar --exclude=node_modules --exclude=.git --exclude=gulpfile.js --exclude=package-lock.json --exclude='*.map' --exclude='_local' -czf /tmp/eldraeverse-deploy.tar.gz .
```

2. **Transfer archive to wraith:**
```bash
scp /tmp/eldraeverse-deploy.tar.gz wraith:/tmp/
```

3. **Extract on wraith** (creates/updates the theme directory):
```bash
ssh wraith "mkdir -p /opt/ghost/data/ghost/themes/eldraeverse && cd /opt/ghost/data/ghost/themes/eldraeverse && tar -xzf /tmp/eldraeverse-deploy.tar.gz --strip-components=1"
```

4. **Restart Ghost** to reload the theme:
```bash
ssh wraith "cd /opt/ghost && docker compose up -d --force-recreate ghost caddy"
```

**What gets deployed:**
- All `.hbs` template and partial files
- Compiled `assets/built/screen.css` and `assets/built/source.js`
- Asset files (fonts, images, icons)
- `package.json` and metadata files

**What is excluded (not needed on production):**
- `node_modules/` — build tools only
- `.git/` — version control
- `gulpfile.js` — build configuration
- `*.map` — sourcemaps for debugging
- `package-lock.json` — lock file
- `_local/` — local development utilities (not deployed)

## Security

The theme includes the following security hardening measures:

### URL Validation
- **Pagination** - Validates all next-page URLs are same-origin before fetching, preventing open redirect XSS
- **Lightbox** - Validates image URLs use http/https protocol only, preventing data: URI and javascript: protocol attacks

### Input Validation
- **Color settings** - CSS custom color setting validated to hex format (#RRGGBB or #RGB), preventing CSS injection
- **Discourse configuration** - Removed hardcoded URLs; configured via Ghost Code Injection for security and portability

### DOM Safety
- **Dropdown menu** - Replaced innerHTML usage with safe DOM methods (createElement/createElementNS), eliminating HTML injection risk
- **SVG generation** - Uses createElementNS() for proper namespace handling instead of HTML parsing

### Additional Recommendations

For defense-in-depth protection, configure a Content Security Policy (CSP) header at the Ghost/reverse proxy level. See `_local/CSP_SETUP.md` for detailed configuration guidance.
