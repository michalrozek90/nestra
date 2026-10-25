# 013 — Account deletion

## Status

Accepted

## Context

A signed-in person needs a permanent way to delete their Nestra account. The account can be created
with a password or only with Google, so a password prompt cannot cover every account. The access
token already identifies the caller, and the database deletes that user's refresh sessions, external
identities, bound external-auth transactions, and notes through foreign-key cascades. Reminders,
shopping data, server-side preferences, and queued notifications do not exist yet.

## Decision

Settings shows a separate Danger Zone at the bottom of the screen. Delete account asks the person
to type the confirmation phrase shown in the dialog. The deletion does not start unless that phrase
matches, including when the confirm control is invoked directly, and it does not require a second
sign-in. Later Danger Zone actions use the same typed confirmation. The API deletes the user id
from the verified access token and never accepts a client-supplied user id.

The client calls deletion before clearing local state. After the server confirms success, it clears
auth tokens and marks the observed session signed out before removing the rest of the query cache.
It then returns to the login screen and removes that user's note drafts. Removing the whole cache
first detaches the session observer, which keeps the previous user and leaves protected screens
mounted. A failed or unreachable request leaves the account and the local session in place. Device
language, appearance, and the last-seen What's New version stay, because they are device preferences
rather than account data.

An access token is honored only while its refresh session row still exists and is not revoked.
Deleting the account removes those rows, so previously issued access tokens stop working. A repeated
delete of an already-removed user is a no-op when it still reaches the deletion operation.

Future user-owned tables must cascade from `users` or be removed in the same deletion transaction.

## Consequences

- Google-only accounts can be deleted with the same confirmation as password accounts.
- A stolen access token can delete the account until that session is revoked or expires.
- Logout and account deletion both make the related access token unusable on the next request.
- Product areas that do not exist yet are not part of the deleted data set until they are added.
