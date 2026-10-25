# 014 — Shopping category identity

## Status

Accepted

## Context

Shopping starts with categories because every later remembered product, store profile, list, and
preset needs one stable category identity. Display text cannot be that identity: built-in labels
exist in Polish and English, and users can rename a custom category without moving it inside a
store profile. Account deletion already requires future user-owned rows to cascade from `users`
or to be removed in the same transaction (ADR 013). Remembered products, store profiles, lists,
and presets do not exist yet.

## Decision

Built-in categories are global rows. Each one has a stable UUID and a stable key (`fruit_and_vegetables`,
`bakery`, `dairy`, `meat`, `frozen`, `beverages`, `household`, `cosmetics`, `other`). Translated
labels live in the shared contract, not in the database, so changing language does not change the
row. `other` is one of those built-in rows. Its id is `SHOPPING_OTHER_CATEGORY_ID`.

Custom categories belong to the authenticated user. The access token supplies that user id. A
custom name is stored as display text: trim the ends, collapse internal whitespace to a single
space, and keep the typed case. The comparison key is `String.prototype.toLowerCase()` of that
display text, which uses Unicode default case mapping rather than the database collation. That
mapping can expand one character into two, so the stored comparison key allows 80 characters while
the display name still contains 1–40 characters. A user
can have only one custom category per comparison key.
Deleting the user cascades that user's custom categories and leaves the built-in rows in place.

Built-in rows cannot be renamed or deleted. The service rejects those mutations, and a database
trigger rejects direct updates and deletes of `kind = 'built_in'`.

Later Shopping tables follow this boundary:

- a remembered product references exactly one category id and is never stored without one;
- a new product uses the built-in Other category until the user chooses another;
- lists and presets reference the remembered product, so a category change on that product is
  visible everywhere the product is referenced;
- renaming a category keeps its id, so store-profile positions that reference the id stay put;
- deleting a custom category, in the same transaction, reassigns its remembered products to Other,
  removes that category from every store-profile order, and only then deletes the category row.

Those later tables are not part of this decision's migration. The custom-category delete
transaction is the place they must join.

## Consequences

- Clients can show Polish and English built-in labels from one catalog without treating the label
  as an identifier.
- Custom category names stay user content and are not localized.
- Category deletion cannot leave a built-in row missing, including Other.
- Product, list, preset, and store-profile behavior still has to be implemented on this boundary
  and checked again when those tables exist.
- Adding another built-in category requires a new migration and a contract change. Existing
  built-in ids do not change.

## Alternatives considered

Using the translated label as the category id was rejected because Polish and English would become
different categories. Copying the built-in catalog into every user account was rejected because
the ids would no longer be global and language-independent. A case-insensitive unique index based
on PostgreSQL `lower()` was rejected because its result depends on database collation and could
diverge from the shared comparison key.
