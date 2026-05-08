function randomPost() {
    const randomPath = '/random/';
    const sitemapIndexPath = '/sitemap.xml';
    const sitemapPostsPath = '/sitemap-posts.xml';
    const homepage = `${window.location.origin}/`;

    const normalizePath = function (pathname) {
        if (!pathname) return '/';
        return pathname.endsWith('/') ? pathname : `${pathname}/`;
    };

    const isRandomPath = function (pathname) {
        return normalizePath(pathname) === randomPath;
    };

    const toSameOriginUrl = function (value) {
        if (!value) return null;

        try {
            const parsed = new URL(value, window.location.origin);
            if (parsed.origin !== window.location.origin) return null;
            return parsed.href;
        } catch (error) {
            return null;
        }
    };

    const fetchXmlDocument = async function (path) {
        const response = await fetch(path, {credentials: 'same-origin'});
        if (!response.ok) {
            throw new Error(`Failed to fetch ${path}: ${response.status}`);
        }

        const content = await response.text();
        return new DOMParser().parseFromString(content, 'application/xml');
    };

    const getNodeLoc = function (node) {
        const loc = node.getElementsByTagName('loc')[0];
        return loc ? loc.textContent.trim() : '';
    };

    const getPostSitemapUrls = async function () {
        let indexDocument = null;

        try {
            indexDocument = await fetchXmlDocument(sitemapIndexPath);
        } catch (error) {
            console.warn('Random Post: sitemap index unavailable, falling back to defaults.', error);
        }

        if (!indexDocument) {
            const fallback = toSameOriginUrl(sitemapPostsPath);
            return fallback ? [fallback] : [];
        }

        const sitemapUrls = Array.from(indexDocument.getElementsByTagName('sitemap'), function (node) {
            return toSameOriginUrl(getNodeLoc(node));
        }).filter(function (url) {
            return Boolean(url) && url.includes('/sitemap-posts');
        });

        if (!sitemapUrls.length) {
            const fallback = toSameOriginUrl(sitemapPostsPath);
            return fallback ? [fallback] : [];
        }

        return Array.from(new Set(sitemapUrls));
    };

    const getUrlsFromSitemap = async function (sitemapUrl) {
        const sitemapDocument = await fetchXmlDocument(sitemapUrl);

        return Array.from(sitemapDocument.getElementsByTagName('url'), function (node) {
            return toSameOriginUrl(getNodeLoc(node));
        }).filter(function (url) {
            if (!url) return false;
            return !isRandomPath(new URL(url).pathname);
        });
    };

    const getSitemapPostPool = async function () {
        const sitemapUrls = await getPostSitemapUrls();
        if (!sitemapUrls.length) return [];

        const responses = await Promise.allSettled(sitemapUrls.map(getUrlsFromSitemap));
        const merged = responses.flatMap(function (result) {
            return result.status === 'fulfilled' ? result.value : [];
        });

        return Array.from(new Set(merged));
    };

    const getCandidatePool = async function () {
        const sitemapPool = await getSitemapPostPool();
        return sitemapPool;
    };

    const getRandomTarget = function (urls) {
        const currentPath = normalizePath(window.location.pathname);
        const candidates = urls.filter(function (href) {
            const candidatePath = normalizePath(new URL(href, window.location.origin).pathname);
            return candidatePath !== currentPath;
        });
        const pool = candidates.length ? candidates : urls;
        const index = Math.floor(Math.random() * pool.length);
        return pool[index];
    };

    const navigateToRandomPost = async function () {
        const urls = await getCandidatePool();
        if (!urls.length) {
            window.location.assign(homepage);
            return;
        }

        window.location.assign(getRandomTarget(urls));
    };

    const shouldHandleRandomLink = function (link, event) {
        if (!link || link.target === '_blank' || link.hasAttribute('download')) return false;
        if (event.defaultPrevented || event.button !== 0) return false;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

        const destination = new URL(link.href, window.location.origin);
        if (destination.origin !== window.location.origin) return false;
        return isRandomPath(destination.pathname);
    };

    document.addEventListener('click', function (event) {
        const link = event.target.closest('a[href]');
        if (!shouldHandleRandomLink(link, event)) return;

        event.preventDefault();
        void navigateToRandomPost();
    });

    if (isRandomPath(window.location.pathname)) {
        void navigateToRandomPost();
    }
}
