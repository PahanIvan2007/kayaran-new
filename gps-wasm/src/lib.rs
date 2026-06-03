use std::f64::consts::PI;

const EARTH_RADIUS_KM: f64 = 6371.0;
const STRIDE: usize = 5;
const _: usize = 40 - STRIDE * 8;

const fn deg_to_rad(d: f64) -> f64 { d * PI / 180.0 }

fn haversine(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    let dlat = deg_to_rad(lat2 - lat1);
    let dlng = deg_to_rad(lng2 - lng1);
    let a = (dlat * 0.5).sin().powi(2)
        + deg_to_rad(lat1).cos() * deg_to_rad(lat2).cos() * (dlng * 0.5).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    EARTH_RADIUS_KM * c
}

#[no_mangle]
pub extern "C" fn calculate_distance(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    haversine(lat1, lng1, lat2, lng2)
}

#[no_mangle]
pub extern "C" fn calculate_bearing(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    let dlng = deg_to_rad(lng2 - lng1);
    let y = dlng.sin() * deg_to_rad(lat2).cos();
    let x = deg_to_rad(lat1).cos() * deg_to_rad(lat2).sin()
        - deg_to_rad(lat1).sin() * deg_to_rad(lat2).cos() * dlng.cos();
    (y.atan2(x).to_degrees() + 360.0) % 360.0
}

/// Flat f64 array processing: stride=5 (lat,lng,timestamp,speed,altitude).
/// No struct copies — raw `&[f64]` cast from WASM memory for cache-friendly sequential access.
#[inline(always)]
fn lat(f: &[f64], i: usize) -> f64 { f[i * STRIDE] }
#[inline(always)]
fn lng(f: &[f64], i: usize) -> f64 { f[i * STRIDE + 1] }
#[inline(always)]
fn ts(f: &[f64], i: usize) -> f64 { f[i * STRIDE + 2] }
#[inline(always)]
fn spd(f: &[f64], i: usize) -> f64 { f[i * STRIDE + 3] }
#[inline(always)]
fn alt(f: &[f64], i: usize) -> f64 { f[i * STRIDE + 4] }

/// Track stats: [total_dist_km, avg_speed_kmh, max_speed_kmh, duration_secs, elev_gain_m]
#[no_mangle]
pub extern "C" fn calc_track_stats(mem: *mut u8, count: i32) -> i32 {
    if count < 1 { return 0 }
    let n = count as usize;
    let f = unsafe { &*core::ptr::slice_from_raw_parts(mem as *const f64, n * STRIDE) };
    let mut dist = 0.0;
    let mut max_speed = spd(f, 0);
    let mut elev_gain = 0.0;
    let mut speed_sum = 0.0;
    let mut speed_cnt = 0;

    for i in 1..n {
        let d = haversine(lat(f, i - 1), lng(f, i - 1), lat(f, i), lng(f, i));
        dist += d;
        let s = spd(f, i);
        if s > max_speed { max_speed = s }
        if s > 0.0 { speed_sum += s; speed_cnt += 1 }
        let ad = alt(f, i) - alt(f, i - 1);
        if ad > 0.0 { elev_gain += ad }
    }

    let dur = ts(f, n - 1) - ts(f, 0);
    let avg = if dur > 0.0 { (dist / (dur / 3600.0)).abs() }
              else if speed_cnt > 0 { speed_sum / speed_cnt as f64 } else { 0.0 };

    let out = unsafe { &mut *core::ptr::slice_from_raw_parts_mut(mem as *mut f64, STRIDE) };
    out[0] = (dist * 1000.0).round() / 1000.0;
    out[1] = (avg * 1000.0).round() / 1000.0;
    out[2] = (max_speed * 1000.0).round() / 1000.0;
    out[3] = (dur * 1000.0).round() / 1000.0;
    out[4] = (elev_gain * 1000.0).round() / 1000.0;
    1
}

fn perp_dist(flats: &[f64], pi: usize, si: usize, ei: usize) -> f64 {
    let dx = lng(flats, ei) - lng(flats, si);
    let dy = lat(flats, ei) - lat(flats, si);
    let len_sq = dx * dx + dy * dy;
    if len_sq == 0.0 { return haversine(lat(flats, pi), lng(flats, pi), lat(flats, si), lng(flats, si)) }
    let t = (((lng(flats, pi) - lng(flats, si)) * dx + (lat(flats, pi) - lat(flats, si)) * dy) / len_sq).clamp(0.0, 1.0);
    haversine(lat(flats, pi), lng(flats, pi), lat(flats, si) + t * dy, lng(flats, si) + t * dx)
}

fn rdp_flat(flats: &[f64], start: usize, end: usize, epsilon: f64, output: &mut Vec<f64>) {
    let n = end - start + 1;
    if n <= 2 {
        for i in start..=end {
            output.push(lat(flats, i));
            output.push(lng(flats, i));
            output.push(ts(flats, i));
            output.push(spd(flats, i));
            output.push(alt(flats, i));
        }
        return;
    }
    let mut dmax = 0.0;
    let mut idx = start;
    for i in (start + 1)..end {
        let d = perp_dist(flats, i, start, end);
        if d > dmax { dmax = d; idx = i }
    }
    if dmax > epsilon {
        rdp_flat(flats, start, idx, epsilon, output);
        rdp_flat(flats, idx, end, epsilon, output);
    } else {
        for i in [start, end] {
            output.push(lat(flats, i));
            output.push(lng(flats, i));
            output.push(ts(flats, i));
            output.push(spd(flats, i));
            output.push(alt(flats, i));
        }
    }
}

#[no_mangle]
pub extern "C" fn simplify_track(mem: *mut u8, count: i32, epsilon: f64) -> i32 {
    if count < 2 { return count }
    let n = count as usize;
    let f = unsafe { &*core::ptr::slice_from_raw_parts(mem as *const f64, n * STRIDE) };
    let mut result: Vec<f64> = Vec::new();
    rdp_flat(f, 0, n - 1, epsilon, &mut result);
    let m = (result.len() / STRIDE).min(n);
    let out = unsafe { &mut *core::ptr::slice_from_raw_parts_mut(mem as *mut f64, m * STRIDE) };
    out.copy_from_slice(&result[..m * STRIDE]);
    m as i32
}

#[no_mangle]
pub extern "C" fn interpolate_track(mem: *mut u8, count: i32, max_gap_secs: f64) -> i32 {
    if count < 2 { return count }
    let n = count as usize;
    let f = unsafe { &*core::ptr::slice_from_raw_parts(mem as *const f64, n * STRIDE) };
    let mut result: Vec<f64> = Vec::with_capacity(n * 2 * STRIDE);
    for i in 0..STRIDE { result.push(f[i]) }
    for i in 1..n {
        let dt = ts(f, i) - ts(f, i - 1);
        if dt > max_gap_secs && dt > 0.0 {
            let steps = (dt / max_gap_secs).ceil() as usize;
            for j in 1..steps {
                let t = j as f64 / steps as f64;
                result.push(lat(f, i - 1) + (lat(f, i) - lat(f, i - 1)) * t);
                result.push(lng(f, i - 1) + (lng(f, i) - lng(f, i - 1)) * t);
                result.push(ts(f, i - 1) + dt * t);
                result.push(spd(f, i - 1) + (spd(f, i) - spd(f, i - 1)) * t);
                result.push(alt(f, i - 1) + (alt(f, i) - alt(f, i - 1)) * t);
            }
        }
        for k in 0..STRIDE { result.push(f[i * STRIDE + k]) }
    }
    let m = (result.len() / STRIDE).min(n * 2);
    let out = unsafe { &mut *core::ptr::slice_from_raw_parts_mut(mem as *mut f64, m * STRIDE) };
    out.copy_from_slice(&result[..m * STRIDE]);
    m as i32
}
