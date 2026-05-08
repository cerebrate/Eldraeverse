# Eldraeverse

Customized version of the Source theme for the Associated Worlds blog.

&nbsp;

# Random Post navigation

This theme supports an indirect **Random Post** nav entry via the `/random/` path.

To use it:
1. Create a Ghost page with slug `random` (it will automatically use `page-random.hbs`).
2. Add a navigation item in Ghost Admin pointing to `/random/`.

When clicked, the theme selects a random published post and redirects to it. It builds the candidate list from Ghost post sitemap URLs so older archive posts are included. If no published posts are available, it redirects to the homepage.

# Copyright & License

Original Source theme copyright (c) 2013-2023 Ghost Foundation - Released under the [MIT license](LICENSE).
Modifications copyright (c) 2024 Alistair J. R. Young. Same license.
