# 019 — Shopping list item identity

## Status

Accepted

## Context

A shopping list row points at a remembered product. Changing the words on one row has to stay on
that list. It must not rename the catalog product, and it must not rewrite other lists or presets
that still use the original product.

## Decision

Setting a list row's quantity replaces that quantity. The new value stays between 1 and 999.
Changing only the quantity does not record shopping usage.

Changing the product name on a list row resolves the remembered product by the same normalized name
used for the catalog. An existing match is reused and is not renamed or recategorized. A name with
no match creates a new remembered product. The edited row then points at that product. When the
destination product is already on the same list, the rows merge by summing quantity and the edited
row is removed. A sum above 999 is rejected and both rows stay. A merge at the 250-row limit is
allowed because it does not add a row.

Removing a row deletes only that list entry. The remembered product remains.

## Consequences

- Two lists can show different names for what used to be one row without splitting the catalog
  identity of the untouched list.
- Presets keep the product they stored, because a list edit does not rewrite product metadata.
- Usage still counts a deliberate add, not a quantity edit or a list-only rename.

## Alternatives considered

Renaming the remembered product from the list was rejected because every other list and preset
would change with it. Keeping both rows after a name collision was rejected because a list cannot
contain the same remembered product twice.
