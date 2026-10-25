# 018 — Shopping preset snapshot

## Status

Accepted

## Context

A shopping preset is a reusable set of remembered products and quantities. It has to be applied
more than once without staying tied to a shopping list, while a later rename or category change of
a remembered product still has to show up everywhere that product is used.

## Decision

A preset belongs to the authenticated user. Its name is the entered text after trimming and
collapsing whitespace, with the typed case kept, and it contains 1–30 characters. Names are not
unique. A user can keep at most 20 presets, and each preset can keep at most 150 unique product
entries. Each entry stores the remembered product id, a quantity from 1 to 999, and the position
from the saved composition.

The composition is a snapshot. Changing a shopping list does not add, remove, or resize preset
entries, and editing a preset does not change lists that were filled from it earlier. The product
row stays shared, so a deliberate product rename or category change is visible through that
reference.

A preset may store one optional store-profile id owned by the same user. Saving that reference does
not change the last explicitly selected profile. Deleting the profile clears the reference and
leaves the preset in place, in the same transaction that clears list references.

## Consequences

- Applying a preset later can copy the saved products and quantities without reading a list.
- Remembered-product metadata has one owner, so presets cannot keep a stale name or category.
- Account deletion removes the user's presets through the user foreign key.
- Profile deletion cannot remove a preset that only used that profile as a default order.

## Alternatives considered

Copying the product name and category into each preset entry was rejected because a rename would
have to be repeated in every preset. Making a preset a live view of a list was rejected because
later list edits would change a composition the user had already saved.
