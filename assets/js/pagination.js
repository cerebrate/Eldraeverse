function pagination(isInfinite = true, done, isMasonry = false) {
    const feedElement = document.querySelector('.gh-feed');
    if (!feedElement) return;

    let loading = false;
    const target = document.querySelector('.gh-footer');
    const buttonElement = document.querySelector('.gh-loadmore');
    const nextLinkElement = document.querySelector('link[rel=next]');
    const loadedPageUrls = new Set();
    const maxInvalidPageSkips = 3;
    let nextPageUrl = nextLinkElement ? nextLinkElement.href : null;

    if (!target) return;

    if (!nextPageUrl && buttonElement) {
        buttonElement.remove();
    }

    const hasNextPage = function () {
        return Boolean(nextPageUrl);
    };

    const clearPagination = function () {
        nextPageUrl = null;
        if (nextLinkElement) {
            nextLinkElement.remove();
        }
        if (buttonElement) {
            buttonElement.remove();
        }
    };

    // Validate that a URL is same-origin to prevent XSS via open redirect
    const isSameOrigin = function (url) {
        try {
            const urlObj = new URL(url, window.location.href);
            return urlObj.origin === window.location.origin;
        } catch (e) {
            return false;
        }
    };

    const getFallbackCandidate = function (url) {
        try {
            const urlObj = new URL(url, window.location.href);
            const pathMatch = urlObj.pathname.match(/^(.*\/page\/)(\d+)\/?$/);
            if (!pathMatch) {
                return null;
            }

            const nextPageNumber = Number.parseInt(pathMatch[2], 10) + 1;
            urlObj.pathname = `${pathMatch[1]}${nextPageNumber}/`;
            urlObj.search = '';
            urlObj.hash = '';

            return urlObj.href;
        } catch (e) {
            return null;
        }
    };

    const fetchPageData = async function (url) {
        // Validate URL before fetching
        if (!isSameOrigin(url)) {
            console.error('Pagination: Invalid next link URL (not same-origin)');
            return null;
        }

        const res = await fetch(url);
        const html = await res.text();
        const finalUrl = res.url || url;

        if (!isSameOrigin(finalUrl)) {
            console.error('Pagination: Redirected to invalid URL (not same-origin)');
            return null;
        }

        // Extract the next link from raw HTML BEFORE sanitizing
        // This preserves pagination metadata even if sanitization is strict
        const tempParser = new DOMParser();
        const tempDoc = tempParser.parseFromString(html, 'text/html');
        const nextLinkFromPage = tempDoc.querySelector('link[rel=next]');
        let nextPageUrlFromMeta = null;
        const bodyClassList = tempDoc.body ? tempDoc.body.classList : null;
        const isArchiveContext = bodyClassList && (
            bodyClassList.contains('tag-template') ||
            bodyClassList.contains('author-template') ||
            bodyClassList.contains('paged')
        );
        if (nextLinkFromPage && nextLinkFromPage.href) {
            nextPageUrlFromMeta = nextLinkFromPage.href;
        }

        // Sanitize HTML before parsing to prevent XSS via malicious content
        // Use a permissive whitelist to preserve Ghost theme structure
        const sanitizedHtml = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['div', 'article', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'img', 'strong', 'em', 'ul', 'ol', 'li', 'span', 'section', 'header', 'footer', 'figure', 'figcaption'],
            ALLOWED_ATTR: ['src', 'alt', 'href', 'class', 'id', 'width', 'height', 'loading', 'style']
        });
        const parser = new DOMParser();
        const doc = parser.parseFromString(sanitizedHtml, 'text/html');
        const postElements = isArchiveContext
            ? doc.querySelectorAll('.gh-feed:not(.gh-featured):not(.gh-related) > article.gh-card')
            : [];

        return {
            finalUrl,
            nextPageUrlFromMeta,
            postElements
        };
    };

    const createSkipMarker = function (skippedCandidates) {
        if (!skippedCandidates.length) {
            return null;
        }

        const article = document.createElement('article');
        article.className = 'gh-card gh-pagination-marker no-image';
        article.setAttribute('data-skipped-pages', String(skippedCandidates.length));

        const cardLink = document.createElement('div');
        cardLink.className = 'gh-card-link';

        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'gh-card-wrapper';

        const title = document.createElement('h3');
        title.className = 'gh-card-title is-title';
        title.textContent = 'Archive pagination skipped one or more invalid intermediate pages';

        const excerpt = document.createElement('p');
        excerpt.className = 'gh-card-excerpt is-body';
        excerpt.textContent = 'A pagination URL resolved to non-archive content and was skipped. Older posts may be missing until the upstream redirect is fixed.';

        const details = document.createElement('p');
        details.className = 'gh-pagination-marker-urls';
        details.textContent = skippedCandidates.join(' -> ');

        cardWrapper.appendChild(title);
        cardWrapper.appendChild(excerpt);
        cardWrapper.appendChild(details);
        cardLink.appendChild(cardWrapper);
        article.appendChild(cardLink);

        return article;
    };

    const loadNextPage = async function () {
        if (!hasNextPage()) return;

        let candidateUrl = nextPageUrl;
        let invalidPageCount = 0;
        const skippedCandidates = [];

        while (candidateUrl && invalidPageCount <= maxInvalidPageSkips) {
            let pageData = null;
            try {
                pageData = await fetchPageData(candidateUrl);
            } catch (e) {
                pageData = null;
            }

            const fallbackCandidate = getFallbackCandidate(candidateUrl);
            const hasValidPosts = pageData && pageData.postElements.length > 0;

            if (!hasValidPosts) {
                invalidPageCount += 1;
                const skippedPath = pageData && pageData.finalUrl !== candidateUrl
                    ? `${new URL(candidateUrl).pathname} -> ${new URL(pageData.finalUrl).pathname}`
                    : new URL(candidateUrl).pathname;
                skippedCandidates.push(skippedPath);

                if (pageData && pageData.finalUrl !== candidateUrl) {
                    console.warn('Pagination: Next archive page redirected to non-feed URL; skipping candidate', candidateUrl, pageData.finalUrl);
                } else {
                    console.warn('Pagination: Next archive page did not return feed posts; skipping candidate', candidateUrl);
                }

                if (invalidPageCount > maxInvalidPageSkips || !fallbackCandidate || loadedPageUrls.has(fallbackCandidate)) {
                    const markerOnly = createSkipMarker(skippedCandidates);
                    if (markerOnly) {
                        feedElement.appendChild(markerOnly);
                    }
                    console.error('Pagination: Too many invalid archive pages in sequence; stopping pagination');
                    clearPagination();
                    return;
                }

                candidateUrl = fallbackCandidate;
                nextPageUrl = fallbackCandidate;
                if (nextLinkElement) {
                    nextLinkElement.href = fallbackCandidate;
                }
                continue;
            }

            const fragment = document.createDocumentFragment();
            const elems = [];

            pageData.postElements.forEach(function (post) {
                var clonedItem = document.importNode(post, true);

                if (isMasonry) {
                    clonedItem.style.visibility = 'hidden';
                }

                fragment.appendChild(clonedItem);
                elems.push(clonedItem);
            });

            const marker = createSkipMarker(skippedCandidates);
            if (marker) {
                feedElement.appendChild(marker);
            }

            feedElement.appendChild(fragment);
            loadedPageUrls.add(candidateUrl);

            if (done) {
                done(elems, loadNextWithCheck);
            }

            if (pageData.nextPageUrlFromMeta && isSameOrigin(pageData.nextPageUrlFromMeta) && !loadedPageUrls.has(pageData.nextPageUrlFromMeta)) {
                nextPageUrl = pageData.nextPageUrlFromMeta;
                if (nextLinkElement) {
                    nextLinkElement.href = pageData.nextPageUrlFromMeta;
                }
            } else {
                clearPagination();
            }
            return;
        }
        clearPagination();
    };

    const loadNextWithCheck = async function () {
        if (target.getBoundingClientRect().top <= window.innerHeight && hasNextPage()) {
            await loadNextPage();
        }
    }

    const callback = async function (entries) {
        if (loading) return;

        loading = true;

        if (entries[0].isIntersecting) {
            // keep loading next page until target is out of the viewport or we've loaded the last page
            if (!isMasonry) {
                while (target.getBoundingClientRect().top <= window.innerHeight && hasNextPage()) {
                    await loadNextPage();
                }
            } else {
                await loadNextPage();
            }
        }

        loading = false;

        if (!hasNextPage()) {
            observer.disconnect();
        }
    };

    const observer = new IntersectionObserver(callback);

    if (isInfinite) {
        observer.observe(target);
    } else {
        buttonElement.addEventListener('click', loadNextPage);
    }
}
