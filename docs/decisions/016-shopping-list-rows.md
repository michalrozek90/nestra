# 016 — Shopping list rows and usage

## Status

Accepted

## Context

A shopping list stays available when it is empty, and each row is one remembered product with a
quantity from 1 to 999. A list can hold 250 unique products. Adding the same product again must
increase that row's quantity instead of creating another row, and that addition is one usage event
even when the quantity is greater than one.

## Decision

A list is owned by the authenticated user. Its name is the entered text after trimming and
collapsing whitespace, with the typed case kept, and it contains 1–40 characters. Two lists may use
the same name. Deleting a list removes its rows and leaves the remembered products in place.

Each row stores the remembered product id, a quantity, and a position. The product and position are
unique within the list. A new product is appended after the current last position. Adding a product
that is already on the list keeps that position and adds the incoming quantity. The sum cannot
exceed 999. The 250-row limit is checked while the list row is locked, and a database trigger
rejects an insert that would create the 251st row. Re-adding an existing product is still allowed
at that limit.

Adding a product by name remembers it when no equivalent name exists for that user. The category
sent with that name applies only to a newly remembered product. One call to
`recordShoppingListUsageWithManager` runs in the same transaction, whether the row is new or
merged. Renaming a list, changing only a future quantity control, or editing the catalog does not
call it.

The product foreign key cascades list rows so deleting an account cannot fail on that reference.
Archiving a remembered product must not delete the product row; that later action is what keeps the
product on existing lists.

## Consequences

- Empty lists remain stored and can be fetched after creation.
- `Jajka 12 sztuk` added twice becomes one row whose quantity is the sum.
- A list-level rename of a product, row removal, and +/- quantity edits belong to the later item
  mutation work and are not part of this list contract.
- Store sorting and manual reordering can use the stored position later without changing this row
  identity.

## Alternatives considered

Rejecting a second list with the same display name was rejected because the issue does not treat
the name as an identifier. Counting usage by quantity was rejected because each deliberate addition
is one event. Leaving the product foreign key as `RESTRICT` was rejected because account deletion
can remove products and list rows in either order.
