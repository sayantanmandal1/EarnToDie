; Custom NSIS installer script for Zombie Car Game
; This script customizes the Windows installer

!macro customInit
  ; Custom initialization code
  SetShellVarContext all
  
  ; Check for minimum system requirements
  ${If} ${AtLeastWin10}
    ; Windows 10 or later - proceed
  ${Else}
    MessageBox MB_OK|MB_ICONSTOP "This game requires Windows 10 or later."
    Quit
  ${EndIf}
  
  ; Check for DirectX
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\DirectX" "Version"
  ${If} $0 == ""
    MessageBox MB_YESNO|MB_ICONQUESTION "DirectX is required for this game. Would you like to download it?" IDYES download_directx
    Goto skip_directx
    download_directx:
      ExecShell "open" "https://www.microsoft.com/en-us/download/details.aspx?id=35"
    skip_directx:
  ${EndIf}
!macroend

!macro customInstall
  ; Create additional shortcuts
  CreateShortCut "$DESKTOP\Zombie Car Game.lnk" "$INSTDIR\Zombie Car Game.exe" "" "$INSTDIR\resources\app\assets\icon.ico"
  
  ; Register file associations for save files
  WriteRegStr HKCR ".zcgsave" "" "ZombieCarGameSave"
  WriteRegStr HKCR "ZombieCarGameSave" "" "Zombie Car Game Save File"
  WriteRegStr HKCR "ZombieCarGameSave\DefaultIcon" "" "$INSTDIR\resources\app\assets\icon.ico"
  WriteRegStr HKCR "ZombieCarGameSave\shell\open\command" "" '"$INSTDIR\Zombie Car Game.exe" "%1"'
  
  ; Create uninstaller registry entries
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZombieCarGame" "DisplayName" "Zombie Car Game"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZombieCarGame" "UninstallString" "$INSTDIR\Uninstall Zombie Car Game.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZombieCarGame" "DisplayIcon" "$INSTDIR\resources\app\assets\icon.ico"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZombieCarGame" "Publisher" "Zombie Car Game Team"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZombieCarGame" "DisplayVersion" "1.0.0"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZombieCarGame" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZombieCarGame" "NoRepair" 1
!macroend

!macro customUnInstall
  ; Remove file associations
  DeleteRegKey HKCR ".zcgsave"
  DeleteRegKey HKCR "ZombieCarGameSave"
  
  ; Remove uninstaller registry entries
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZombieCarGame"
  
  ; Remove shortcuts
  Delete "$DESKTOP\Zombie Car Game.lnk"
  Delete "$SMPROGRAMS\Zombie Car Game.lnk"
!macroend