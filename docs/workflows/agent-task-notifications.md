# Agent task notifications

Nestra uses repository-level Codex and Cursor hooks to send a Discord
notification when an agent moves a GitHub Project item to `Review`, `Blocked`,
or `Done`.

The Codex `PostToolUse` hook is configured in `.codex/hooks.json`. The Cursor
`afterMCPExecution` hook is configured in `.cursor/hooks.json`. Both run the
same notification script immediately after the GitHub Projects MCP tool
returns. They do not poll GitHub, run a model, or consume agent tokens.

## Scope

The script accepts the Codex `mcp__github__projects_write` tool name and Cursor
MCP tool names ending in `projects_write` or `projects-write`. It sends a
notification only when all of these conditions are true:

- the method is `update_project_item`;
- the project owner is `michalrozek90`;
- the project number is `1`;
- the updated field is `Status`;
- the new value is `Review`, `Blocked`, or `Done`;
- the tool response is not marked as an error.

Manual Project changes made in the GitHub UI and changes made by clients that do
not run either repository hook are outside this mechanism.

GitHub automation normally moves an item to `Done` after its pull request is
merged. Because that automation does not execute a client hook, the autonomous
agent workflow follows the merge with exactly one idempotent GitHub Projects
write setting the same item to `Done`. The write completes the transition when
automation did not do so and gives Codex or Cursor one observable tool event
when automation already completed it. The workflow addresses the item by
repository and issue number so the Discord message can link directly to the
issue.

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
6. Restart the active client so it inherits the updated environment. For
   Cursor, close all Cursor windows and start Cursor again. For another Codex
   client, close all active Codex processes and start a new one.

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

## Enable the hooks

Codex skips new or modified repository command hooks until they are reviewed and
trusted.

In the Codex extension inside Cursor:

1. Open the Codex panel settings.
2. Open **Hooks**.
3. Select the `nestra` project source.
4. Review and trust the `PostToolUse` hook.
5. Start a new Codex conversation.

Changing the hook definition or command invalidates the stored trust decision
and requires another review.

Cursor loads `.cursor/hooks.json` for the workspace. After adding or changing
that file, close all Cursor windows and start Cursor again before testing the
native Cursor Agent.

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

After setting the environment variables and restarting the active client, run
the relevant command from the repository root.

Codex payload:

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
      "value": "Done"
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

Cursor payload:

```powershell
@'
{
  "hook_event_name": "afterMCPExecution",
  "tool_name": "github-projects-write",
  "tool_input": "{\"method\":\"update_project_item\",\"owner\":\"michalrozek90\",\"project_number\":1,\"item_owner\":\"michalrozek90\",\"item_repo\":\"nestra\",\"issue_number\":1,\"updated_field\":{\"name\":\"Status\",\"value\":\"Done\"}}",
  "result_json": "{\"content\":[],\"isError\":false}"
}
'@ | powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass `
    -File .codex/hooks/notify-project-status.ps1 `
    -DryRun
```

This dry run validates Cursor's nested JSON payload format. It does not prove
that Cursor loaded the lifecycle hook.

Remove `-DryRun` to test Discord delivery directly. A successful direct
delivery still does not prove that the active client loaded its lifecycle hook.

## Test the complete lifecycle hooks

An end-to-end test must originate from a real GitHub Projects MCP tool call:

1. For Codex, review and trust `.codex/hooks.json` in the Codex panel's
   **Hooks** settings.
2. Restart Cursor and start a new conversation in the client being tested.
3. Ask the agent explicitly to use the GitHub Projects MCP integration to
   update a test item to `Review`, `Blocked`, or `Done`. Updating an item to its
   existing value is sufficient to exercise the hook without changing its
   visible status.
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
