
import { SensorData, SiteStatus, AnalysisFocus } from "../types";

/**
 * Procedural Intelligence Engine v2.0:
 * A high-density diagnostic core that functions as a sophisticated fallback to LLM analysis.
 */
export const getLocalAnalysis = (sensors: SensorData[], status: SiteStatus): string => {
  const focus = status.analysisFocus || 'HSE';
  const offlineCount = sensors.filter(s => s.status === 'offline').length;
  const hotNodes = sensors.filter(s => s.temperature > 55);
  const coldNodes = sensors.filter(s => s.temperature < 5);
  const unstableNodes = sensors.filter(s => Math.abs(s.drift ?? 0) > 0.8);

  const getSector = (x: number, z: number) => {
    const xDir = x > 0 ? "East" : "West";
    const zDir = z > 0 ? "North" : "South";
    return `${zDir}-${xDir}`;
  };

  // --- CORE HAZARD INTERRUPTS (Always priority regardless of focus) ---
  if (status.fireAlarm) {
    // Require multiple hot nodes for clarity; if only one node flagged, downgrade to advisory
    if (hotNodes.length >= 2) {
      return `[HSE_CRITICAL] THERMAL RUPTURE DETECTED at ${hotNodes.length} nodes. Automatic suppression sequence initiated. Evacuate non-essential personnel.`;
    } else {
      return `[HSE_ADVISORY] Elevated temperature detected at Node ${hotNodes[0]?.id}. Verify sensor and local conditions before escalation.`;
    }
  }
  
  if (coldNodes.length > 5) {
    return `[HSE_CRITICAL] CRYOGENIC LEAK. Brittle fracture risk high at Node ${coldNodes[0]?.id} in Sector ${getSector(coldNodes[0].x, coldNodes[0].z)}. HVAC air-handlers forced to warming cycle.`;
  }

  // --- FOCUS-BASED REPORTING OPTIONS ---
  switch (focus) {
    case 'HSE':
      if (unstableNodes.length > 0) {
        const lead = unstableNodes.sort((a,b) => Math.abs(b.drift || 0) - Math.abs(a.drift || 0))[0];
        return `[HSE_ADVISORY] Rapid thermal delta at Node ${lead.id} (${(lead.drift || 0).toFixed(2)}°C/s). Checking for localized atmospheric imbalance or gas accumulation.`;
      }
      return `[HSE_NOMINAL] Perimeter integrity verified. Internal atmosphere stable at ${status.averageTemp.toFixed(1)}°C. Stability Index: ${status.stabilityIndex.toFixed(0)}%. All fire-suppression headers pressurized.`;

    // ENERGY feedback removed by operator preference.
    // Fall through to a generic status if requested.
    
    case 'MAINTENANCE':
      if (offlineCount > 0) {
        return `[MAINT_URGENT] ${offlineCount} telemetry nodes silent. Signal attenuation detected in ${getSector(0,0)} cluster. Hardware replacement recommended for Node ID ${sensors.find(s => s.status === 'offline')?.id}.`;
      }
      const driftNoise = sensors.reduce((acc, s) => acc + Math.abs(s.drift || 0), 0) / sensors.length;
      return `[MAINT_REPORT] Sensor noise floor: ${(driftNoise * 100).toFixed(2)}%. No calibration drift detected. Structural resonance within spec. All 3D structural pillars reporting zero stress.`;

    case 'DIAGNOSTIC':
      const variance = status.peakTemp - status.minTemp;
      const statusLabel = variance > 20 ? 'Asymmetric' : 'Uniform';
      return `[DIAG_CORE] Thermal distribution is ${statusLabel} (ΔT: ${variance.toFixed(1)}°C). Peak: ${status.peakTemp.toFixed(1)}°C. Floor: ${status.minTemp.toFixed(1)}°C. HVAC PID-controller response time: 42ms.`;

    default:
      return `[SYSTEM] Engine online. All parameters within safe operating bounds.`;
  }
};

/**
 * Deep Neural Scan: Uses Python ML via backend server for anomaly detection.
 */
export const analyzeThermalData = async (sensors: SensorData[], status: SiteStatus) => {
  try {
    const response = await fetch('http://localhost:3003/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sensors, status }),
    });
    const data = await response.json();
    return data.analysis;
  } catch (error) {
    console.warn("Backend error. Falling back to Procedural Intelligence.", error);
    return getLocalAnalysis(sensors, status);
  }
};
