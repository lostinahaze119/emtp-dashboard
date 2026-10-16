# 戰情室專案存檔還原工具 (Restore Checkpoint Tool)
param(
    [string]$Target = "list"
)

$backupRoot = "D:\project\emtp-dashboard-backups"
$projectDir = "D:\project\emtp-dashboard"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  新竹縣 EMT-P 戰情室 - 存檔還原系統" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($Target -eq "list") {
    Write-Host "可用的實體存檔點清單：" -ForegroundColor Yellow
    Get-ChildItem -Path $backupRoot -Directory | Sort-Object LastWriteTime -Descending | ForEach-Object {
        Write-Host "  $($_.Name)  (建立時間: $($_.LastWriteTime))" -ForegroundColor Green
    }
    Write-Host "\n可用的 Git 標籤存檔點：" -ForegroundColor Yellow
    git -C $projectDir tag -n1
    Write-Host "\n使用方式： .\restore_checkpoint.ps1 -Target <存檔名稱>" -ForegroundColor Cyan
    exit
}

$source = Join-Path $backupRoot $Target
if (!(Test-Path $source)) {
    Write-Host "錯誤：找不到存檔點 $Target" -ForegroundColor Red
    exit
}

Write-Host "正在從 $Target 還原專案..." -ForegroundColor Yellow
Copy-Item -Path "$source\*" -Destination $projectDir -Recurse -Force
Write-Host "還原成功完成！" -ForegroundColor Green
