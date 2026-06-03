# Build WASM module
cd D:\Кайран\gps-wasm
wasm-pack build --target web --release
Copy-Item -LiteralPath "pkg\gps_wasm_bg.wasm" -Destination "..\frontend-angular\src\assets\wasm\gps_ops.wasm" -Force
Write-Host "✅ WASM built to frontend-angular/src/assets/wasm/gps_ops.wasm"
