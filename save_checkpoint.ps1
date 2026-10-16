# 戰情室專案自動存檔腳本 (Checkpoint Backup Tool)
param(
    [string]$Note = "日常存檔"
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$safeNote = $Note -replace '[\/:\*\?"<>\|\s]', '_'
$backupDirName = "checkpoint_${timestamp}_${safeNote}"
$backupRoot = "D:\project\emtp-dashboard-backups"
$destPath = Join-Path $backupRoot $backupDirName

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  新竹縣 EMT-P 戰情室 - 專案存檔系統" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (!(Test-Path $backupRoot)) {
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
}

Write-Host "[1/3] 正在建立實體快照目錄：$backupDirName ..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $destPath -Force | Out-Null
Copy-Item -Path "D:\project\emtp-dashboard\*" -Destination $destPath -Recurse -Force -Exclude ".git"
Write-Host "      實體快照備份完成！" -ForegroundColor Green

Write-Host "[2/3] 正在建立 Git 版本存檔 ..." -ForegroundColor Yellow
git -C "D:\project\emtp-dashboard" add -A
$status = git -C "D:\project\emtp-dashboard" status --porcelain
if ($status) {
    git -C "D:\project\emtp-dashboard" commit -m "checkpoint: ${Note} ($timestamp)"
} else {
    Write-Host "      工作目錄無未提交變更，直接建立標籤。" -ForegroundColor DarkGray
}

$tagName = "cp-${timestamp}"
git -C "D:\project\emtp-dashboard" tag -a $tagName -m "存檔點: ${Note}"
Write-Host "      Git 標籤存檔完成：$tagName" -ForegroundColor Green

Write-Host "[3/3] 存檔完成確認：" -ForegroundColor Green
Write-Host "      - 標記說明：$Note"
Write-Host "      - 實體路徑：$destPath"
Write-Host "      - Git Tag ：$tagName"
Write-Host "========================================" -ForegroundColor Cyan
