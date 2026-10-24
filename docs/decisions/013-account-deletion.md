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

Settings shows a separate Danger Zone. Delete account asks for confirmation and does not require a
second sign-in. The API deletes the user id from the verified access token and never accepts a
client-supplied user id.

The client calls deletion before clearing local state. After the server confirms success, it removes
auth tokens, that user's note drafts, and the in-memory query cache, then returns to the login
screen. A failed or unreachable request leaves the account and the local session in place. Device
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
