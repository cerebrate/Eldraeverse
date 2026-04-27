# Copilot Instructions for Eldraeverse

This is a Ghost theme based on the Source theme, maintained for the Associated Worlds blog.

## Build, Test, and Lint Commands

- **`npm run dev`** or **`yarn dev`** - Start development mode with live reload
  - Watches `.hbs` files, `assets/css/**`, and `assets/js/**` for changes
  - Automatically rebuilds CSS and JS, triggers browser reload
  
- **`npm run build`** or **`yarn build`** - Build CSS and JavaScript only
  - Processes PostCSS with autoprefixer and cssnano
  - Concatenates and minifies JS files
  - Outputs to `assets/built/`

- **`npm run zip`** or **`yarn zip`** - Create distributable `.zip` file
  - Runs build first, then packages theme (excludes node_modules, dist, gulpfile.js)
  - Output: `dist/eldraeverse.zip`

- **`npm test`** or **`yarn test`** - Run theme validation
  - Uses `gscan` to check Ghost theme compatibility
  - Automatically runs build first (pretest hook)

- **`npm run test:ci`** or **`yarn test:ci`** - CI version of test
  - Same as test but with `--fatal` and `--verbose` flags
  - Treats warnings as errors

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
- Uses browserslist default targets for browser support

## Deployment

**Target:** `wraith:/opt/ghost/data/ghost/themes/eldraeverse`

The theme is deployed using `scp` to overwrite the entire theme directory on the target host. Before deploying, ensure:
1. All changes are committed and pushed
2. Run `npm test` to validate the theme with gscan
3. Verify `assets/built/` contains the latest compiled CSS and JS (run `npm run build` if needed)

**Deployment command:**
```bash
scp -r . wraith:/opt/ghost/data/ghost/themes/eldraeverse
```

**Note:** This overwrites the entire theme directory on the host, including all files in the repo. The Ghost server will automatically reload the theme changes.
