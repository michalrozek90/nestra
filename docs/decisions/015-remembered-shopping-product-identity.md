# 015 — Remembered shopping product identity

## Status

Accepted

## Context

Shopping categories now have stable ids. A remembered product has to belong to exactly one of
those categories, keep the text the person typed, and record shopping-list usage separately from
renames, category changes, and quantity edits. Lists and presets do not exist yet, so the usage
event needs one function they can call later.

## Decision

Each remembered product is a row owned by the authenticated user. The id is a UUID. The display
name is the full entered text after trimming and collapsing whitespace, with the typed case kept.
The name is not split into units or package size. It contains 1–30 characters. The comparison key
is `String.prototype.toLowerCase()` of that display name and may contain up to 60 characters,
because one Unicode character can expand into two. A user has at most one product per comparison
key.

The product references one category id. Omitting the category stores the built-in Other category.
Another user's custom category cannot be selected. Deleting a custom category, in the same
transaction, moves that user's products in the category to Other and then removes the category.
A database trigger performs the same reassignment, including when account deletion cascades the
category. The category foreign key is `ON DELETE RESTRICT`, so a category cannot disappear while
a product still points at it. Deleting the user cascades the product rows.

`usageCount` starts at 0 and `lastUsedAt` stays empty until a shopping-list addition.
`nextShoppingListUsage` adds one to the count and sets the timestamp to the addition time. It does
not receive a quantity. Creating, renaming, recategorizing, or editing a preset does not call it.
A later addition of the same product calls it again.

## Consequences

- Equivalent names such as `Milk` and `milk` cannot both exist for one user.
- `Jajka 12 sztuk` stays one product name.
- Shopping-list and preset application code must call `nextShoppingListUsage` inside the same
  transaction as the list write. Quantity controls must not call it.
- Store-profile rows still have to drop a deleted category in that same category-deletion
  transaction when those rows exist.
- Archiving a product is a later management behavior and is not part of this table yet.

## Alternatives considered

Parsing a quantity or package size out of the name was rejected because the typed text is the
whole product. Using the database collation for case-insensitive uniqueness was rejected for the
same reason as category names. Deleting products when their custom category disappears was
rejected because the product should remain and move to Other.
