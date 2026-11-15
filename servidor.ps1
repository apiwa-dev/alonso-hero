# Mini servidor local para Alonso Hero (solo accesible desde este equipo).
# Se cierra solo cuando el juego lleva 3 minutos cerrado.
param([int]$Puerto = 47823)
$raiz = $PSScriptRoot
$tipos = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.png'='image/png'; '.ico'='image/x-icon'; '.svg'='image/svg+xml' }
$escucha = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Puerto)
try { $escucha.Start() } catch { exit 1 }
$ultimo = Get-Date
$salir = $false
while (-not $salir -and ((Get-Date) - $ultimo).TotalSeconds -lt 180) {
    if (-not $escucha.Pending()) { Start-Sleep -Milliseconds 30; continue }
    $cli = $escucha.AcceptTcpClient()
    try {
        $cli.ReceiveTimeout = 3000
        $flujo = $cli.GetStream()
        $lector = [System.IO.StreamReader]::new($flujo, [System.Text.Encoding]::ASCII, $false, 4096, $true)
        $linea = $lector.ReadLine()
        while ($true) { $h = $lector.ReadLine(); if ([string]::IsNullOrEmpty($h)) { break } }
        $ruta = '/'
        if ($linea -match '^GET\s+(\S+)') {
            $partes = $matches[1] -split '\?', 2
            $ruta = [Uri]::UnescapeDataString($partes[0])
            if ($ruta -eq '/registro' -and $partes.Count -gt 1 -and $env:ALONSO_REGISTRO) {
                Add-Content -LiteralPath $env:ALONSO_REGISTRO -Value ([Uri]::UnescapeDataString($partes[1])) -Encoding utf8
                $ruta = '/ping'
            }
        }
        $ultimo = Get-Date
        $estado = '200 OK'; $tipo = 'text/plain; charset=utf-8'; $cuerpo = [System.Text.Encoding]::UTF8.GetBytes('ok')
        if ($ruta -eq '/salir') { $salir = $true }
        elseif ($ruta -eq '/lista-musica') {
            $carpeta = Join-Path $raiz 'musica'
            $nombres = @(Get-ChildItem -LiteralPath $carpeta -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -match '^\.(mp3|ogg|wav|m4a|flac|opus|zip)$' } | ForEach-Object { $_.Name })
            $tipo = 'application/json; charset=utf-8'
            $cuerpo = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $nombres -Compress))
        }
        elseif ($ruta -ne '/ping') {
            if ($ruta -eq '/') { $ruta = '/index.html' }
            $archivo = [System.IO.Path]::GetFullPath((Join-Path $raiz $ruta.TrimStart('/')))
            if ($archivo.StartsWith($raiz, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $archivo -PathType Leaf)) {
                $cuerpo = [System.IO.File]::ReadAllBytes($archivo)
                $ext = [System.IO.Path]::GetExtension($archivo).ToLower()
                if ($tipos.ContainsKey($ext)) { $tipo = $tipos[$ext] } else { $tipo = 'application/octet-stream' }
            } else { $estado = '404 Not Found'; $cuerpo = [System.Text.Encoding]::UTF8.GetBytes('no encontrado') }
        }
        $cab = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $estado`r`nContent-Type: $tipo`r`nContent-Length: $($cuerpo.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n")
        $flujo.Write($cab, 0, $cab.Length)
        $flujo.Write($cuerpo, 0, $cuerpo.Length)
        $flujo.Flush()
    } catch { } finally { $cli.Close() }
}
$escucha.Stop()
