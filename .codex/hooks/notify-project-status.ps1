[CmdletBinding()]
param(
    [switch] $DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-ObjectProperty {
    param(
        [AllowNull()]
        [object] $InputObject,

        [Parameter(Mandatory)]
        [string] $Name
    )

    if ($null -eq $InputObject) {
        return $null
    }

    $property = $InputObject.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }

    return $property.Value
}

function Test-DiscordWebhookUri {
    param(
        [Parameter(Mandatory)]
        [Uri] $WebhookUri
    )

    $allowedHosts = @(
        'discord.com',
        'canary.discord.com',
        'ptb.discord.com',
        'discordapp.com'
    )

    return $WebhookUri.Scheme -eq 'https' `
        -and $WebhookUri.Host -in $allowedHosts `
        -and $WebhookUri.AbsolutePath.StartsWith('/api/webhooks/', [StringComparison]::Ordinal)
}

$hookPayloadText = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($hookPayloadText)) {
    exit 0
}

try {
    $hookPayload = $hookPayloadText | ConvertFrom-Json -ErrorAction Stop
}
catch {
    exit 0
}

$hookEventName = [string] (Get-ObjectProperty -InputObject $hookPayload -Name 'hook_event_name')
$toolName = [string] (Get-ObjectProperty -InputObject $hookPayload -Name 'tool_name')

if ($hookEventName -ne 'PostToolUse' -or $toolName -ne 'mcp__github__projects_write') {
    exit 0
}

$toolInput = Get-ObjectProperty -InputObject $hookPayload -Name 'tool_input'
$toolResponse = Get-ObjectProperty -InputObject $hookPayload -Name 'tool_response'

$responseIsError = Get-ObjectProperty -InputObject $toolResponse -Name 'isError'
$responseIsErrorAlias = Get-ObjectProperty -InputObject $toolResponse -Name 'is_error'
if ($responseIsError -eq $true -or $responseIsErrorAlias -eq $true) {
    exit 0
}

$method = [string] (Get-ObjectProperty -InputObject $toolInput -Name 'method')
$projectOwner = [string] (Get-ObjectProperty -InputObject $toolInput -Name 'owner')
$projectNumber = [string] (Get-ObjectProperty -InputObject $toolInput -Name 'project_number')
$updatedField = Get-ObjectProperty -InputObject $toolInput -Name 'updated_field'
$fieldName = [string] (Get-ObjectProperty -InputObject $updatedField -Name 'name')
$requestedStatus = [string] (Get-ObjectProperty -InputObject $updatedField -Name 'value')

if (
    $method -ne 'update_project_item' `
        -or $projectOwner -ne 'michalrozek90' `
        -or $projectNumber -ne '1' `
        -or $fieldName -ne 'Status'
) {
    exit 0
}

$status = switch ($requestedStatus) {
    'Review' { 'Review' }
    'Blocked' { 'Blocked' }
    default { $null }
}

if ($null -eq $status) {
    exit 0
}

$itemOwner = [string] (Get-ObjectProperty -InputObject $toolInput -Name 'item_owner')
$itemRepository = [string] (Get-ObjectProperty -InputObject $toolInput -Name 'item_repo')
$issueNumber = [string] (Get-ObjectProperty -InputObject $toolInput -Name 'issue_number')
$projectUrl = 'https://github.com/users/michalrozek90/projects/1'
$discordUserId = [Environment]::GetEnvironmentVariable(
    'NESTRA_DISCORD_USER_ID',
    [EnvironmentVariableTarget]::Process
)

$notificationPrefix = ''
$allowedMentions = @{
    parse = @()
}

if ($discordUserId -match '^\d{17,20}$') {
    $notificationPrefix = "<@$discordUserId> "
    $allowedMentions = @{
        users = @($discordUserId)
    }
}

$notificationLines = @(
    "${notificationPrefix}Nestra task moved to $status by Codex."
)

if (
    -not [string]::IsNullOrWhiteSpace($itemOwner) `
        -and -not [string]::IsNullOrWhiteSpace($itemRepository) `
        -and -not [string]::IsNullOrWhiteSpace($issueNumber)
) {
    $issueUrl = "https://github.com/$itemOwner/$itemRepository/issues/$issueNumber"
    $notificationLines += "Issue #$issueNumber`: $issueUrl"
}
else {
    $notificationLines += $projectUrl
}

$notificationPayload = @{
    username         = 'Nestra Codex'
    content          = $notificationLines -join "`n"
    allowed_mentions = $allowedMentions
}

$notificationJson = $notificationPayload | ConvertTo-Json -Depth 4 -Compress

if ($DryRun) {
    $notificationJson
    exit 0
}

$webhookUrl = [Environment]::GetEnvironmentVariable(
    'NESTRA_DISCORD_WEBHOOK_URL',
    [EnvironmentVariableTarget]::Process
)

if ([string]::IsNullOrWhiteSpace($webhookUrl)) {
    exit 0
}

try {
    $webhookUri = [Uri] $webhookUrl
}
catch {
    exit 0
}

if (-not (Test-DiscordWebhookUri -WebhookUri $webhookUri)) {
    exit 0
}

try {
    [Net.ServicePointManager]::SecurityProtocol = (
        [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    )

    $requestBody = [Text.Encoding]::UTF8.GetBytes($notificationJson)

    Invoke-RestMethod `
        -Uri $webhookUri.AbsoluteUri `
        -Method Post `
        -ContentType 'application/json; charset=utf-8' `
        -Body $requestBody `
        -TimeoutSec 10 | Out-Null
}
catch {
    # Notification delivery is best-effort and must never block the task workflow.
    exit 0
}
