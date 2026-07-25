# Agent task notifications

Nestra uses a repository-level Codex `PostToolUse` hook to send a Discord
notification when Codex moves a GitHub Project item to either `Review` or
`Blocked`.

The hook runs immediately after the GitHub Projects MCP tool returns. It does
not poll GitHub, run a model, or consume agent tokens.

## Scope

The hook matches the `mcp__github__projects_write` tool and sends a notification
only when all of these conditions are true:

- the method is `update_project_item`;
- the project owner is `michalrozek90`;
- the project number is `1`;
- the updated field is `Status`;
- the new value is `Review` or `Blocked`;
- the tool response is not marked as an error.

Manual Project changes made in the GitHub UI and changes made by clients that do
not run Codex repository hooks are outside this mechanism.

## Configure Discord

1. Create a private Discord channel for Nestra task notifications.
2. In the channel settings, open **Integrations > Webhooks**, create a webhook,
   and copy its URL.
3. Store the URL in the Windows user environment variable
   `NESTRA_DISCORD_WEBHOOK_URL`. Do not put the URL in this repository, a
   `.env` file, a prompt, or an issue comment.
4. Enable Discord Developer Mode under **User Settings > Advanced**, right-click
   your own Discord user, and select **Copy User ID**.
5. Store the numeric ID in the Windows user environment variable
   `NESTRA_DISCORD_USER_ID`.
6. Restart the active Codex client so it inherits the updated environment. For
   Cursor, restart Cursor. For the Codex app or CLI, close all active Codex
   processes and start a new one.

The equivalent PowerShell command is shown below. Prefer the Windows environment
variable UI if you do not want the webhook URL in PowerShell history.

```powershell
[Environment]::SetEnvironmentVariable(
    'NESTRA_DISCORD_WEBHOOK_URL',
    '<discord-webhook-url>',
    [EnvironmentVariableTarget]::User
)

[Environment]::SetEnvironmentVariable(
    'NESTRA_DISCORD_USER_ID',
    '<discord-user-id>',
    [EnvironmentVariableTarget]::User
)
```

## Trust the hook

Codex skips new or modified repository command hooks until they are reviewed and
trusted.

From a Codex CLI session opened in the repository:

1. Run `/hooks`.
2. Locate `.codex/hooks.json`.
3. Review and trust the `PostToolUse` hook.
4. Start a new Codex conversation in Cursor.

Changing the hook definition or command invalidates the stored trust decision
and requires another review.

## Check the active process configuration

Run this command from the repository root:

```powershell
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass `
    -File .codex/hooks/notify-project-status.ps1 `
    -CheckConfiguration
```

The command reports only booleans and the local diagnostics path. It never
prints the webhook URL or Discord user ID. All four configuration booleans must
be `true` before testing delivery.

## Test message generation and Discord delivery

After setting the environment variables and restarting the active Codex client,
run this command from the repository root:

```powershell
@'
{
  "hook_event_name": "PostToolUse",
  "tool_name": "mcp__github__projects_write",
  "tool_input": {
    "method": "update_project_item",
    "owner": "michalrozek90",
    "project_number": 1,
    "item_owner": "michalrozek90",
    "item_repo": "nestra",
    "issue_number": 1,
    "updated_field": {
      "name": "Status",
      "value": "Review"
    }
  },
  "tool_response": {
    "isError": false
  }
}
'@ | powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass `
    -File .codex/hooks/notify-project-status.ps1 `
    -DryRun
```

This dry run validates input matching and message generation. It does not prove
that Codex loaded the hook or that Discord accepted the message.

Remove `-DryRun` to test Discord delivery directly. A successful direct
delivery still does not prove that Codex loaded and trusted the lifecycle hook.

## Test the complete lifecycle hook

An end-to-end test must originate from a real Codex tool call:

1. Run `/hooks`, review the current `.codex/hooks.json`, and trust it.
2. Start a new Codex conversation from the repository root.
3. Ask Codex explicitly to use the GitHub Projects integration to update a test
   item to `Review` or `Blocked`. Updating an item to its existing value is
   sufficient to exercise the hook without changing its visible status.
4. Confirm the Discord message and mention.
5. Inspect the latest diagnostic events:

```powershell
Get-Content .codex/runtime/project-status-notifications.jsonl -Tail 20
```

Expected final outcomes are `delivery_attempted` followed by
`delivery_succeeded`. `delivery_failed` includes only a safe exception type and
optional HTTP status code.

## Security and failure behavior

- The webhook URL is read only from the process environment.
- Only the numeric user ID from `NESTRA_DISCORD_USER_ID` can be mentioned.
- The script accepts only HTTPS Discord webhook URLs.
- Role, `@everyone`, and `@here` mentions are disabled.
- Safe diagnostic events are written to
  `.codex/runtime/project-status-notifications.jsonl`, which is ignored by Git.
- Diagnostics never contain the webhook URL, Discord user ID, notification
  body, tool response, or exception message.
- Malformed hook input, unrelated tool calls, failed GitHub calls, missing
  configuration, and Discord delivery failures are recorded without exposing
  secrets.
- Notification delivery never blocks or reverses a GitHub Project status
  update.
