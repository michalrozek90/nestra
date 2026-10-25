# 017 — Store sorting profile order

## Status

Accepted

## Context

A shopping list can follow the physical layout of a store. That layout is an order of category
ids, including the permanent Other category. The order has to survive a category rename, drop a
category when it is deleted, and stay private to the user who created the profile.

## Decision

A store profile belongs to the authenticated user. Its name is the entered text after trimming and
collapsing whitespace, with the typed case kept, and it contains 1–40 characters. The name is not
an identifier, so two profiles may use the same name.

Each profile stores every category the user can currently use: the global built-in categories and
that user's custom categories. Positions start at the same deterministic order as the category
list: built-in position, then custom comparison key, creation time, and id. Other is one of those
built-in categories and may later be moved to any position. A newly created custom category is
appended to every profile owned by that user. Deleting a custom category removes it from those
orders and closes the gap in positions, in the same transaction as the product reassignment.
Renaming a category does not change its id, so the stored positions stay in place.

The user has one last explicitly selected profile. Selecting a profile directly, or assigning it
to a shopping list, records that choice. Reading a profile, renaming it, reordering it, renaming
a list, or editing list quantities does not. Deleting the selected profile clears the choice.
Deleting a profile also clears shopping-list references to it and leaves those lists in place.
Preset references do not exist yet; when they do, the same deletion transaction must clear them
without deleting the presets.

## Consequences

- A new profile can sort a list before the user customizes it.
- Category identity stays stable across a rename, so store positions do not need to be rewritten.
- Account deletion removes the user's profiles through the user foreign key.
- Manual list ordering remains list-specific because no list mutation in this decision writes the
  global last-selected profile except an explicit profile assignment.
- The preset table still has to store an optional profile id and join the profile-deletion
  transaction.

## Alternatives considered

Storing the order as translated category labels was rejected because a language change or a rename
would break the layout. Making the last-selected profile change whenever a list is opened was
rejected because opening content is not an explicit choice. Cascading profile deletion into list
deletion was rejected because the list remains usable without a store layout.
