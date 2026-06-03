use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize, Clone, Copy)]
pub struct GpsPoint {
    pub lat: f64,
    pub lng: f64,
    pub timestamp: f64,
    pub speed: f64,
    pub altitude: f64,
}

#[derive(Serialize, Deserialize)]
pub struct TrackStats {
    pub total_distance_km: f64,
    pub avg_speed_kmh: f64,
    pub max_speed_kmh: f64,
    pub duration_secs: f64,
    pub elevation_gain_m: f64,
    pub point_count: u32,
}

#[derive(Serialize, Deserialize)]
pub struct Segment {
    pub distance_km: f64,
    pub bearing: f64,
}

fn degrees_to_radians(deg: f64) -> f64 {
    deg * std::f64::consts::PI / 180.0
}

fn haversine(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    let r = 6371.0;
    let d_lat = degrees_to_radians(lat2 - lat1);
    let d_lng = degrees_to_radians(lng2 - lng1);
    let a = (d_lat / 2.0).sin().powi(2)
        + degrees_to_radians(lat1).cos()
            * degrees_to_radians(lat2).cos()
            * (d_lng / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    r * c
}

#[wasm_bindgen]
pub fn calculate_distance(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    haversine(lat1, lng1, lat2, lng2)
}

#[wasm_bindgen]
pub fn calculate_bearing(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    let d_lng = degrees_to_radians(lng2 - lng1);
    let y = d_lng.sin() * degrees_to_radians(lat2).cos();
    let x = degrees_to_radians(lat1).cos() * degrees_to_radians(lat2).sin()
        - degrees_to_radians(lat1).sin()
            * degrees_to_radians(lat2).cos()
            * d_lng.cos();
    let bearing = y.atan2(x).to_degrees();
    (bearing + 360.0) % 360.0
}

#[wasm_bindgen]
pub fn calculate_track_stats(points: JsValue) -> JsValue {
    let points: Vec<GpsPoint> = serde_wasm_bindgen::from_value(points).unwrap_or_default();
    if points.is_empty() {
        return serde_wasm_bindgen::to_value(&TrackStats {
            total_distance_km: 0.0,
            avg_speed_kmh: 0.0,
            max_speed_kmh: 0.0,
            duration_secs: 0.0,
            elevation_gain_m: 0.0,
            point_count: 0,
        })
        .unwrap();
    }

    let mut total_distance = 0.0;
    let mut max_speed = points[0].speed;
    let mut elevation_gain = 0.0;
    let mut speed_sum = 0.0;
    let mut speed_count = 0;

    for i in 1..points.len() {
        let d = haversine(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
        total_distance += d;

        if points[i].speed > max_speed {
            max_speed = points[i].speed;
        }

        if points[i].speed > 0.0 {
            speed_sum += points[i].speed;
            speed_count += 1;
        }

        let alt_diff = points[i].altitude - points[i - 1].altitude;
        if alt_diff > 0.0 {
            elevation_gain += alt_diff;
        }
    }

    let duration_secs = points.last().unwrap().timestamp - points[0].timestamp;
    let avg_speed = if duration_secs > 0.0 {
        (total_distance / (duration_secs / 3600.0)).abs()
    } else if speed_count > 0 {
        speed_sum / speed_count as f64
    } else {
        0.0
    };

    let stats = TrackStats {
        total_distance_km: (total_distance * 1000.0).round() / 1000.0,
        avg_speed_kmh: (avg_speed * 1000.0).round() / 1000.0,
        max_speed_kmh: (max_speed * 1000.0).round() / 1000.0,
        duration_secs: (duration_secs * 1000.0).round() / 1000.0,
        elevation_gain_m: (elevation_gain * 1000.0).round() / 1000.0,
        point_count: points.len() as u32,
    };

    serde_wasm_bindgen::to_value(&stats).unwrap()
}

#[wasm_bindgen]
pub fn interpolate_points(points: JsValue, max_gap_seconds: f64) -> JsValue {
    let points: Vec<GpsPoint> = serde_wasm_bindgen::from_value(points).unwrap_or_default();
    if points.len() < 2 {
        return serde_wasm_bindgen::to_value(&points).unwrap();
    }

    let mut result = Vec::new();
    result.push(points[0]);

    for i in 1..points.len() {
        let prev = &points[i - 1];
        let curr = &points[i];
        let dt = curr.timestamp - prev.timestamp;

        if dt > max_gap_seconds && dt > 0.0 {
            let steps = (dt / max_gap_seconds).ceil() as usize;
            let step_frac = 1.0 / steps as f64;

            for j in 1..steps {
                let t = j as f64 * step_frac;
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

    serde_wasm_bindgen::to_value(&result).unwrap()
}

fn point_line_distance(point: &GpsPoint, line_start: &GpsPoint, line_end: &GpsPoint) -> f64 {
    let dx = line_end.lng - line_start.lng;
    let dy = line_end.lat - line_start.lat;
    let length_sq = dx * dx + dy * dy;

    if length_sq == 0.0 {
        return haversine(point.lat, point.lng, line_start.lat, line_start.lng);
    }

    let t = (((point.lng - line_start.lng) * dx + (point.lat - line_start.lat) * dy) / length_sq)
        .clamp(0.0, 1.0);

    let proj_lng = line_start.lng + t * dx;
    let proj_lat = line_start.lat + t * dy;

    haversine(point.lat, point.lng, proj_lat, proj_lng)
}

fn rdp(points: &[GpsPoint], epsilon: f64, output: &mut Vec<GpsPoint>) {
    if points.len() <= 2 {
        output.extend_from_slice(points);
        return;
    }

    let mut dmax = 0.0;
    let mut index = 0;

    for i in 1..points.len() - 1 {
        let d = point_line_distance(&points[i], &points[0], &points[points.len() - 1]);
        if d > dmax {
            dmax = d;
            index = i;
        }
    }

    if dmax > epsilon {
        rdp(&points[..=index], epsilon, output);
        rdp(&points[index..], epsilon, output);
    } else {
        output.push(points[0]);
        output.push(points[points.len() - 1]);
    }
}

#[wasm_bindgen]
pub fn simplify_track(points: JsValue, epsilon: f64) -> JsValue {
    let points: Vec<GpsPoint> = serde_wasm_bindgen::from_value(points).unwrap_or_default();
    if points.len() <= 2 {
        return serde_wasm_bindgen::to_value(&points).unwrap();
    }

    let mut result = Vec::new();
    rdp(&points, epsilon, &mut result);

    result.dedup_by(|a, b| (a.lat - b.lat).abs() < 1e-12 && (a.lng - b.lng).abs() < 1e-12);

    serde_wasm_bindgen::to_value(&result).unwrap()
}
