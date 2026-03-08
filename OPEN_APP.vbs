Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
base = fso.GetParentFolderName(WScript.ScriptFullName)
shell.Run Chr(34) & base & "\OPEN_APP.bat" & Chr(34), 0, False
