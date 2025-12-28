
export const ROOM_WIDTH = 50;
export const ROOM_HEIGHT = 15;
export const ROOM_DEPTH = 40;

export const FIRE_THRESHOLD = 85; // Celsius
export const WARNING_THRESHOLD = 45; // Celsius
export const IDEAL_TEMP_MIN = 18;
export const IDEAL_TEMP_MAX = 24;

// Shared structural map
export const PILLAR_POSITIONS = [
  { x: -15, z: -10 }, { x: -5, z: -10 }, { x: 5, z: -10 }, { x: 15, z: -10 },
  { x: -15, z: 10 }, { x: -5, z: 10 }, { x: 5, z: 10 }, { x: 15, z: 10 }
];

export const SENSOR_COLORS = {
  COOL: '#3b82f6',
  OPTIMAL: '#10b981',
  WARM: '#f59e0b',
  HOT: '#ef4444',
  FIRE: '#7f1d1d',
  OFFLINE: '#475569',
  HEALTHY_PILLAR: '#ef4444',
  HEALTHY_CEILING: '#0ea5e9'
};

export const getTemperatureColor = (temp: number, type: 'pillar' | 'wall' | 'ceiling', status: 'online' | 'offline' = 'online') => {
  if (status === 'offline') return SENSOR_COLORS.OFFLINE;
  if (temp >= FIRE_THRESHOLD) return SENSOR_COLORS.FIRE;
  if (temp >= 60) return SENSOR_COLORS.HOT;
  if (temp >= WARNING_THRESHOLD) return SENSOR_COLORS.WARM;
  if (temp <= 10) return SENSOR_COLORS.COOL;
  if (type === 'ceiling') return SENSOR_COLORS.HEALTHY_CEILING;
  return SENSOR_COLORS.HEALTHY_PILLAR;
};
