# Content Security Policy (CSP) Setup Guide

This document explains how to configure Content Security Policy headers for the Eldraeverse Ghost theme to provide defense-in-depth security.

## What is CSP?

Content Security Policy is an HTTP header that restricts what resources (scripts, styles, images, etc.) can be loaded on a page. It's a powerful defense against:
- **Cross-Site Scripting (XSS)** - Prevents inline scripts and unauthorized external scripts
- **Clickjacking** - Prevents embedding in frames
- **Data exfiltration** - Restricts where data can be sent
- **Malicious injections** - Blocks unauthorized content sources

## Why Configure CSP for Eldraeverse?

While the theme includes input validation and DOM safety measures, CSP provides an additional layer of protection by **completely preventing** certain attack vectors at the browser level, regardless of code vulnerabilities.

### Theme-Specific CSP Considerations

The Eldraeverse theme uses:
- **Discourse embeds** - Requires `frame-src` and `script-src` for https://eldraeverse.discourse.group/
- **PhotoSwipe lightbox** - Uses inline styles, requires `style-src 'unsafe-inline'` (or nonce-based approach)
- **Google Fonts** - Requires `font-src`
- **External images** - Requires appropriate `img-src` policy

## Recommended CSP Header

### For Caddy (reverse proxy at wraith)

Add this to your `Caddyfile`:

```caddyfile
@ghost {
    host eldraeverse.com
    path /
}

handle @ghost {
    # Content Security Policy header
    header Content-Security-Policy "
        default-src 'self';
        script-src 'self' 'unsafe-inline' https://eldraeverse.discourse.group;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        img-src 'self' data: https:;
        frame-src 'self' https://eldraeverse.discourse.group;
        connect-src 'self' https:;
        media-src 'self' https:;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none'
    "
    
    reverse_proxy ghost:2368
}
```

### For Ghost (via Ghost admin Code Injection)

If you prefer to set CSP via Ghost instead of the reverse proxy:

1. Go to Ghost Admin → Settings → Code Injection
2. In **Site Header**, add:
```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://eldraeverse.discourse.group;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https:;
    frame-src 'self' https://eldraeverse.discourse.group;
    connect-src 'self' https:;
    media-src 'self' https:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none'
">
```

**Note:** The meta tag approach is less secure than HTTP headers but works if you don't have reverse proxy control.

## Policy Breakdown

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src 'self'` | All resources default to same-origin | Restrictive baseline |
| `script-src` | Allow self + Discourse + unsafe-inline | Loads theme JS and Discourse embed; unsafe-inline needed for existing code patterns |
| `style-src` | Allow self + unsafe-inline + Google Fonts | Allows theme CSS and dynamic styles |
| `font-src` | self + Google Fonts | Web fonts for typography |
| `img-src` | self + data: + https: | Allows local images, data URIs, and HTTPS external images |
| `frame-src` | self + Discourse | Allows Discourse embed iframe |
| `connect-src` | self + https: | Restricts XHR/fetch to HTTPS same-origin |
| `object-src 'none'` | Disallow | Blocks plugins and embeds |
| `base-uri 'self'` | Disallow redirect | Prevents base tag injection |
| `form-action 'self'` | Same-origin only | Prevents form hijacking |
| `frame-ancestors 'none'` | Disallow framing | Prevents clickjacking |

## Transition to Nonce-Based CSP (Advanced)

For tighter security, replace `'unsafe-inline'` with nonce-based content:

1. Generate a unique nonce for each request (e.g., via Ghost middleware)
2. Add `nonce-{random-value}` to `script-src` and `style-src`
3. Add `nonce="{random-value}"` attribute to all inline `<script>` and `<style>` tags

This completely eliminates inline script injection risk. However, it requires theme modifications and server-side changes.

## Testing Your CSP

### Check CSP headers
```bash
curl -I https://eldraeverse.com | grep -i content-security-policy
```

### Monitor violations
Add CSP reporting to catch violations:
```
report-uri https://your-csp-reporting-service.com/collect
```

Services like Report-URI or TrialError provide CSP violation logging.

### Browser DevTools
1. Open DevTools (F12)
2. Go to Console tab
3. Look for CSP violation messages
4. Fix any legitimate resources showing as blocked

## Updating CSP When Adding New Features

When adding new external resources to the theme:

1. Test with permissive policy first
2. Check browser console for violations
3. Add new sources to appropriate directive (e.g., `img-src`, `script-src`)
4. Redeploy and test thoroughly
5. Never use `*` (wildcard) unless absolutely necessary

## References

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Checker Tool](https://csp-evaluator.withgoogle.com/)
- [TrialError CSP Violation Logger](https://report-uri.com/)
- [Caddy Documentation: Headers](https://caddyserver.com/docs/caddyfile/directives/header)
