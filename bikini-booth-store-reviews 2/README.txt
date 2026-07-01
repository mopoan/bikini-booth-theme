Bikini Booth — Store Reviews page bundle
========================================

FILE PLACEMENT (copy into mopoan/bikini-booth-theme, branch Production):

  sections/bb-store-reviews.liquid        -> theme
  snippets/bb-store-reviews-icon.liquid   -> theme
  templates/page.store-reviews.json       -> theme

  STORE_REVIEWS_DATA_MODEL.md             -> docs only (do not push to theme)

This build reads your live metaobjects: types store_review_location + google_review.
No assets needed (palm/shell inlined). Hero photo is set in Theme Editor > Hero image.

DEPLOY (from repo, on Production):
  shopify theme push --only sections/bb-store-reviews.liquid snippets/bb-store-reviews-icon.liquid templates/page.store-reviews.json

ORDER:
  1. Push these three theme files.
  2. Seed the 3 stores (Content > Metaobjects > Store Review Location > Add entry).
  3. Add at least one review that is Approved for storefront = true, Direct link verified = true,
     and has a Direct Google review URL. Until then the reviews grid shows its empty state.
