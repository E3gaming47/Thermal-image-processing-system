
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SensorData, SiteStatus, Alert, AlertLevel, AnalysisFocus } from '../types';
import { 
  ROOM_WIDTH, ROOM_DEPTH, ROOM_HEIGHT, 
  FIRE_THRESHOLD, IDEAL_TEMP_MIN, IDEAL_TEMP_MAX 
} from '../constants';
import { getLocalAnalysis } from '../services/geminiService';

export type SimulationMode = 'Normal' | 'LocalizedFire' | 'HVAC_Failure' | 'Chaos' | 'SubZero' | 'Suppression' | 'RealWorldDrill';

export const useSimulation = (initialSensors: SensorData[]) => {
  const [sensors, setSensors] = useState<SensorData[]>(initialSensors);
  const [simMode, setSimMode] = useState<SimulationMode>('Normal');
  const [activeHazards, setActiveHazards] = useState<Alert[]>([]);
  const [log, setLog] = useState<string[]>(['Boot successful. Simulation link active.']);
  const [status, setStatus] = useState<SiteStatus>({
    averageTemp: 22, peakTemp: 24, minTemp: 18, hvacActive: false, fireAlarm: false,
    energyMode: 'ECO', lastAIAnalysis: 'Initializing Systems...', logs: ['Boot successful. Simulation link active.'], activeIncidents: 0, 
    stabilityIndex: 100, estimatedKva: 12.5, analysisFocus: 'HSE'
  });

  const suppressionLockoutRef = useRef<number>(0);
  const fireCounterRef = useRef<number>(0);
  const drillStateRef = useRef({ time: 0, x: 0, z: 0 });

  // Deduplicated Hazard Trigger: Prevents multiple alerts for the same category
  const triggerHazard = useCallback((msg: string, level: AlertLevel, category: Alert['category']) => {
    setActiveHazards(prev => {
      // If we already have an unresolved hazard of this category, ignore new ones
      if (prev.some(h => h.category === category && !h.resolved)) {
        return prev;
      }
      
      const id = `${category}-${Date.now()}`;
      const newHazard: Alert = { 
        id, 
        category,
        timestamp: new Date().toLocaleTimeString(), 
        message: msg, 
        level, 
        resolved: false 
      };

      // Also append to status logs / lastAIAnalysis for visibility
      setStatus(s => ({ ...s, lastAIAnalysis: msg, logs: [msg, ...(s.logs || [])].slice(0, 5) }));

      return [newHazard, ...prev];
    });
  }, []);

  const thermalAnalysis = useMemo(() => {
    const online = sensors.filter(s => s.status === 'online');
    if (online.length === 0) return { uniformity: 0, deltaT: 0, avg: 20, min: 20, max: 20 };
    const temps = online.map(s => s.temperature);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    const nominal = online.filter(s => s.temperature >= IDEAL_TEMP_MIN && s.temperature <= IDEAL_TEMP_MAX).length;
    return { min, max, avg, deltaT: max - min, uniformity: (nominal / online.length) * 100 };
  }, [sensors]);

  // Main Simulation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (simMode === 'RealWorldDrill') {
        drillStateRef.current.time += 0.1;
        drillStateRef.current.x = Math.sin(drillStateRef.current.time * 0.5) * 20;
        drillStateRef.current.z = Math.cos(drillStateRef.current.time * 0.3) * 15;
      }

      setSensors(prev => prev.map((s) => {
        let d = (Math.random() - 0.5) * 0.1;

        switch (simMode) {
          case 'RealWorldDrill':
            const dx = s.x - drillStateRef.current.x;
            const dz = s.z - drillStateRef.current.z;
            const distSq = dx * dx + dz * dz;
            if (distSq < 50) {
              d = (100 / (distSq + 2)) * 0.8;
            } else {
              d = (22 - s.temperature) * 0.1;
            }
            break;
          case 'LocalizedFire': 
            if (s.x < -5 && s.x > -15 && s.z < 0) d = 8.5; 
            break;
          case 'SubZero': 
            if (s.x > 10 && s.z > 5) d = -12.0; 
            break;
          case 'HVAC_Failure': 
            d = 0.5 + Math.random() * 0.4; 
            break;
          case 'Suppression': 
            d = (18 - s.temperature) * 0.5; 
            break;
          case 'Chaos': 
            d = (Math.random() - 0.5) * 30; 
            break;
          default: 
            if (s.temperature > IDEAL_TEMP_MAX) d = -0.3;
            else if (s.temperature < IDEAL_TEMP_MIN) d = 0.3;
            break;
        }

        return { 
          ...s, 
          temperature: Math.max(-40, Math.min(200, s.temperature + d)), 
          drift: d
        };
      }));

      if (simMode === 'Suppression' && thermalAnalysis.max < 35) {
        setSimMode('Normal');
        // Auto-clear suppression status when cooled
        setActiveHazards(prev => prev.filter(h => h.category !== 'FIRE'));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [simMode, thermalAnalysis.max]);

  // HSE Logic
  useEffect(() => {
    const { min, max, avg, uniformity } = thermalAnalysis;
    // Require at least two sensors above FIRE_THRESHOLD and a short persistence counter
    const hotCount = sensors.filter(s => s.status === 'online' && s.temperature >= FIRE_THRESHOLD).length;
    if (hotCount >= 2) {
      fireCounterRef.current = Math.min(5, fireCounterRef.current + 1);
    } else {
      fireCounterRef.current = Math.max(0, fireCounterRef.current - 1);
    }
    const isFire = max >= FIRE_THRESHOLD && fireCounterRef.current >= 2; // needs two consecutive ticks
    const isCryo = min < 5;

    // Do NOT auto-clear hazards automatically — require manual suppression/acknowledgement.

    setStatus(prev => ({
      ...prev,
      averageTemp: avg, peakTemp: max, minTemp: min, fireAlarm: isFire,
      hvacActive: (avg > IDEAL_TEMP_MAX || avg < 15 || simMode === 'Suppression') && simMode !== 'HVAC_Failure',
      stabilityIndex: Math.max(0, isFire ? 10 : uniformity),
      estimatedKva: 8 + (simMode === 'Suppression' ? 80 : (simMode === 'HVAC_Failure' ? 2 : 12)),
      activeIncidents: activeHazards.length,
      lastAIAnalysis: getLocalAnalysis(sensors, { ...prev, averageTemp: avg, peakTemp: max, stabilityIndex: uniformity }),
      logs: [getLocalAnalysis(sensors, { ...prev, averageTemp: avg, peakTemp: max, stabilityIndex: uniformity }), ...(prev.logs || [])]
    }));

    if (simMode !== 'Suppression' && Date.now() > suppressionLockoutRef.current) {
      if (isFire) triggerHazard("THERMAL RUPTURE DETECTED (DRILL ACTIVE).", "Critical", "FIRE");
      if (isCryo) triggerHazard("LOW TEMP ANOMALY DETECTED.", "Warning", "CRYO");
    }
  }, [sensors, thermalAnalysis, simMode, activeHazards.length, triggerHazard]);

  const handleSuppression = (hazardId: string) => {
    setSimMode('Suppression');
    suppressionLockoutRef.current = Date.now() + 8000;
    
    // Transform the alert rather than replacing it to maintain the category-based lock
    setActiveHazards(prev => prev.map(h => 
      h.id === hazardId ? { 
        ...h, 
        message: `HSE SUPPRESSION SYSTEM ENGAGED [${h.category}]...`, 
        level: 'Warning' 
      } : h
    ));
  };

  const resolveHazard = (hazardId: string) => {
    setActiveHazards(prev => prev.map(h => h.id === hazardId ? { ...h, resolved: true } : h));
    setStatus(s => ({ ...s, logs: [`Hazard ${hazardId} acknowledged.`, ...(s.logs || [])] }));
  };

  const reset = (newSensors: SensorData[]) => {
    setSensors(newSensors);
    setSimMode('Normal');
    setActiveHazards([]);
    suppressionLockoutRef.current = 0;
  };

  return { sensors, simMode, setSimMode, status, setStatus, activeHazards, handleSuppression, resolveHazard, thermalAnalysis, reset, log };
};
