function dropdown() {
    const mediaQuery = window.matchMedia('(max-width: 767px)');

    const head = document.querySelector('.gh-navigation');
    const menu = head.querySelector('.gh-navigation-menu');
    const nav = menu?.querySelector('.nav');
    if (!nav) return;

    const logo = document.querySelector('.gh-navigation-logo');
    // Store original nav state by cloning the element structure
    const navClone = nav.cloneNode(true);

    if (mediaQuery.matches) {
        const items = nav.querySelectorAll('li');
        items.forEach(function (item, index) {
            item.style.transitionDelay = `${0.03 * (index + 1)}s`;
        });
    }

    const makeDropdown = function () {
        if (mediaQuery.matches) return;
        const submenuItems = [];

        while ((nav.offsetWidth + 64) > menu.offsetWidth) {
            if (nav.lastElementChild) {
                submenuItems.unshift(nav.lastElementChild);
                nav.lastElementChild.remove();
            } else {
                break;
            }
        }

        if (!submenuItems.length) {
            head.classList.add('is-dropdown-loaded');
            return;
        }

        const toggle = document.createElement('button');
        toggle.setAttribute('class', 'gh-more-toggle gh-icon-button');
        toggle.setAttribute('aria-label', 'More');
        
        // Create SVG icon using DOM methods instead of innerHTML
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 32 32');
        svg.setAttribute('fill', 'currentColor');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M21.333 16c0-1.473 1.194-2.667 2.667-2.667v0c1.473 0 2.667 1.194 2.667 2.667v0c0 1.473-1.194 2.667-2.667 2.667v0c-1.473 0-2.667-1.194-2.667-2.667v0zM13.333 16c0-1.473 1.194-2.667 2.667-2.667v0c1.473 0 2.667 1.194 2.667 2.667v0c0 1.473-1.194 2.667-2.667 2.667v0c-1.473 0-2.667-1.194-2.667-2.667v0zM5.333 16c0-1.473 1.194-2.667 2.667-2.667v0c1.473 0 2.667 1.194 2.667 2.667v0c0 1.473-1.194 2.667-2.667 2.667v0c-1.473 0-2.667-1.194-2.667-2.667v0z');
        svg.appendChild(path);
        toggle.appendChild(svg);

        const wrapper = document.createElement('div');
        wrapper.setAttribute('class', 'gh-dropdown');

        if (submenuItems.length >= 10) {
            head.classList.add('is-dropdown-mega');
            wrapper.style.gridTemplateRows = `repeat(${Math.ceil(submenuItems.length / 2)}, 1fr)`;
        } else {
            head.classList.remove('is-dropdown-mega');
        }

        submenuItems.forEach(function (child) {
            wrapper.appendChild(child);
        });

        toggle.appendChild(wrapper);
        nav.appendChild(toggle);

        const toggleRect = toggle.getBoundingClientRect();
        const documentCenter = window.innerWidth / 2;

        if (toggleRect.left < documentCenter) {
            wrapper.classList.add('is-left');
        }

        head.classList.add('is-dropdown-loaded');

        window.addEventListener('click', function (e) {
            if (head.classList.contains('is-dropdown-open')) {
                head.classList.remove('is-dropdown-open');
            } else if (toggle.contains(e.target)) {
                head.classList.add('is-dropdown-open');
            }
        });
    }

    imagesLoaded(logo, function () {
        makeDropdown();
    });

    window.addEventListener('load', function () {
        if (!logo) {
            makeDropdown();
        }
    });

    window.addEventListener('resize', function () {
        setTimeout(() => {
            // Restore nav to original state by cloning the stored structure
            while (nav.firstChild) {
                nav.removeChild(nav.firstChild);
            }
            const restoredClone = navClone.cloneNode(true);
            while (restoredClone.firstChild) {
                nav.appendChild(restoredClone.firstChild);
            }
            makeDropdown();
        }, 1);
    });
}
