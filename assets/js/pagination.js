function pagination(isInfinite = true, done, isMasonry = false) {
    const feedElement = document.querySelector('.gh-feed');
    if (!feedElement) return;

    let loading = false;
    const target = document.querySelector('.gh-footer');
    const buttonElement = document.querySelector('.gh-loadmore');

    if (!document.querySelector('link[rel=next]') && buttonElement) {
        buttonElement.remove();
    }

    // Validate that a URL is same-origin to prevent XSS via open redirect
    const isSameOrigin = function (url) {
        try {
            const urlObj = new URL(url, window.location.href);
            return urlObj.origin === window.location.origin;
        } catch (e) {
            return false;
        }
    };

    const loadNextPage = async function () {
        const nextElement = document.querySelector('link[rel=next]');
        if (!nextElement) return;

        // Validate URL before fetching
        if (!isSameOrigin(nextElement.href)) {
            console.error('Pagination: Invalid next link URL (not same-origin)');
            nextElement.remove();
            return;
        }

        try {
            const res = await fetch(nextElement.href);
            const html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const postElements = doc.querySelectorAll('.gh-feed:not(.gh-featured):not(.gh-related) > *');
            const fragment = document.createDocumentFragment();
            const elems = [];

            postElements.forEach(function (post) {
                var clonedItem = document.importNode(post, true);

                if (isMasonry) {
                    clonedItem.style.visibility = 'hidden';
                }

                fragment.appendChild(clonedItem);
                elems.push(clonedItem);
            });

            feedElement.appendChild(fragment);

            if (done) {
                done(elems, loadNextWithCheck);
            }

            const resNextElement = doc.querySelector('link[rel=next]');
            if (resNextElement && resNextElement.href) {
                // Validate the next URL from the fetched page as well
                if (isSameOrigin(resNextElement.href)) {
                    nextElement.href = resNextElement.href;
                } else {
                    console.error('Pagination: Invalid next link URL from page (not same-origin)');
                    nextElement.remove();
                }
            } else {
                nextElement.remove();
                if (buttonElement) {
                    buttonElement.remove();
                }
            }
        } catch (e) {
            nextElement.remove();
            throw e;
        }
    };

    const loadNextWithCheck = async function () {
        if (target.getBoundingClientRect().top <= window.innerHeight && document.querySelector('link[rel=next]')) {
            await loadNextPage();
        }
    }

    const callback = async function (entries) {
        if (loading) return;

        loading = true;

        if (entries[0].isIntersecting) {
            // keep loading next page until target is out of the viewport or we've loaded the last page
            if (!isMasonry) {
                while (target.getBoundingClientRect().top <= window.innerHeight && document.querySelector('link[rel=next]')) {
                    await loadNextPage();
                }
            } else {
                await loadNextPage();
            }
        }

        loading = false;

        if (!document.querySelector('link[rel=next]')) {
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
