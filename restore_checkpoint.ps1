# Restore Checkpoint Tool
param(
    [string]$Target = "list"
)

$backupRoot = "D:\project\emtp-dashboard-backups"
$projectDir = "D:\project\emtp-dashboard"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EMT-P Dashboard - Restore System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($Target -eq "list") {
    Write-Host "Available physical checkpoints:" -ForegroundColor Yellow
    Get-ChildItem -Path $backupRoot -Directory | Sort-Object LastWriteTime -Descending | ForEach-Object {
        Write-Host ("  " + $_.Name + " (" + $_.LastWriteTime + ")") -ForegroundColor Green
    }
    Write-Host "`nAvailable Git checkpoint tags:" -ForegroundColor Yellow
    git -C $projectDir tag -n1
    Write-Host "`nUsage: .\restore_checkpoint.ps1 -Target <checkpoint_folder_name>" -ForegroundColor Cyan
    exit
}

$source = Join-Path $backupRoot $Target
if (-not (Test-Path $source)) {
    Write-Host ("Error: Checkpoint not found: " + $Target) -ForegroundColor Red
    exit
}

Write-Host ("Restoring project from " + $Target + " ...") -ForegroundColor Yellow
Copy-Item -Path ($source + "\*") -Destination $projectDir -Recurse -Force
Write-Host "Project successfully restored!" -ForegroundColor Green
