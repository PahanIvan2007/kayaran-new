$root = $PSScriptRoot
$frontendAssets = Join-Path -LiteralPath $root ".." "frontend-angular" "src" "assets" "wasm"
if (-not (Test-Path -LiteralPath $frontendAssets)) {
    New-Item -ItemType Directory -Path $frontendAssets -Force | Out-Null
}

$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
Set-Location -LiteralPath $root
cargo build --target wasm32-unknown-unknown --release
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$wasmIn = Join-Path $root "target" "wasm32-unknown-unknown" "release" "gps_wasm.wasm"
$wasmOut = Join-Path $frontendAssets "gps_ops.wasm"
Copy-Item -LiteralPath $wasmIn -Destination $wasmOut -Force
Write-Host "WASM built: $((Get-Item $wasmOut).Length) bytes -> frontend-angular/src/assets/wasm/gps_ops.wasm"
