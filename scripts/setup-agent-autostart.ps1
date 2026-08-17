# CEOUBB Discord Bridge - Automatic Startup Installer for Windows
param(
    [ValidateSet("claude", "codex", "antigravity")]
    [string]$Agent = "claude"
)

$ErrorActionPreference = "Stop"

# The Antigravity bridge keeps its own entry point; the CLI agents share one.
$entryPoint = if ($Agent -eq "antigravity") {
    "scripts/discord-antigravity-bridge.js"
} else {
    "scripts/discord-agent-bridge.js $Agent"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoDir = (Get-Item $scriptDir).Parent.FullName
$startupFolder = [System.IO.Path]::Combine($env:APPDATA, "Microsoft\Windows\Start Menu\Programs\Startup")
$vbsTarget = Join-Path $startupFolder "ceoubb-discord-bridge-$Agent.vbs"

$vbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "$repoDir"
WshShell.Run "node $entryPoint", 0, False
"@

# Write launcher to Windows Startup folder with absolute repo directory
[System.IO.File]::WriteAllText($vbsTarget, $vbsContent, [System.Text.Encoding]::ASCII)

Write-Host "✅ CEOUBB $Agent Bridge configured in Windows Startup folder:" -ForegroundColor Green
Write-Host "   Target: $vbsTarget" -ForegroundColor Cyan
Write-Host "   Working Directory: $repoDir`n" -ForegroundColor DarkGray

# Stop any existing instance
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*$entryPoint*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force } -ErrorAction SilentlyContinue

# Start process immediately in background
Start-Process wscript.exe -ArgumentList "`"$vbsTarget`""
Write-Host "🚀 CEOUBB $Agent Bridge launched in background!" -ForegroundColor Green
Write-Host "   The $Agent bot is now online and will automatically start with Windows." -ForegroundColor Yellow
