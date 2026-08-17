' Usage: wscript scripts\start-bridge.vbs [claude|codex|antigravity]
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
repoDir = fso.GetParentFolderName(scriptDir)

agent = "claude"
If WScript.Arguments.Count > 0 Then agent = WScript.Arguments(0)

If agent = "antigravity" Then
  entryPoint = "scripts/discord-antigravity-bridge.js"
Else
  entryPoint = "scripts/discord-agent-bridge.js " & agent
End If

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = repoDir
WshShell.Run "node " & entryPoint, 0, False
