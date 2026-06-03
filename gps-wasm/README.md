# gps-wasm

WASM-модуль для расчёта GPS-треков в браузере на Rust.

## Использование

```js
import init, * as gps from './assets/wasm/gps_ops.js';

await init();

const dist = gps.calculate_distance(55.75, 37.61, 55.76, 37.62);
// -> расстояние в км

const stats = gps.calculate_track_stats(points);
// -> { total_distance_km, avg_speed_kmh, max_speed_kmh, duration_secs, elevation_gain_m, point_count }

const bearing = gps.calculate_bearing(55.75, 37.61, 55.76, 37.62);
// -> начальный азимут в градусах

const smooth = gps.interpolate_points(points, 5.0);
// -> точки с интерполяцией при разрывах > 5 сек

const simplified = gps.simplify_track(points, 0.001);
// -> упрощённый трек (Ramer-Douglas-Peucker)
```

## Сборка

```powershell
./build.ps1
```

Требуется [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/).
