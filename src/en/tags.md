---
layout: _layouts/items_list.njk
pagination:
    data: i18n_categories
    size: 1
    alias: tag
permalink: 'en/category/{{ tag.label | slugify }}/'
eleventyComputed:
    title: "Product's list for {{ tag.title[page.lang] }}"
---
