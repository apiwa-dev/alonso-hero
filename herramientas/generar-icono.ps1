# Regenera img\icono.ico e img\icono.png a partir de img\icono.svg (usa Microsoft Edge para dibujarlo).
# Uso: powershell -ExecutionPolicy Bypass -File herramientas\generar-icono.ps1
$ErrorActionPreference = 'Stop'
$raiz = Split-Path $PSScriptRoot -Parent
$obra = Join-Path $env:TEMP ('alonso-hero-icono-' + [guid]::NewGuid())
New-Item -ItemType Directory -Force $obra | Out-Null
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$svg = ([Uri](Join-Path $raiz 'img\icono.svg')).AbsoluteUri
$tamanos = 256, 48, 32, 16
$imagenes = foreach ($t in $tamanos) {
    $png = Join-Path $obra "icono$t.png"; $html = Join-Path $obra "icono$t.html"
    Set-Content $html "<html><body style='margin:0;background:transparent'><img src='$svg' width='$t' height='$t'></body></html>" -Encoding utf8
    Start-Process $edge -ArgumentList '--headless=new', '--hide-scrollbars', '--default-background-color=00000000', "--user-data-dir=$obra\edge", "--window-size=$t,$t", "--screenshot=$png", ([Uri]$html).AbsoluteUri -Wait -WindowStyle Hidden
    if (-not (Test-Path $png)) { throw "No se pudo generar el icono de $t px." }
    , [IO.File]::ReadAllBytes($png)
}
Copy-Item (Join-Path $obra 'icono256.png') (Join-Path $raiz 'img\icono.png') -Force
$ico = New-Object IO.MemoryStream
$w = New-Object IO.BinaryWriter $ico
$w.Write([uint16]0); $w.Write([uint16]1); $w.Write([uint16]$tamanos.Count)
$desplazamiento = 6 + 16 * $tamanos.Count
for ($i = 0; $i -lt $tamanos.Count; $i++) {
    $lado = if ($tamanos[$i] -ge 256) { 0 } else { $tamanos[$i] }
    $w.Write([byte]$lado); $w.Write([byte]$lado); $w.Write([byte]0); $w.Write([byte]0)
    $w.Write([uint16]1); $w.Write([uint16]32); $w.Write([uint32]$imagenes[$i].Length); $w.Write([uint32]$desplazamiento)
    $desplazamiento += $imagenes[$i].Length
}
foreach ($b in $imagenes) { $w.Write($b) }
$w.Flush()
[IO.File]::WriteAllBytes((Join-Path $raiz 'img\icono.ico'), $ico.ToArray())
Remove-Item $obra -Recurse -Force -ErrorAction SilentlyContinue
'Icono generado: img\icono.ico'
