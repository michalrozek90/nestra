# 021 — Remembered product archive

## Status

Accepted

## Context

A person can remove a remembered product from suggestions. Lists and presets already point at that
product by id, and those references have to keep showing the current name and category. Typing or
selecting the same product later has to reuse the row. A global rename still cannot collide with
another remembered name.

## Decision

`shopping_products.archived_at` is null while the product belongs in suggestions. Archiving sets
that timestamp and leaves the row in place. The unique `(user_id, name_key)` index includes
archived rows, so the same normalized name cannot be inserted again.

The product list used for suggestions returns only rows with `archived_at` null. Shopping lists and
presets still join the product row, including archived products, so a rename or category change
stays visible everywhere that product is referenced.

Remembering the same name again clears `archived_at` and returns the existing row. It does not
change the stored name, category, or usage. Resolving that product onto a shopping list, applying
a preset that contains it, or starting a list from such a preset also clears `archived_at`. Those
list writes still record usage through the existing usage function. Renaming, recategorizing, and
editing a preset do not clear the archive and do not record usage.

A rename whose normalized name belongs to another of the same user's products is rejected. The
other row is left unchanged.

## Consequences

- Archived products disappear from suggestions and remain on existing lists and presets.
- Re-entering an archived name cannot create a second catalog row.
- A deliberate shopping-list add brings an archived product back into suggestions.
- Preset edits can keep an archived product without putting it back into suggestions.

## Alternatives considered

Deleting the product row was rejected because list and preset foreign keys cascade, so the entries
would disappear. A second active row with the same name was rejected because suggestions would then
show two products for one identity. Merging a conflicting rename into the other product was
rejected because it would retarget unrelated list and preset rows.
