# 020 — Shopping preset application

## Status

Accepted

## Context

A preset stores remembered products and quantities. Applying it to a shopping list has to be
repeatable, including stacking several presets in one request, without changing the preset or the
list's selected store profile.

## Decision

Applying presets is one transaction on an owned list. The request names one or more owned presets
and may repeat a preset, up to 20 names in one request. Matching uses the remembered product id
stored on each preset entry.
The merged quantities and the final set of rows are calculated before any list row is written.
If any product would exceed quantity 999, or the list would exceed 250 unique rows, the whole
application is rejected and usage stays unchanged.

A product already on the list keeps its row. Its quantity becomes the sum of the current quantity
and every applied entry. A new product is inserted. With no store profile, new products append
after the current rows and existing positions stay. With a store profile, new products are placed
by that profile's category order, after products already in the same category, and the list keeps
the same profile. The preset's own profile is not copied onto the list.

Each applied entry records one shopping-list usage event after the list write succeeds. The preset
rows are not updated.

## Consequences

- Reapplying a preset adds its quantities again and records usage again.
- A rejected application leaves the list, the preset, and usage statistics as they were.
- Store-profile display sorting of an existing list remains a separate behavior. This decision only
  places products introduced by the application.

## Alternatives considered

Copying the preset's store profile onto the list was rejected because applying products is not a
request to change how the list is sorted. Writing rows before the limit check was rejected because
a failure would leave a partial list.
