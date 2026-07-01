Bikini Booth — Store Reviews page bundle
========================================

WHERE EACH FILE GOES (copy into mopoan/bikini-booth-theme, branch Production):

  sections/bb-store-reviews.liquid        -> theme  (the page section)
  snippets/bb-store-reviews-icon.liquid   -> theme  (icons the section renders)
  templates/page.store-reviews.json       -> theme  (binds section to /pages/store-reviews)

  STORE_REVIEWS_DATA_MODEL.md             -> NOT a theme file. Reference/docs only.
                                             Keep in repo root or /docs. Do not push to theme.

The folders above already match the theme structure — drop them straight into the repo root
and let them merge into your existing sections/, snippets/, templates/ folders.

NO assets needed: the palm + shell are inlined SVGs in the snippet. The hero store photo is
set later via Theme Editor > Hero image (not a committed file).

DEPLOY (from the repo, on Production):

  shopify theme push --only sections/bb-store-reviews.liquid snippets/bb-store-reviews-icon.liquid templates/page.store-reviews.json

ORDER OF OPERATIONS:
  1. Push the three theme files (above).
  2. Create the two metaobject definitions + seed the 3 stores (see STORE_REVIEWS_DATA_MODEL.md).
  3. Add at least one review that is approved + direct_link_verified + has a google_review_url.
  The reviews grid shows its empty-state message until step 3 is done — that's expected.

SUGGESTED COMMITS:
  section:  feat(store-reviews): add bb-store-reviews section (hero, rating panel, reviews, CTA, values)
  snippet:  feat(store-reviews): add bb-store-reviews-icon snippet with brand palm/shell/starfish/wave
  template: feat(store-reviews): bind bb-store-reviews section to /pages/store-reviews
