# Checkpoint Backup Tool
param(
    [string]$Note = "snapshot"
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$safeNote = $Note -replace '[^a-zA-Z0-9_\-]', '_'
$backupDirName = "checkpoint_" + $timestamp + "_" + $safeNote
$backupRoot = "D:\project\emtp-dashboard-backups"
$destPath = Join-Path $backupRoot $backupDirName

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EMT-P Dashboard - Checkpoint System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (-not (Test-Path $backupRoot)) {
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
}

Write-Host "[1/3] Creating physical snapshot: $backupDirName ..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $destPath -Force | Out-Null
Copy-Item -Path "D:\project\emtp-dashboard\*" -Destination $destPath -Recurse -Force -Exclude ".git"
Write-Host "      Physical snapshot created successfully!" -ForegroundColor Green

Write-Host "[2/3] Creating Git commit & tag..." -ForegroundColor Yellow
git -C "D:\project\emtp-dashboard" add -A
$status = git -C "D:\project\emtp-dashboard" status --porcelain
if ($status) {
    git -C "D:\project\emtp-dashboard" commit -m ("checkpoint: " + $Note + " (" + $timestamp + ")")
} else {
    Write-Host "      Working tree clean, tagging directly." -ForegroundColor DarkGray
}

$tagName = "cp-" + $timestamp
git -C "D:\project\emtp-dashboard" tag -a $tagName -m ("Checkpoint: " + $Note)
Write-Host ("      Git Tag created: " + $tagName) -ForegroundColor Green

Write-Host "[3/3] Checkpoint Summary:" -ForegroundColor Green
Write-Host ("      - Note: " + $Note)
Write-Host ("      - Path: " + $destPath)
Write-Host ("      - Tag : " + $tagName)
Write-Host "========================================" -ForegroundColor Cyan
