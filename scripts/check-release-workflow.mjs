import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const workflowPath = path.join(repositoryRoot, '.github', 'workflows', 'release-please.yml');
const workflow = readFileSync(workflowPath, 'utf8');
const agentsInstructions = readFileSync(path.join(repositoryRoot, 'AGENTS.md'), 'utf8');
const releaseSkill = readFileSync(
  path.join(repositoryRoot, '.agents', 'skills', 'release', 'SKILL.md'),
  'utf8',
);
const releaseSkillMetadata = readFileSync(
  path.join(repositoryRoot, '.agents', 'skills', 'release', 'agents', 'openai.yaml'),
  'utf8',
);
const releaseWorkflow = readFileSync(
  path.join(repositoryRoot, 'docs', 'workflows', 'release-workflow.md'),
  'utf8',
);
const releaseDocumentation = readFileSync(
  path.join(repositoryRoot, 'docs', 'deployment', 'release.md'),
  'utf8',
);

function fail(message) {
  throw new Error(`Release workflow policy check failed: ${message}`);
}

function requireText(source, expected, scope) {
  if (!source.includes(expected)) {
    fail(`${scope} must contain ${JSON.stringify(expected)}.`);
  }
}

function jobSource(jobName, nextJobName) {
  const startMarker = `  ${jobName}:`;
  const start = workflow.indexOf(startMarker);

  if (start === -1) {
    fail(`workflow must define the ${jobName} job.`);
  }

  const end = nextJobName === undefined ? workflow.length : workflow.indexOf(`  ${nextJobName}:`);

  if (end === -1 || end <= start) {
    fail(`workflow job order is invalid after ${jobName}.`);
  }

  return workflow.slice(start, end);
}

requireText(workflow, '  workflow_dispatch:', 'workflow triggers');
requireText(workflow, '  push:', 'workflow triggers');
requireText(workflow, '  pull_request:', 'workflow triggers');
requireText(workflow, '      - closed', 'pull request trigger');
requireText(workflow, '      - opened', 'pull request trigger');
requireText(workflow, '      - synchronize', 'pull request trigger');
requireText(workflow, 'permissions: {}', 'default workflow permissions');
requireText(
  workflow,
  '${{ github.event.pull_request.number || github.ref }}',
  'workflow concurrency',
);

const ordinaryPullRequestJob = jobSource('allow-ordinary-pull-request', 'prepare-release-pr');
requireText(
  ordinaryPullRequestJob,
  "github.event.pull_request.head.ref != 'release-please--branches--main--components--nestra'",
  'allow-ordinary-pull-request',
);
requireText(ordinaryPullRequestJob, 'statuses: write', 'allow-ordinary-pull-request permissions');

const prepareJob = jobSource('prepare-release-pr', 'invalidate-stale-release-pr');
requireText(prepareJob, "if: github.event_name == 'workflow_dispatch'", 'prepare-release-pr');
requireText(prepareJob, 'skip-github-release: true', 'prepare-release-pr');
requireText(prepareJob, 'target-branch: main', 'prepare-release-pr');
requireText(prepareJob, 'refs/heads/${TARGET_BRANCH}', 'prepare-release-pr');
requireText(prepareJob, 'issues: write', 'prepare-release-pr permissions');

const invalidationJob = jobSource('invalidate-stale-release-pr', 'finalize-release');
requireText(invalidationJob, "if: github.event_name == 'push'", 'invalidate-stale-release-pr');
requireText(
  workflow,
  'RELEASE_CANDIDATE_STATUS: release-candidate/current-main',
  'workflow environment',
);

if (invalidationJob.includes('googleapis/release-please-action')) {
  fail('push-triggered invalidation must not run Release Please.');
}

const finalizationJob = jobSource('finalize-release');
for (const identityRequirement of [
  'github.event.pull_request.merged == true',
  "github.event.pull_request.base.ref == 'main'",
  "github.event.pull_request.head.ref == 'release-please--branches--main--components--nestra'",
  "github.event.pull_request.user.login == 'github-actions[bot]'",
  "contains(github.event.pull_request.labels.*.name, 'autorelease: pending')",
  'checks: read',
  '.name == "Quality gate" or .name == "API persistence"',
  'skip-github-pull-request: true',
  'EXPECTED_RELEASE_SHA: ${{ github.event.pull_request.merge_commit_sha }}',
]) {
  requireText(finalizationJob, identityRequirement, 'finalize-release');
}

for (const instructionRequirement of [
  '### Autonomous release workflow',
  "the first non-empty line of the user's current message is exactly `/release`",
  'Treat either form as authorization for the complete scoped release lifecycle',
  'docs/workflows/release-workflow.md',
  '.agents/skills/release/',
]) {
  requireText(agentsInstructions, instructionRequirement, 'AGENTS.md release policy');
}

requireText(releaseSkill, 'name: release', 'release skill frontmatter');
requireText(
  releaseSkill,
  'only after an explicit `/release` command',
  'release skill invocation policy',
);
requireText(releaseSkill, 'Read `docs/workflows/release-workflow.md`', 'release skill delegation');
requireText(releaseSkillMetadata, 'allow_implicit_invocation: false', 'release skill metadata');

for (const workflowRequirement of [
  '## Invocation and authorization',
  '## 1. Reconstruct the release state',
  '**Nothing to release:**',
  '**Preparation in progress:**',
  '**Finalization in progress:**',
  '**Draft in progress:**',
  '**Already published:**',
  'release-please--branches--main--components--nestra',
  'release-candidate/current-main',
  '## 3. Review the candidate',
  '## 5. Validate updater assets',
  'Publish the exact validated draft release by its immutable release ID.',
  'confirmation: the explicit `/release` invocation already authorized this step.',
  'Never convert uncertainty into a second release.',
]) {
  requireText(releaseWorkflow, workflowRequirement, 'autonomous release workflow');
}

for (const documentationRequirement of [
  'invoke `/release` in Cursor Agent Chat or',
  'select `$release` in Codex',
  'A repeated `/release` resumes the same release or completes as',
  'a no-op',
  'does not require a separate manual test of the generated Release Please pull',
]) {
  requireText(releaseDocumentation, documentationRequirement, 'release documentation');
}

console.log('Release workflow policy checks passed.');
