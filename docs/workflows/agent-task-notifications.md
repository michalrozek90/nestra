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
6. Restart Cursor so the Codex extension inherits the updated environment.

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

## Test the notification

After setting the environment variable and restarting the terminal or Cursor,
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
    -File .codex/hooks/notify-project-status.ps1
```

Add `-DryRun` to print the Discord request body without sending it.

## Security and failure behavior

- The webhook URL is read only from the process environment.
- Only the numeric user ID from `NESTRA_DISCORD_USER_ID` can be mentioned.
- The script accepts only HTTPS Discord webhook URLs.
- Role, `@everyone`, and `@here` mentions are disabled.
- Malformed hook input, unrelated tool calls, failed GitHub calls, missing
  configuration, and Discord delivery failures are ignored.
- Notification delivery never blocks or reverses a GitHub Project status
  update.
