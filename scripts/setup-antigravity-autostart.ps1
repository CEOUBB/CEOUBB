# CEOUBB Antigravity Bridge - Automatic Startup Installer for Windows
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbsSource = Join-Path $scriptDir "start-antigravity-bridge.vbs"
$startupFolder = [System.IO.Path]::Combine($env:APPDATA, "Microsoft\Windows\Start Menu\Programs\Startup")
$vbsTarget = Join-Path $startupFolder "ceoubb-antigravity-bridge.vbs"

if (-not (Test-Path $vbsSource)) {
    Write-Error "Source VBS file not found: $vbsSource"
    exit 1
}

# Copy launcher to Windows Startup folder
Copy-Item -Path $vbsSource -Destination $vbsTarget -Force
Write-Host "✅ CEOUBB Antigravity Bridge added to Windows Startup folder:" -ForegroundColor Green
Write-Host "   $vbsTarget`n" -ForegroundColor Cyan

# Start process immediately in background
Start-Process wscript.exe -ArgumentList "`"$vbsTarget`""
Write-Host "🚀 CEOUBB Antigravity Bridge launched in background!" -ForegroundColor Green
Write-Host "   Antigravity bot is now online and listening for Discord prompts." -ForegroundColor Yellow
