import json
import sys
from sklearn.ensemble import IsolationForest
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler
import numpy as np

def analyze_thermal_data(sensors, status):
    focus = status.get('analysisFocus', 'HSE')
    
    # Prepare data for ML
    online_sensors = [s for s in sensors if s['status'] == 'online']
    if not online_sensors:
        return "[SYSTEM] No online sensors available for analysis."
    
    # Features: temperature, humidity, x, y, z, drift
    features = np.array([[s['temperature'], s['humidity'], s['x'], s['y'], s['z'], s.get('drift', 0)] for s in online_sensors])
    
    # Scale features
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(features)
    
    # Use multiple anomaly detection methods for robustness; lower sensitivity to reduce false positives
    iso_forest = IsolationForest(contamination=0.05, random_state=42)
    iso_scores = iso_forest.fit_predict(scaled_features)
    
    oc_svm = OneClassSVM(nu=0.05, kernel='rbf', gamma='auto')
    svm_scores = oc_svm.fit_predict(scaled_features)
    
    # Combine scores: anomaly if both detect it
    combined_anomalies = (iso_scores == -1) & (svm_scores == -1)
    anomaly_indices = np.where(combined_anomalies)[0]
    anomaly_count = len(anomaly_indices)

    # Spatial consensus: require at least two anomalous sensors clustered within a small distance
    cluster_confirmed = False
    if anomaly_count >= 2:
        coords = np.array([[online_sensors[i]['x'], online_sensors[i]['y'], online_sensors[i]['z']] for i in anomaly_indices])
        # compute pairwise distances
        dists = np.sqrt(((coords[:, None, :] - coords[None, :, :]) ** 2).sum(axis=2))
        # if any off-diagonal distance is below threshold (e.g., 6 units), consider clustered
        if np.any((dists + np.eye(dists.shape[0]) * 1e6) < 6.0):
            cluster_confirmed = True
    
    # Basic stats
    temps = [s['temperature'] for s in online_sensors]
    avg_temp = np.mean(temps)
    max_temp = np.max(temps)
    min_temp = np.min(temps)
    delta_t = max_temp - min_temp
    std_temp = np.std(temps)
    
    # Predictive: simple trend based on drift
    drifts = [s.get('drift', 0) for s in online_sensors]
    avg_drift = np.mean(drifts)
    trend = "Rising" if avg_drift > 0.5 else "Falling" if avg_drift < -0.5 else "Stable"
    
    # Generate response based on focus
    if focus == 'HSE':
        # Require spatial consensus for criticals. High absolute temperature alone yields advisory.
        if cluster_confirmed:
            risk_level = "HIGH"
            return f"[HSE_CRITICAL] Risk Level: {risk_level}. {anomaly_count} clustered anomalous signatures detected. Delta T: {delta_t:.1f}°C. Trend: {trend}. Immediate investigation required."
        if anomaly_count >= 2 and max_temp > 85:
            risk_level = "HIGH"
            return f"[HSE_CRITICAL] Risk Level: {risk_level}. Multiple anomalies detected across sensors. Delta T: {delta_t:.1f}°C. Trend: {trend}. Immediate investigation required."
        if anomaly_count > 0 or max_temp > 70:
            risk_level = "MEDIUM"
            return f"[HSE_ADVISORY] Risk Level: {risk_level}. {anomaly_count} anomalous signatures detected (no spatial consensus). Delta T: {delta_t:.1f}°C. Check affected nodes before escalation."
        return f"[HSE_NOMINAL] Perimeter nominal. Avg Temp: {avg_temp:.1f}°C."
    
    elif focus == 'ENERGY':
        # Energy-focused analytics have been disabled per operator preference.
        return f"[SYSTEM] Energy analytics disabled. Use HSE or MAINTENANCE for relevant diagnostics."
    
    elif focus == 'MAINTENANCE':
        maintenance_score = max(0, 100 - (anomaly_count * 15) - (len([s for s in sensors if s['status'] == 'offline']) * 20))
        issues = []
        if anomaly_count > 0: issues.append("calibration drift")
        if len([s for s in sensors if s['status'] == 'offline']) > 0: issues.append("sensor failures")
        if std_temp > 5: issues.append("thermal variance")
        return f"[MAINT_REPORT] Health Score: {maintenance_score:.0f}%. Issues: {', '.join(issues) if issues else 'None'}. Anomalies: {anomaly_count}. Schedule maintenance if score < 70."
    
    elif focus == 'DIAGNOSTIC':
        confidence = min(95, 50 + (len(online_sensors) * 2) - (anomaly_count * 5))
        diagnostics = f"Thermal distribution: {'Uniform' if std_temp < 3 else 'Variable'}. Anomalies: {anomaly_count}/{len(online_sensors)}. Trend: {trend}."
        return f"[DIAG_ML] Confidence: {confidence:.0f}%. {diagnostics} Combined ML detection active. System integrity: {'Nominal' if anomaly_count == 0 else 'Compromised'}."
    
    else:
        return f"[SYSTEM] ML Analysis Complete. Anomalies: {anomaly_count}. Avg Temp: {avg_temp:.1f}°C. Status: {'Normal' if anomaly_count == 0 else 'Alert'}."

if __name__ == "__main__":
    input_data = json.load(sys.stdin)
    sensors = input_data['sensors']
    status = input_data['status']
    result = analyze_thermal_data(sensors, status)
    print(result)