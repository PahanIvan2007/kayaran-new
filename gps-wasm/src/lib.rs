use std::f64::consts::PI;

const EARTH_RADIUS_KM: f64 = 6371.0;

fn deg_to_rad(d: f64) -> f64 { d * PI / 180.0 }

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

#[repr(C)]
#[derive(Clone, Copy)]
pub struct GpsPoint {
    pub lat: f64,
    pub lng: f64,
    pub timestamp: f64,
    pub speed: f64,
    pub altitude: f64,
}

fn write_f64(mem: &mut [u8], offset: usize, val: f64) {
    let bytes = val.to_le_bytes();
    mem[offset..offset + 8].copy_from_slice(&bytes);
}

fn read_f64(mem: &[u8], offset: usize) -> f64 {
    let mut bytes = [0u8; 8];
    bytes.copy_from_slice(&mem[offset..offset + 8]);
    f64::from_le_bytes(bytes)
}

fn read_point(mem: &[u8], offset: usize) -> GpsPoint {
    GpsPoint {
        lat: read_f64(mem, offset),
        lng: read_f64(mem, offset + 8),
        timestamp: read_f64(mem, offset + 16),
        speed: read_f64(mem, offset + 24),
        altitude: read_f64(mem, offset + 32),
    }
}

fn write_point(mem: &mut [u8], offset: usize, p: &GpsPoint) {
    write_f64(mem, offset, p.lat);
    write_f64(mem, offset + 8, p.lng);
    write_f64(mem, offset + 16, p.timestamp);
    write_f64(mem, offset + 24, p.speed);
    write_f64(mem, offset + 32, p.altitude);
}

/// Track stats stored as 5 sequential f64 values in memory:
/// [0]: total_distance_km, [1]: avg_speed_kmh, [2]: max_speed_kmh,
/// [3]: duration_secs, [4]: elevation_gain_m
#[no_mangle]
pub extern "C" fn calc_track_stats(mem: *mut u8, count: i32) -> i32 {
    if count < 1 { return 0 }
    let points_slice = unsafe { std::slice::from_raw_parts(mem as *const u8, (count as usize) * 40) };
    let mut total_dist = 0.0;
    let mut max_speed = read_f64(points_slice, 24);
    let mut elev_gain = 0.0;
    let mut speed_sum = 0.0;
    let mut speed_count = 0;

    for i in 1..count as usize {
        let prev = read_point(points_slice, (i - 1) * 40);
        let curr = read_point(points_slice, i * 40);
        total_dist += haversine(prev.lat, prev.lng, curr.lat, curr.lng);
        if curr.speed > max_speed { max_speed = curr.speed }
        if curr.speed > 0.0 { speed_sum += curr.speed; speed_count += 1 }
        let alt_diff = curr.altitude - prev.altitude;
        if alt_diff > 0.0 { elev_gain += alt_diff }
    }

    let first_ts = read_f64(points_slice, 16);
    let last_ts = read_f64(points_slice, ((count as usize) - 1) * 40 + 16);
    let duration = last_ts - first_ts;
    let avg_speed = if duration > 0.0 {
        (total_dist / (duration / 3600.0)).abs()
    } else if speed_count > 0 { speed_sum / speed_count as f64 } else { 0.0 };

    let result = unsafe { std::slice::from_raw_parts_mut(mem, 40) };
    write_f64(result, 0, (total_dist * 1000.0).round() / 1000.0);
    write_f64(result, 8, (avg_speed * 1000.0).round() / 1000.0);
    write_f64(result, 16, (max_speed * 1000.0).round() / 1000.0);
    write_f64(result, 24, (duration * 1000.0).round() / 1000.0);
    write_f64(result, 32, (elev_gain * 1000.0).round() / 1000.0);
    1
}

fn perpendicular_dist(point: &GpsPoint, start: &GpsPoint, end: &GpsPoint) -> f64 {
    let dx = end.lng - start.lng;
    let dy = end.lat - start.lat;
    let len_sq = dx * dx + dy * dy;
    if len_sq == 0.0 { return haversine(point.lat, point.lng, start.lat, start.lng) }
    let t = (((point.lng - start.lng) * dx + (point.lat - start.lat) * dy) / len_sq).clamp(0.0, 1.0);
    haversine(point.lat, point.lng, start.lat + t * dy, start.lng + t * dx)
}

fn rdp(points: &[GpsPoint], epsilon: f64, output: &mut Vec<GpsPoint>) {
    if points.len() <= 2 { output.extend_from_slice(points); return }
    let mut dmax = 0.0;
    let mut idx = 0;
    for i in 1..points.len() - 1 {
        let d = perpendicular_dist(&points[i], &points[0], &points[points.len() - 1]);
        if d > dmax { dmax = d; idx = i }
    }
    if dmax > epsilon {
        rdp(&points[..=idx], epsilon, output);
        rdp(&points[idx..], epsilon, output);
    } else {
        output.push(points[0]);
        output.push(points[points.len() - 1]);
    }
}

/// Input: memory buffer with `count` GpsPoints (40 bytes each).
/// Output: overwrites the buffer with simplified points.
/// Returns: new count.
#[no_mangle]
pub extern "C" fn simplify_track(mem: *mut u8, count: i32, epsilon: f64) -> i32 {
    if count < 2 { return count }
    let mem_size = (count as usize) * 40;
    let input = unsafe { std::slice::from_raw_parts(mem as *const u8, mem_size) };
    let mut points: Vec<GpsPoint> = Vec::with_capacity(count as usize);
    for i in 0..count as usize {
        points.push(read_point(input, i * 40));
    }
    let mut result = Vec::new();
    rdp(&points, epsilon, &mut result);
    result.dedup_by(|a, b| (a.lat - b.lat).abs() < 1e-12 && (a.lng - b.lng).abs() < 1e-12);
    let n = result.len().min(count as usize);
    let output = unsafe { std::slice::from_raw_parts_mut(mem, n * 40) };
    for (i, p) in result.iter().take(n).enumerate() {
        write_point(output, i * 40, p);
    }
    n as i32
}

/// Same memory layout as simplify_track.
/// Returns: new count after interpolation.
#[no_mangle]
pub extern "C" fn interpolate_track(mem: *mut u8, count: i32, max_gap_secs: f64) -> i32 {
    if count < 2 { return count }
    let mem_size = (count as usize) * 40;
    let input = unsafe { std::slice::from_raw_parts(mem as *const u8, mem_size) };
    let mut points: Vec<GpsPoint> = Vec::with_capacity(count as usize);
    for i in 0..count as usize {
        points.push(read_point(input, i * 40));
    }
    let mut result = Vec::with_capacity(count as usize * 2);
    result.push(points[0]);
    for i in 1..points.len() {
        let prev = &points[i - 1];
        let curr = &points[i];
        let dt = curr.timestamp - prev.timestamp;
        if dt > max_gap_secs && dt > 0.0 {
            let steps = (dt / max_gap_secs).ceil() as usize;
            for j in 1..steps {
                let t = j as f64 / steps as f64;
                result.push(GpsPoint {
                    lat: prev.lat + (curr.lat - prev.lat) * t,
                    lng: prev.lng + (curr.lng - prev.lng) * t,
                    timestamp: prev.timestamp + dt * t,
                    speed: prev.speed + (curr.speed - prev.speed) * t,
                    altitude: prev.altitude + (curr.altitude - prev.altitude) * t,
                });
            }
        }
        result.push(*curr);
    }
    let n = result.len().min(count as usize * 2);
    let output = unsafe { std::slice::from_raw_parts_mut(mem, n * 40) };
    for (i, p) in result.iter().take(n).enumerate() {
        write_point(output, i * 40, p);
    }
    n as i32
}
