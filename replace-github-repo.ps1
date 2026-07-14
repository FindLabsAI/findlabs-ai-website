param(
  [string]$Owner = "FindLabsAI",
  [string]$Repo = "findlabs-ai-website",
  [string]$Branch = "main",
  [string]$SourceDir = "C:\Users\Anurag\Documents\Hire_AI_Employee\findlabs-ai-employee-github-upload",
  [string]$CommitMessage = "Replace old website with FindLabs AI employee site"
)

$ErrorActionPreference = "Stop"

if (-not $env:GITHUB_TOKEN) {
  throw "Set GITHUB_TOKEN first. Example: `$env:GITHUB_TOKEN='your_token_here'"
}

if (-not (Test-Path -LiteralPath $SourceDir)) {
  throw "SourceDir does not exist: $SourceDir"
}

$headers = @{
  Authorization = "Bearer $env:GITHUB_TOKEN"
  Accept = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

function Invoke-GitHub {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null
  )

  $uri = "https://api.github.com$Path"
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
  }

  $json = $Body | ConvertTo-Json -Depth 20
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body $json
}

Write-Host "Reading repository branch ${Owner}/${Repo}:${Branch}"
$ref = Invoke-GitHub -Method GET -Path "/repos/$Owner/$Repo/git/ref/heads/$Branch"
$parentSha = $ref.object.sha
$parentCommit = Invoke-GitHub -Method GET -Path "/repos/$Owner/$Repo/git/commits/$parentSha"

$excludedDirs = @("node_modules", "data", ".git")
$excludedFiles = @(".env", "employee-requests.json")
$files = Get-ChildItem -LiteralPath $SourceDir -Recurse -File -Force | Where-Object {
  $relative = $_.FullName.Substring($SourceDir.Length).TrimStart("\", "/")
  $parts = $relative -split "[\\/]"
  -not ($parts | Where-Object { $excludedDirs -contains $_ }) -and
  -not ($excludedFiles -contains $_.Name)
}

if (-not $files.Count) {
  throw "No files found to upload."
}

Write-Host "Uploading $($files.Count) files as Git blobs"
$tree = @()
foreach ($file in $files) {
  $relativePath = $file.FullName.Substring($SourceDir.Length).TrimStart("\", "/") -replace "\\", "/"
  $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
  $content = [Convert]::ToBase64String($bytes)
  $blob = Invoke-GitHub -Method POST -Path "/repos/$Owner/$Repo/git/blobs" -Body @{
    content = $content
    encoding = "base64"
  }

  $tree += @{
    path = $relativePath
    mode = "100644"
    type = "blob"
    sha = $blob.sha
  }
}

Write-Host "Creating replacement tree"
$newTree = Invoke-GitHub -Method POST -Path "/repos/$Owner/$Repo/git/trees" -Body @{
  tree = $tree
}

Write-Host "Creating commit"
$newCommit = Invoke-GitHub -Method POST -Path "/repos/$Owner/$Repo/git/commits" -Body @{
  message = $CommitMessage
  tree = $newTree.sha
  parents = @($parentSha)
}

Write-Host "Updating branch ref"
Invoke-GitHub -Method PATCH -Path "/repos/$Owner/$Repo/git/refs/heads/$Branch" -Body @{
  sha = $newCommit.sha
  force = $false
} | Out-Null

Write-Host "Done."
Write-Host "Repository replaced at https://github.com/$Owner/$Repo"
Write-Host "Commit: $($newCommit.sha)"
