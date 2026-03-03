$ErrorActionPreference = 'Stop'
$log = 'D:\TaskerAI\admin-clean.log'
"=== Admin cleanup started: $(Get-Date) ===" | Out-File $log

try {
  "Taking ownership" | Out-File -Append $log
  takeown /F "D:\TaskerAI\node_modules\lightningcss-win32-x64-msvc\lightningcss.win32-x64-msvc.node" 2>&1 | Out-File -Append $log

  "Setting ACLs" | Out-File -Append $log
  icacls "D:\TaskerAI\node_modules\lightningcss-win32-x64-msvc\lightningcss.win32-x64-msvc.node" /grant "$env:USERNAME:F" 2>&1 | Out-File -Append $log

  "Removing locked file" | Out-File -Append $log
  Remove-Item -Force 'D:\TaskerAI\node_modules\lightningcss-win32-x64-msvc\lightningcss.win32-x64-msvc.node' -ErrorAction Stop 2>&1 | Out-File -Append $log

  "Running npm ci" | Out-File -Append $log
  npm ci 2>&1 | Out-File -Append $log

  "=== Admin cleanup completed: $(Get-Date) ===" | Out-File -Append $log
} catch {
  "ERROR: $($_.Exception.Message)" | Out-File -Append $log
  "ERROR Details: $($_ | Out-String)" | Out-File -Append $log
}

# Keep window open briefly so user can see results
Start-Sleep -Seconds 2
Read-Host -Prompt "Admin script finished. Press Enter to close this window" | Out-Null