# CEOUBB Antigravity Bridge - Automatic Startup Installer for Windows
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoDir = (Get-Item $scriptDir).Parent.FullName
$startupFolder = [System.IO.Path]::Combine($env:APPDATA, "Microsoft\Windows\Start Menu\Programs\Startup")
$vbsTarget = Join-Path $startupFolder "ceoubb-antigravity-bridge.vbs"

$vbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "$repoDir"
WshShell.Run "node scripts/discord-antigravity-bridge.js", 0, False
"@

# Write launcher to Windows Startup folder with absolute repo directory
[System.IO.File]::WriteAllText($vbsTarget, $vbsContent, [System.Text.Encoding]::ASCII)

Write-Host "✅ CEOUBB Antigravity Bridge configured in Windows Startup folder:" -ForegroundColor Green
Write-Host "   Target: $vbsTarget" -ForegroundColor Cyan
Write-Host "   Working Directory: $repoDir`n" -ForegroundColor DarkGray

# Stop any existing instance
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*discord-antigravity-bridge*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force } -ErrorAction SilentlyContinue

# Start process immediately in background
Start-Process wscript.exe -ArgumentList "`"$vbsTarget`""
Write-Host "🚀 CEOUBB Antigravity Bridge launched in background!" -ForegroundColor Green
Write-Host "   Antigravity bot is now online and will automatically start with Windows." -ForegroundColor Yellow
