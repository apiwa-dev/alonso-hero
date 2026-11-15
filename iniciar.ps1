# Abre Alonso Hero: arranca el mini servidor (si no está ya) y abre el juego en una ventana propia.
$puerto = 47823
$url = "http://127.0.0.1:$puerto/"
function Activo { try { $c = [System.Net.Sockets.TcpClient]::new('127.0.0.1', $puerto); $c.Close(); $true } catch { $false } }
if (-not (Activo)) {
    Start-Process powershell.exe -WindowStyle Hidden -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSScriptRoot\servidor.ps1`"", '-Puerto', $puerto
    for ($i = 0; $i -lt 50 -and -not (Activo); $i++) { Start-Sleep -Milliseconds 100 }
}
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($edge) { Start-Process $edge -ArgumentList "--app=$url", '--autoplay-policy=no-user-gesture-required', '--start-fullscreen' }
else { Start-Process $url }
