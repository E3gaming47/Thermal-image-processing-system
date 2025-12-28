
import React, { useRef } from 'react';
import { Box, Plane, Sphere, Html, Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SensorData, Alert } from '../types';
import { ROOM_WIDTH, ROOM_HEIGHT, ROOM_DEPTH, PILLAR_POSITIONS, getTemperatureColor, WARNING_THRESHOLD } from '../constants';

interface HallProps {
  sensors: SensorData[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  suppressionActive?: boolean;
  activeHazards?: Alert[];
}

export const IndustrialHall: React.FC<HallProps> = ({ sensors, selectedId, onSelect, suppressionActive, activeHazards = [] }) => {
  const suppressionLightRef = useRef<THREE.PointLight>(null);
  
  useFrame(({ clock }) => {
    if (suppressionLightRef.current && suppressionActive) {
      suppressionLightRef.current.intensity = 2.0 + Math.sin(clock.elapsedTime * 8) * 1.0;
    }
  });

  return (
    <group onPointerMissed={() => onSelect(null)}>
      {suppressionActive && (
        <>
          <Stars radius={50} depth={50} count={1500} factor={4} saturation={0} fade speed={2} />
          <pointLight ref={suppressionLightRef} position={[0, ROOM_HEIGHT - 2, 0]} color="#3b82f6" distance={100} />
        </>
      )}

      {/* Floor */}
      <Plane args={[ROOM_WIDTH, ROOM_DEPTH]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <meshStandardMaterial color="#e5e7eb" roughness={0.6} metalness={0.8} />
      </Plane>

      {/* Ceiling */}
      <Plane args={[ROOM_WIDTH, ROOM_DEPTH]} rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_HEIGHT, 0]}>
        <meshStandardMaterial color="#f9fafb" side={THREE.DoubleSide} roughness={0.5} transparent opacity={0.1} />
      </Plane>

      {/* Perimeter Walls */}
      <Plane args={[ROOM_WIDTH, ROOM_HEIGHT]} position={[0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]}>
        <meshStandardMaterial color="#d1d5db" />
      </Plane>
      <Plane args={[ROOM_WIDTH, ROOM_HEIGHT]} position={[0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2]} rotation={[0, Math.PI, 0]}>
        <meshStandardMaterial color="#d1d5db" transparent opacity={0.1} />
      </Plane>
      <Plane args={[ROOM_DEPTH, ROOM_HEIGHT]} position={[-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <meshStandardMaterial color="#d1d5db" />
      </Plane>
      <Plane args={[ROOM_DEPTH, ROOM_HEIGHT]} position={[ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <meshStandardMaterial color="#d1d5db" />
      </Plane>

      {/* Pillars - Centered on shared positions */}
      {PILLAR_POSITIONS.map((p, idx) => (
        <group key={`pillar-${idx}`} position={[p.x, ROOM_HEIGHT / 2, p.z]}>
          <Box args={[1.5, ROOM_HEIGHT, 1.5]}>
            <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.2} />
          </Box>
        </group>
      ))}

      {/* Sensors */}
      {sensors.map((sensor) => {
        const isSelected = selectedId === sensor.id;
        const isCeiling = sensor.type === 'ceiling';
        const baseColor = getTemperatureColor(sensor.temperature, sensor.type, sensor.status);
        const isHot = sensor.temperature > 50 && sensor.status === 'online';
        // Keep visuals on if there's an unresolved hazard affecting this sensor or its category
        const affectedByHazard = activeHazards.some(h => !h.resolved && (
          (h.sensorId && h.sensorId === sensor.id) ||
          (h.category === 'FIRE' && sensor.temperature >= WARNING_THRESHOLD) ||
          (h.category === 'CRYO' && sensor.temperature < 5)
        ));
        
        return (
          <group 
            key={sensor.id} 
            position={[sensor.x, sensor.y, sensor.z]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(sensor.id);
            }}
          >
            {isCeiling ? (
              <Sphere args={[isSelected ? 0.6 : 0.35, 16, 16]} scale={[1, 0.4, 1]}>
                <meshStandardMaterial 
                  color={baseColor} 
                  emissive={isSelected || suppressionActive || affectedByHazard ? baseColor : '#000000'}
                  emissiveIntensity={isSelected ? 4 : (suppressionActive ? 2 : (affectedByHazard ? 1.6 : 0))}
                />
              </Sphere>
            ) : (
              <Box args={[isSelected ? 0.5 : 0.3, isSelected ? 0.7 : 0.45, isSelected ? 0.5 : 0.3]}>
                <meshStandardMaterial 
                  color={baseColor} 
                  emissive={isSelected || isHot || suppressionActive || affectedByHazard ? baseColor : '#000000'}
                  emissiveIntensity={isSelected ? 5 : isHot ? 3 : suppressionActive ? 0.8 : (affectedByHazard ? 1.6 : 0)}
                  opacity={sensor.status === 'offline' ? 0.2 : 1}
                  transparent={sensor.status === 'offline'}
                />
              </Box>
            )}

            {(isSelected || (suppressionActive && isHot) || affectedByHazard) && (
              <group>
                <Sphere args={[1.5, 16, 16]}>
                  <meshStandardMaterial 
                    color={suppressionActive ? "#3b82f6" : affectedByHazard ? "#ef4444" : baseColor} 
                    transparent 
                    opacity={0.2} 
                    wireframe 
                  />
                </Sphere>
                {isSelected && (
                  <Html distanceFactor={12} position={[0, 1.4, 0]}>
                    <div className="bg-white border border-blue-500/50 px-2 py-1 rounded text-gray-900 text-[9px] font-bold shadow-2xl pointer-events-none">
                      {sensor.temperature.toFixed(1)}°C
                    </div>
                  </Html>
                )}
                {affectedByHazard && !isSelected && (
                  <Html distanceFactor={12} position={[0, 1.4, 0]}>
                    <div className="bg-red-100 border border-red-500 px-2 py-1 rounded text-red-900 text-[8px] font-bold shadow-2xl pointer-events-none animate-pulse">
                      HAZARD
                    </div>
                  </Html>
                )}
              </group>
            )}
          </group>
        );
      })}

      {/* Dark Industrial Lighting */}
      <hemisphereLight intensity={0.8} color="#ffffff" groundColor="#e5e7eb" />
      <ambientLight intensity={0.4} />
      <pointLight position={[15, 15, 15]} intensity={0.8} color="#ffffff" />
      <gridHelper args={[ROOM_WIDTH, 40, 0x6b7280, 0xd1d5db]} position={[0, 0.05, 0]} />
    </group>
  );
};
