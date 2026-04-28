# DOMPurify Integration Guide

This document explains how DOMPurify is integrated into Eldraeverse and how to use it for future security enhancements.

## Overview

**DOMPurify** is a lightweight JavaScript library that sanitizes HTML to prevent XSS (Cross-Site Scripting) attacks. It's maintained by Cure53 (a leading security firm) and is battle-tested in production on millions of sites.

- **Size**: ~16KB unminified, ~4KB gzipped (negligible overhead)
- **License**: Apache 2.0 / GPL 3.0 dual license
- **Documentation**: https://github.com/cure53/DOMPurify

## Current Integration

### Location
- **Library file**: `assets/js/lib/dompurify.js`
- **Current usage**: `assets/js/pagination.js`

### Why in `lib/`?
The Gulp build process loads JavaScript files in this order:
1. **`assets/js/lib/` files** - Loaded first (alphabetically)
2. **Other `assets/js/` files** - Loaded after

By placing DOMPurify in `lib/`, it's available globally before other code runs that depends on it.

### How Pagination Uses It

**Problem**: When fetching the next page of posts, we download raw HTML from Ghost. If that HTML were ever compromised (e.g., via database injection), it could contain XSS payloads that would execute in users' browsers.

**Solution**: Sanitize the HTML before inserting it into the DOM.

**The Challenge**: Pagination links (`<link rel="next">`) live in the HTML `<head>` and are stripped during sanitization. Solution: extract them first.

**Implementation** (in `pagination.js`):

```javascript
try {
    // 1. Fetch next page HTML
    const res = await fetch(nextElement.href);
    const html = await res.text();
    
    // 2. Extract pagination metadata BEFORE sanitizing
    const tempParser = new DOMParser();
    const tempDoc = tempParser.parseFromString(html, 'text/html');
    const nextLinkFromPage = tempDoc.querySelector('link[rel=next]');
    let nextPageUrl = null;
    if (nextLinkFromPage && nextLinkFromPage.href) {
        nextPageUrl = nextLinkFromPage.href;
    }
    
    // 3. Sanitize the post content (strips scripts, event handlers, etc.)
    const sanitizedHtml = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['div', 'article', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'img', ...],
        ALLOWED_ATTR: ['src', 'alt', 'href', 'class', 'id', 'width', 'height', ...]
    });
    
    // 4. Parse sanitized content
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedHtml, 'text/html');
    
    // 5. Extract post elements and use pre-extracted URL
    // ...
    if (nextPageUrl && isSameOrigin(nextPageUrl)) {
        nextElement.href = nextPageUrl;
    }
}
```

## Adding DOMPurify to New Code

### Basic Usage

```javascript
// Sanitize HTML with defaults (very strict - removes most tags)
const clean = DOMPurify.sanitize(dirty);

// Sanitize with custom whitelist
const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['div', 'p', 'a', 'img'],
    ALLOWED_ATTR: ['href', 'src', 'alt']
});
```

### Common Scenarios

#### 1. Sanitizing User Input
```javascript
// Before inserting user-provided content into the DOM
const userHtml = getUserContent();
const safe = DOMPurify.sanitize(userHtml, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'a', 'br'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false  // Don't allow data-* attributes
});
element.innerHTML = safe;
```

#### 2. Sanitizing with More Permissive Whitelist
```javascript
// For content that needs richer formatting (like full post HTML)
const richHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
        'div', 'article', 'section', 'header', 'footer',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'a', 'strong', 'em', 'u', 'i', 'b',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
        'img', 'figure', 'figcaption', 'table', 'tr', 'td', 'th'
    ],
    ALLOWED_ATTR: [
        'src', 'alt', 'href', 'title',
        'class', 'id', 'width', 'height',
        'align', 'border', 'cellpadding', 'cellspacing'
    ]
});
```

#### 3. Sanitizing with Event Handler Protection
```javascript
// Block event handlers and scripts completely
const safe = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['div', 'p', 'span'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true  // Keep text content even if tags are removed
});
```

### Configuration Options

| Option | Type | Purpose |
|--------|------|---------|
| `ALLOWED_TAGS` | Array | List of HTML tags to allow |
| `ALLOWED_ATTR` | Array | List of attributes to allow on all tags |
| `TAG_ATTR_MAP` | Object | Map specific tags to specific attributes |
| `ALLOW_DATA_ATTR` | Boolean | Allow `data-*` attributes (default: true) |
| `KEEP_CONTENT` | Boolean | Keep text content when removing tags (default: true) |
| `ALLOWED_URI_REGEXP` | RegExp | Validate URLs in href/src attributes |
| `RETURN_DOM` | Boolean | Return DOM node instead of string |

## Testing DOMPurify Changes

### Browser Console Testing
```javascript
// Test sanitization in browser DevTools console
const dirty = '<img src=x onerror="alert(\'XSS\')">';
const clean = DOMPurify.sanitize(dirty);
console.log(clean);  // Should output: <img src="x">

// Test with whitelist
const restricted = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['a', 'p'],
    ALLOWED_ATTR: []
});
console.log(restricted);  // Should output: (empty)
```

### Common XSS Payloads to Test
```javascript
// Event handler injection
'<img src=x onerror="alert(1)">'

// JavaScript protocol
'<a href="javascript:alert(1)">click</a>'

// Data URI
'<img src="data:text/html,<script>alert(1)</script>">'

// Encoded attack
'<img src=x &#111;nerror="alert(1)">'

// SVG vector
'<svg onload="alert(1)"></svg>'

// All should be sanitized to safe content
```

## Performance Considerations

- **Parsing cost**: DOMPurify creates a temporary DOM Parser for each sanitization call
- **Optimization**: For repeated sanitizations of similar HTML, consider caching or batch processing
- **Size**: Library adds ~4KB to theme size (in gzipped bundle)

For pagination specifically:
- Sanitization happens once per page load (minimal performance impact)
- Consider lazy-loading if adding DOMPurify to other hot-path code

## Future Enhancements

### Candidates for DOMPurify Protection
1. **Comments section** - If user comments are ever enabled
2. **Custom page content** - If editors can add raw HTML
3. **External API responses** - If theme pulls content from third-party APIs
4. **Mobile notification content** - If push notifications include HTML

### Integration Pattern
```javascript
// Template for adding DOMPurify to new features:
const contentFromUntrustedSource = fetchContent();
const safeContent = DOMPurify.sanitize(contentFromUntrustedSource, {
    ALLOWED_TAGS: [/* minimal whitelist */],
    ALLOWED_ATTR: [/* minimal whitelist */]
});
element.innerHTML = safeContent;
```

## Troubleshooting

### Issue: Content is being stripped unexpectedly
**Solution**: The whitelist is too strict. Add the missing tags/attributes to ALLOWED_TAGS/ALLOWED_ATTR.

### Issue: Performance degradation
**Solution**: Sanitization is happening too frequently. Consider caching results or using batch operations.

### Issue: Complex nested structures not working
**Solution**: Increase the whitelist or use `RETURN_DOM: true` to return a DOM node instead of string for manipulation.

## References

- [DOMPurify GitHub](https://github.com/cure53/DOMPurify)
- [OWASP: XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: XSS](https://developer.mozilla.org/en-US/docs/Glossary/Cross-site_scripting_XSS)
