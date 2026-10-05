param(
    [string]$Distribution = 'Ubuntu',
    [string]$LinuxUser = 'lizhi',
    [string]$LinuxSourceRoot = '/home/lizhi/comp4020/comp4020-ass2-Naaeeen',
    [string]$ExpectedSourceCommit = '750f835079fbd761052bba857f3de3c8389c35e2',
    [string]$DestinationRoot = (Join-Path $PSScriptRoot '..\reference\a2')
)

$ErrorActionPreference = 'Stop'
$provenanceCode = 'import json,pathlib,subprocess; print(json.dumps({"root":str(pathlib.Path.cwd()),"head":subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip(),"status":subprocess.check_output(["git","status","--porcelain"],text=True)}))'
$provenanceRaw = & wsl.exe --distribution $Distribution --user $LinuxUser --cd $LinuxSourceRoot --exec python3 -c $provenanceCode
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the source repository through its Linux toolchain.' }
$provenance = ($provenanceRaw -join "`n") | ConvertFrom-Json
if ($provenance.head -ne $ExpectedSourceCommit) { throw 'The actual source HEAD does not match the expected pinned commit.' }
$SourceRoot = '\\wsl.localhost\' + $Distribution + $provenance.root.Replace('/', '\')
$sourceAbsolute = (Resolve-Path -LiteralPath $SourceRoot).Path
$destinationAbsolute = [System.IO.Path]::GetFullPath($DestinationRoot)
$workspaceAbsolute = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $destinationAbsolute.StartsWith($workspaceAbsolute + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'The reference destination must remain inside this project documentation workspace.'
}

# Exact allowlist: historical text and disabled code, no environment or raw traces.
$selected = @(
    'AGENTS.md', 'CLAUDE.md', 'PLAN.md', 'PROCESS.md', 'README.md',
    'package.json', 'mise.toml', '.gitignore', '.gitattributes',
    '.github/workflows/checks.yml', '.github/trufflehog.yml', '.githooks/pre-commit',
    'docs/IMPLEMENTATION-RESEARCH.md', 'docs/PROCESS-EVIDENCE.md',
    'docs/planning/requirements-audit.md', 'docs/planning/implementation-goals.md',
    'docs/planning/final-submission-audit.md', 'docs/planning/gate-3-review.md',
    'docs/planning/gate-4-plan.md', 'docs/planning/gate-4-review.md',
    'docs/planning/gate-2-source-ledger.md',
    'docs/harness-research/README.md', 'docs/harness-research/REPORT.md',
    'docs/harness-research/sources.md', 'docs/harness-research/baseline.CLAUDE.md.txt',
    'docs/harness-research/candidate-v1.CLAUDE.md.txt',
    'docs/harness-research/candidate-v2.CLAUDE.md.txt',
    'docs/harness-research/candidate-v3.CLAUDE.md.txt',
    'docs/harness-research/review-01.md', 'docs/harness-research/review-02-evaluation.md',
    'docs/harness-research/review-03-final.md', 'docs/harness-research/results-summary.json',
    'docs/harness-research/blind-review-protocol.md',
    'docs/harness-research/blind-review-r1.json', 'docs/harness-research/blind-review-final.json',
    'docs/harness-research/environment-control-amendment.md',
    'docs/harness-research/scope-control-amendment.md',
    'docs/harness-research/runner-control-calibration.json',
    'docs/harness-research/completion-audit.md',
    'docs/harness-research/eval/fixtures.py', 'docs/harness-research/eval/grader.py',
    'docs/harness-research/eval/run_trials.py', 'docs/harness-research/eval/protocol.json',
    'docs/review/process-comparison/README.md',
    'docs/review/process-comparison/protocol.json',
    'docs/review/process-comparison/criteria.json',
    'docs/review/process-comparison/research.md',
    'docs/review/process-comparison/technique-clarification.md',
    'docs/review/manifest.json', 'public/vendor-notices.txt',
    'scripts/check-evidence.ts', 'scripts/check-evidence.test.ts',
    'scripts/pages-base.ts', 'scripts/pages-base.test.ts',
    'spec/README.md', 'spec/support/built-deck-link.ts',
    'spec/support/built-deck-link.test.ts', 'spec/study-navigation.test.ts'
)

$renamed = @{
    'AGENTS.md' = 'AGENTS.source.md'
    'CLAUDE.md' = 'CLAUDE.source.md'
    'PLAN.md' = 'PLAN.source.md'
    'PROCESS.md' = 'PROCESS.source.md'
    'README.md' = 'README.source.md'
    'package.json' = 'package.source.json'
    'mise.toml' = 'mise.source.toml'
    '.gitignore' = 'gitignore.source.txt'
    '.gitattributes' = 'gitattributes.source.txt'
    '.github/workflows/checks.yml' = 'ci/checks.source.yml.txt'
    '.github/trufflehog.yml' = 'ci/trufflehog.source.yml.txt'
    '.githooks/pre-commit' = 'hooks/pre-commit.source.txt'
}

$records = @()
foreach ($relative in $selected) {
    $sourcePath = Join-Path $sourceAbsolute $relative
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        $records += [pscustomobject]@{source=$relative; status='MISSING'; destination=$null; sha256=$null}
        continue
    }
    $targetRelative = if ($renamed.ContainsKey($relative)) { $renamed[$relative] } else { $relative }
    if ($relative -match '\.(py|ts)$') { $targetRelative += '.source.txt' }
    if ($relative.EndsWith('/README.md')) { $targetRelative = $targetRelative.Replace('/README.md', '/README.source.md') }
    $targetPath = [System.IO.Path]::GetFullPath((Join-Path $destinationAbsolute $targetRelative))
    if (-not $targetPath.StartsWith($destinationAbsolute + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Reference path escaped the intended destination: $relative"
    }
    $sourceHash = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if (Test-Path -LiteralPath $targetPath) {
        if ((Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $sourceHash) {
            throw "Existing reference differs; refusing to overwrite: $targetRelative"
        }
    } else {
        New-Item -ItemType Directory -Path ([System.IO.Path]::GetDirectoryName($targetPath)) -Force | Out-Null
        Copy-Item -LiteralPath $sourcePath -Destination $targetPath
    }
    $targetHash = (Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($sourceHash -ne $targetHash) { throw "Reference hash mismatch: $relative" }
    $records += [pscustomobject]@{source=$relative; status='COPIED_VERIFIED_REFERENCE_ONLY'; destination=$targetRelative.Replace('\','/'); sha256=$sourceHash}
}

$provenanceAfterRaw = & wsl.exe --distribution $Distribution --user $LinuxUser --cd $LinuxSourceRoot --exec python3 -c $provenanceCode
if ($LASTEXITCODE -ne 0) { throw 'Could not verify source state after copying.' }
$provenanceAfter = ($provenanceAfterRaw -join "`n") | ConvertFrom-Json
if ($provenanceAfter.head -ne $provenance.head -or $provenanceAfter.status -ne $provenance.status) {
    throw 'The source repository changed during import; references need reconciliation before recording provenance.'
}
$manifest = [ordered]@{
    sourceRoot=$provenance.root
    sourceCommit=$provenance.head
    inspectedSourceStatus=$(if ([string]::IsNullOrWhiteSpace($provenance.status)) { 'clean' } else { 'dirty' })
    sourceStatusPorcelain=$provenance.status
    importedAtUtc=[DateTimeOffset]::UtcNow.ToString('o')
    importedOn=[TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTimeOffset]::UtcNow, 'AUS Eastern Standard Time').ToString('yyyy-MM-dd')
    purpose='Historical references for selectively adapted A3 methods; no scripts or permissions activated.'
    records=$records
    excluded=@('credentials/configuration', 'node_modules/build/cache', 'raw trials/traces/environment snapshots', 'A2 teaching data/media', 'active deployment/settings')
}
New-Item -ItemType Directory -Path $destinationAbsolute -Force | Out-Null
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $destinationAbsolute 'SOURCE-MANIFEST.json') -Encoding utf8
[pscustomobject]@{Copied=($records | Where-Object status -eq 'COPIED_VERIFIED_REFERENCE_ONLY').Count; Missing=($records | Where-Object status -eq 'MISSING').Count; Manifest=(Join-Path $destinationAbsolute 'SOURCE-MANIFEST.json')}
