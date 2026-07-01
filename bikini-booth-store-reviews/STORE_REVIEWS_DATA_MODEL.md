# Store Reviews — Data Model

This is the Shopify-side content layer for the Store Reviews page. Two **Metaobject**
definitions hold everything the storefront renders. Google credentials, OAuth tokens,
and internal Google location IDs **never** live here — only public-safe review data.

The storefront section (`sections/bb-store-reviews.liquid`) reads these metaobjects
directly through Liquid. The sync app writes the Google-sourced fields. Editorial fields
are written by humans (in the app or Admin) and **must never be overwritten by a sync**.

---

## Definition 1 — `bb_review_location`

One entry per physical store. Three entries: Phuket, Koh Samui, Koh Phangan.

| Field key            | Type                  | Written by | Notes |
|----------------------|-----------------------|------------|-------|
| `store_name`         | single_line_text      | human      | "Bikini Booth Phuket" |
| `store_key`          | single_line_text      | human      | stable handle, e.g. `phuket` — used for filter matching |
| `location_name`      | single_line_text      | human      | e.g. "Patong" |
| `city_island`        | single_line_text      | human      | "Phuket" / "Koh Samui" / "Koh Phangan" |
| `google_maps_url`    | url                   | human      | public Google Maps profile link |
| `google_rating`      | number_decimal        | **sync**   | e.g. 4.8 — do not edit by hand |
| `google_review_count`| number_integer        | **sync**   | total Google count — do not edit by hand |
| `last_synced_at`     | date_time             | **sync**   | last successful sync |
| `active`             | boolean               | human      | controls visibility + filter generation |
| `display_order`      | number_integer        | human      | column / filter order |
| `store_icon`         | file_reference        | human      | optional palm/island illustration |
| `cta_label`          | single_line_text      | human      | optional, e.g. "View on Google" override |

- **Display name key:** `store_name`
- `google_rating`, `google_review_count`, `last_synced_at` are sync-owned. The Theme
  Editor must not maintain these.

---

## Definition 2 — `bb_google_review`

One entry per imported real Google review.

| Field key             | Type                  | Written by | Survives sync? |
|-----------------------|-----------------------|------------|----------------|
| `external_review_id`  | single_line_text      | sync       | identity key   |
| `review_location`     | metaobject_reference → `bb_review_location` | sync (or human for CSV) | editorial if reassigned |
| `reviewer_display_name`| single_line_text     | sync       | refreshed      |
| `reviewer_initials`   | single_line_text      | sync/derived | refreshed     |
| `star_rating`         | number_integer (1–5)  | sync       | refreshed (original preserved) |
| `review_text`         | multi_line_text       | sync       | refreshed (full original kept) |
| `google_created_at`   | date_time             | sync       | refreshed      |
| `google_updated_at`   | date_time             | sync       | refreshed      |
| `date_display_label`  | single_line_text      | sync/human | e.g. "Reviewed March 2026" |
| `imported_at`         | date_time             | sync       | set once       |
| `google_review_url`   | url                   | **human**  | **never overwritten** |
| `direct_link_verified`| boolean               | **human**  | **never overwritten** |
| `approved`            | boolean               | **human**  | **never overwritten** |
| `featured`            | boolean               | **human**  | **never overwritten** |
| `display_order`       | number_integer        | **human**  | **never overwritten** |
| `sync_status`         | single_line_text      | sync       | `active` / `removed` / `updated` |
| `internal_notes`      | multi_line_text       | **human**  | **never overwritten**, never public |

- **Display name key:** `reviewer_display_name`
- `external_review_id` is the dedupe key. The sync upserts on this value.
- **Publish gate (enforced in Liquid):** a review renders publicly only when
  `approved == true` **AND** `direct_link_verified == true` **AND** `google_review_url`
  is present. Anything missing → stays imported but hidden.

---

## Creating the definitions (Admin GraphQL)

Run once against the Admin GraphQL API (`2025-01` or later) from the app, a script,
or the GraphiQL app. `bb_review_location` must exist before `bb_google_review`
(the reference field points at it).

### `bb_review_location`

```graphql
mutation {
  metaobjectDefinitionCreate(definition: {
    name: "Store Review Location"
    type: "bb_review_location"
    displayNameKey: "store_name"
    access: { storefront: PUBLIC_READ }
    fieldDefinitions: [
      { key: "store_name",          name: "Store name",          type: "single_line_text_field", required: true }
      { key: "store_key",           name: "Store key",           type: "single_line_text_field", required: true }
      { key: "location_name",       name: "Location name",       type: "single_line_text_field" }
      { key: "city_island",         name: "City / island",       type: "single_line_text_field" }
      { key: "google_maps_url",     name: "Google Maps URL",     type: "url" }
      { key: "google_rating",       name: "Google rating",       type: "number_decimal" }
      { key: "google_review_count", name: "Google review count", type: "number_integer" }
      { key: "last_synced_at",      name: "Last synced at",      type: "date_time" }
      { key: "active",              name: "Active",              type: "boolean" }
      { key: "display_order",       name: "Display order",       type: "number_integer" }
      { key: "store_icon",          name: "Store icon",          type: "file_reference" }
      { key: "cta_label",           name: "CTA label",           type: "single_line_text_field" }
    ]
  }) {
    metaobjectDefinition { id type }
    userErrors { field message code }
  }
}
```

### `bb_google_review`

Replace `gid://shopify/MetaobjectDefinition/XXXX` with the ID returned above.

```graphql
mutation {
  metaobjectDefinitionCreate(definition: {
    name: "Google Review"
    type: "bb_google_review"
    displayNameKey: "reviewer_display_name"
    access: { storefront: PUBLIC_READ }
    fieldDefinitions: [
      { key: "external_review_id",   name: "External Google review ID", type: "single_line_text_field", required: true }
      { key: "review_location",      name: "Review location",           type: "metaobject_reference",
        validations: [{ name: "metaobject_definition_id", value: "gid://shopify/MetaobjectDefinition/XXXX" }] }
      { key: "reviewer_display_name",name: "Reviewer display name",     type: "single_line_text_field" }
      { key: "reviewer_initials",    name: "Reviewer initials",         type: "single_line_text_field" }
      { key: "star_rating",          name: "Star rating",               type: "number_integer" }
      { key: "review_text",          name: "Review text",               type: "multi_line_text_field" }
      { key: "google_created_at",    name: "Google created at",         type: "date_time" }
      { key: "google_updated_at",    name: "Google updated at",         type: "date_time" }
      { key: "date_display_label",   name: "Date display label",        type: "single_line_text_field" }
      { key: "imported_at",          name: "Imported at",               type: "date_time" }
      { key: "google_review_url",    name: "Direct Google review URL",  type: "url" }
      { key: "direct_link_verified", name: "Direct link verified",      type: "boolean" }
      { key: "approved",             name: "Approved for storefront",   type: "boolean" }
      { key: "featured",             name: "Featured",                  type: "boolean" }
      { key: "display_order",        name: "Display order",             type: "number_integer" }
      { key: "sync_status",          name: "Sync status",               type: "single_line_text_field" }
      { key: "internal_notes",       name: "Internal notes",            type: "multi_line_text_field" }
    ]
  }) {
    metaobjectDefinition { id type }
    userErrors { field message code }
  }
}
```

> `internal_notes` is the only field that is intentionally **not** public. The storefront
> Liquid never reads it. (Storefront `PUBLIC_READ` exposes the whole entry, so do not put
> anything truly secret in any field here — none of the Google credential data belongs in
> metaobjects at all; it lives in the app's encrypted store.)

---

## Seed the three locations

```graphql
mutation {
  metaobjectCreate(metaobject: {
    type: "bb_review_location"
    handle: "phuket"
    fields: [
      { key: "store_name", value: "Bikini Booth Phuket" }
      { key: "store_key", value: "phuket" }
      { key: "city_island", value: "Phuket" }
      { key: "google_maps_url", value: "https://maps.google.com/..." }
      { key: "active", value: "true" }
      { key: "display_order", value: "1" }
    ]
  }) { metaobject { id handle } userErrors { field message } }
}
```

Repeat with `handle: "koh-samui"` (`store_key: koh-samui`, `display_order: 2`) and
`handle: "koh-phangan"` (`store_key: koh-phangan`, `display_order: 3`).

Leave `google_rating` / `google_review_count` / `last_synced_at` empty — the first sync
fills them.

---

## How the storefront reads this (Liquid reference)

```liquid
{%- comment -%} Locations {%- endcomment -%}
{%- for loc in shop.metaobjects.bb_review_location.values -%}
  {%- if loc.active.value -%}
    {{ loc.store_name }} · {{ loc.google_rating.value }} ({{ loc.google_review_count.value }})
  {%- endif -%}
{%- endfor -%}

{%- comment -%} Reviews — publish gate {%- endcomment -%}
{%- for r in shop.metaobjects.bb_google_review.values -%}
  {%- if r.approved.value and r.direct_link_verified.value and r.google_review_url != blank -%}
    {%- assign loc = r.review_location.value -%}
    {{ r.star_rating.value }} ★ — {{ r.reviewer_display_name }} — {{ loc.city_island }}
  {%- endif -%}
{%- endfor -%}
```

Ordering, filtering, and load-more are handled client-side (data attributes + lightweight
JS) so we avoid Liquid's metaobject-sort gotchas and keep it filter-aware.
