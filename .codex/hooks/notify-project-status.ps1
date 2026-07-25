[CmdletBinding()]
param(
    [switch] $DryRun,
    [switch] $CheckConfiguration
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$codexDirectory = Split-Path -Parent $PSScriptRoot
$diagnosticsDirectory = Join-Path $codexDirectory 'runtime'
$diagnosticsPath = Join-Path $diagnosticsDirectory 'project-status-notifications.jsonl'

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

function ConvertFrom-NestedJson {
    param(
        [AllowNull()]
        [object] $InputObject
    )

    if ($InputObject -isnot [string]) {
        return $InputObject
    }

    if ([string]::IsNullOrWhiteSpace($InputObject)) {
        return $null
    }

    try {
        return $InputObject | ConvertFrom-Json -ErrorAction Stop
    }
    catch {
        return $null
    }
}

function Test-GitHubProjectsWriteTool {
    param(
        [AllowNull()]
        [string] $ToolName
    )

    return $ToolName -eq 'mcp__github__projects_write' `
        -or $ToolName -match '(?i)(^|[_-])projects[_-]write$'
}

function Write-NotificationDiagnostic {
    param(
        [Parameter(Mandatory)]
        [string] $Outcome,

        [AllowNull()]
        [string] $IssueNumber,

        [AllowNull()]
        [string] $Status,

        [AllowNull()]
        [object] $IsMentionIncluded,

        [AllowNull()]
        [string] $ErrorType,

        [AllowNull()]
        [string] $HttpStatusCode
    )

    try {
        New-Item -ItemType Directory -Path $diagnosticsDirectory -Force | Out-Null

        $diagnosticEntry = [ordered] @{
            timestampUtc = [DateTimeOffset]::UtcNow.ToString('o')
            outcome      = $Outcome
        }

        if (-not [string]::IsNullOrWhiteSpace($IssueNumber)) {
            $diagnosticEntry['issueNumber'] = $IssueNumber
        }

        if (-not [string]::IsNullOrWhiteSpace($Status)) {
            $diagnosticEntry['status'] = $Status
        }

        if ($null -ne $IsMentionIncluded) {
            $diagnosticEntry['isMentionIncluded'] = [bool] $IsMentionIncluded
        }

        if (-not [string]::IsNullOrWhiteSpace($ErrorType)) {
            $diagnosticEntry['errorType'] = $ErrorType
        }

        if (-not [string]::IsNullOrWhiteSpace($HttpStatusCode)) {
            $diagnosticEntry['httpStatusCode'] = $HttpStatusCode
        }

        $diagnosticJson = $diagnosticEntry | ConvertTo-Json -Compress
        Add-Content -LiteralPath $diagnosticsPath -Value $diagnosticJson -Encoding UTF8
    }
    catch {
        # Diagnostics are best-effort and must never affect the task workflow.
    }
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

$webhookUrl = [Environment]::GetEnvironmentVariable(
    'NESTRA_DISCORD_WEBHOOK_URL',
    [EnvironmentVariableTarget]::Process
)
$discordUserId = [Environment]::GetEnvironmentVariable(
    'NESTRA_DISCORD_USER_ID',
    [EnvironmentVariableTarget]::Process
)

if ($CheckConfiguration) {
    $isWebhookConfigured = -not [string]::IsNullOrWhiteSpace($webhookUrl)
    $isWebhookValid = $false

    if ($isWebhookConfigured) {
        try {
            $webhookUri = [Uri] $webhookUrl
            $isWebhookValid = Test-DiscordWebhookUri -WebhookUri $webhookUri
        }
        catch {
            $isWebhookValid = $false
        }
    }

    $configurationStatus = [ordered] @{
        webhookConfigured     = $isWebhookConfigured
        webhookValid          = $isWebhookValid
        userMentionConfigured = -not [string]::IsNullOrWhiteSpace($discordUserId)
        userMentionValid      = $discordUserId -match '^\d{17,20}$'
        diagnosticsPath       = $diagnosticsPath
    }

    $configurationStatus | ConvertTo-Json -Compress
    exit 0
}

$hookPayloadText = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($hookPayloadText)) {
    Write-NotificationDiagnostic -Outcome 'ignored_empty_input'
    exit 0
}

try {
    $hookPayload = $hookPayloadText | ConvertFrom-Json -ErrorAction Stop
}
catch {
    Write-NotificationDiagnostic -Outcome 'ignored_invalid_json'
    exit 0
}

$hookEventName = [string] (Get-ObjectProperty -InputObject $hookPayload -Name 'hook_event_name')
$toolName = [string] (Get-ObjectProperty -InputObject $hookPayload -Name 'tool_name')

$isCodexHook = $hookEventName -eq 'PostToolUse' `
    -and $toolName -eq 'mcp__github__projects_write'
$isCursorHook = $hookEventName -eq 'afterMCPExecution' `
    -and (Test-GitHubProjectsWriteTool -ToolName $toolName)

if (-not $isCodexHook -and -not $isCursorHook) {
    Write-NotificationDiagnostic -Outcome 'ignored_unexpected_event'
    exit 0
}

$toolInput = ConvertFrom-NestedJson -InputObject (
    Get-ObjectProperty -InputObject $hookPayload -Name 'tool_input'
)

if ($isCursorHook) {
    $toolResponse = ConvertFrom-NestedJson -InputObject (
        Get-ObjectProperty -InputObject $hookPayload -Name 'result_json'
    )
    $agentName = 'Cursor Agent'
}
else {
    $toolResponse = Get-ObjectProperty -InputObject $hookPayload -Name 'tool_response'
    $agentName = 'Codex'
}

$itemOwner = [string] (Get-ObjectProperty -InputObject $toolInput -Name 'item_owner')
$itemRepository = [string] (Get-ObjectProperty -InputObject $toolInput -Name 'item_repo')
$issueNumber = [string] (Get-ObjectProperty -InputObject $toolInput -Name 'issue_number')

$responseIsError = Get-ObjectProperty -InputObject $toolResponse -Name 'isError'
$responseIsErrorAlias = Get-ObjectProperty -InputObject $toolResponse -Name 'is_error'
$responseError = [string] (Get-ObjectProperty -InputObject $toolResponse -Name 'error')
$responseWasRejected = Get-ObjectProperty -InputObject $toolResponse -Name 'rejected'
$responsePermissionDenied = Get-ObjectProperty -InputObject $toolResponse -Name 'permissionDenied'
if (
    $responseIsError -eq $true `
        -or $responseIsErrorAlias -eq $true `
        -or -not [string]::IsNullOrWhiteSpace($responseError) `
        -or $responseWasRejected -eq $true `
        -or $responsePermissionDenied -eq $true
) {
    Write-NotificationDiagnostic `
        -Outcome 'ignored_tool_error' `
        -IssueNumber $issueNumber
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
    Write-NotificationDiagnostic `
        -Outcome 'ignored_unrelated_update' `
        -IssueNumber $issueNumber
    exit 0
}

$status = switch ($requestedStatus) {
    'Review' { 'Review' }
    'Blocked' { 'Blocked' }
    'Done' { 'Done' }
    default { $null }
}

if ($null -eq $status) {
    Write-NotificationDiagnostic `
        -Outcome 'ignored_non_notifiable_status' `
        -IssueNumber $issueNumber
    exit 0
}

$projectUrl = 'https://github.com/users/michalrozek90/projects/1'

$notificationPrefix = ''
$allowedMentions = @{
    parse = @()
}
$isMentionIncluded = $false

if ($discordUserId -match '^\d{17,20}$') {
    $notificationPrefix = "<@$discordUserId> "
    $allowedMentions = @{
        users = @($discordUserId)
    }
    $isMentionIncluded = $true
}

$notificationSummary = if ($status -eq 'Done') {
    "${notificationPrefix}Nestra task is Done after merge (confirmed by $agentName)."
}
else {
    "${notificationPrefix}Nestra task moved to $status by $agentName."
}

$notificationLines = @($notificationSummary)

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
    username         = 'Nestra Agent'
    content          = $notificationLines -join "`n"
    allowed_mentions = $allowedMentions
}

$notificationJson = $notificationPayload | ConvertTo-Json -Depth 4 -Compress

Write-NotificationDiagnostic `
    -Outcome 'notification_matched' `
    -IssueNumber $issueNumber `
    -Status $status `
    -IsMentionIncluded $isMentionIncluded

if ($DryRun) {
    Write-NotificationDiagnostic `
        -Outcome 'dry_run_completed' `
        -IssueNumber $issueNumber `
        -Status $status `
        -IsMentionIncluded $isMentionIncluded
    $notificationJson
    exit 0
}

if ([string]::IsNullOrWhiteSpace($webhookUrl)) {
    Write-NotificationDiagnostic `
        -Outcome 'delivery_skipped_missing_webhook' `
        -IssueNumber $issueNumber `
        -Status $status `
        -IsMentionIncluded $isMentionIncluded
    exit 0
}

try {
    $webhookUri = [Uri] $webhookUrl
}
catch {
    Write-NotificationDiagnostic `
        -Outcome 'delivery_skipped_invalid_webhook' `
        -IssueNumber $issueNumber `
        -Status $status `
        -IsMentionIncluded $isMentionIncluded
    exit 0
}

if (-not (Test-DiscordWebhookUri -WebhookUri $webhookUri)) {
    Write-NotificationDiagnostic `
        -Outcome 'delivery_skipped_invalid_webhook' `
        -IssueNumber $issueNumber `
        -Status $status `
        -IsMentionIncluded $isMentionIncluded
    exit 0
}

try {
    [Net.ServicePointManager]::SecurityProtocol = (
        [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    )

    $requestBody = [Text.Encoding]::UTF8.GetBytes($notificationJson)

    Write-NotificationDiagnostic `
        -Outcome 'delivery_attempted' `
        -IssueNumber $issueNumber `
        -Status $status `
        -IsMentionIncluded $isMentionIncluded

    Invoke-RestMethod `
        -Uri $webhookUri.AbsoluteUri `
        -Method Post `
        -ContentType 'application/json; charset=utf-8' `
        -Body $requestBody `
        -TimeoutSec 10 | Out-Null

    Write-NotificationDiagnostic `
        -Outcome 'delivery_succeeded' `
        -IssueNumber $issueNumber `
        -Status $status `
        -IsMentionIncluded $isMentionIncluded
}
catch {
    $errorType = $_.Exception.GetType().FullName
    $httpStatusCode = $null
    $errorResponse = Get-ObjectProperty -InputObject $_.Exception -Name 'Response'

    if ($null -ne $errorResponse) {
        $responseStatusCode = Get-ObjectProperty -InputObject $errorResponse -Name 'StatusCode'
        if ($null -ne $responseStatusCode) {
            $httpStatusCode = [string] $responseStatusCode
        }
    }

    Write-NotificationDiagnostic `
        -Outcome 'delivery_failed' `
        -IssueNumber $issueNumber `
        -Status $status `
        -IsMentionIncluded $isMentionIncluded `
        -ErrorType $errorType `
        -HttpStatusCode $httpStatusCode

    # Notification delivery remains best-effort and cannot block the task workflow.
    exit 0
}
