
import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { 
  ShieldAlert, BrainCircuit, Activity, 
  Flame, RefreshCw, Terminal, Zap, ShieldX, 
  Power, TrendingUp, Dna, BarChart3, Layers, Gauge, Snowflake, Radio, Wind,
  Settings, HeartPulse, Hammer, ScanLine, Loader2, AlertTriangle, Camera
} from 'lucide-react';
import { SensorData, AnalysisFocus } from './types';
import { IndustrialHall } from './components/IndustrialHall';
import { StatCard } from './components/StatCard';
import { ROOM_WIDTH, ROOM_DEPTH, ROOM_HEIGHT, PILLAR_POSITIONS } from './constants';
import { analyzeThermalData, getLocalAnalysis } from './services/geminiService';
import { useSimulation, SimulationMode } from './hooks/useSimulation';
import { Header } from './components/Header';

const generateInitialSensors = (): SensorData[] => {
  const sensors: SensorData[] = [];
  const pillarOffset = 0.76;
  const heights = [3, 7, 11];
  
  PILLAR_POSITIONS.forEach((pos, pIdx) => {
    heights.forEach((h, hIdx) => {
      const faces = [
        { dx: pillarOffset, dz: 0 }, { dx: -pillarOffset, dz: 0 },
        { dx: 0, dz: pillarOffset }, { dx: 0, dz: -pillarOffset }
      ];
      faces.forEach((off, oIdx) => {
        sensors.push({
          id: `p-${pIdx}-h${hIdx}-f${oIdx}`,
          x: pos.x + off.dx,
          y: h,
          z: pos.z + off.dz,
          temperature: 22,
          humidity: 45,
          type: 'pillar',
          status: 'online'
        });
      });
    });
  });

  const wallHeights = [4, 9];
  for (let x = -20; x <= 20; x += 10) {
    wallHeights.forEach(h => {
      sensors.push({ id: `w-b-${x}-${h}`, x, y: h, z: -ROOM_DEPTH / 2 + 0.2, temperature: 21, humidity: 45, type: 'wall', status: 'online' });
    });
  }
  for (let z = -15; z <= 15; z += 10) {
    wallHeights.forEach(h => {
      sensors.push({ id: `w-l-${z}-${h}`, x: -ROOM_WIDTH / 2 + 0.2, y: h, z, temperature: 21, humidity: 45, type: 'wall', status: 'online' });
      sensors.push({ id: `w-r-${z}-${h}`, x: ROOM_WIDTH / 2 - 0.2, y: h, z, temperature: 21, humidity: 45, type: 'wall', status: 'online' });
    });
  }

  for (let x = -15; x <= 15; x += 15) {
    for (let z = -12; z <= 12; z += 12) {
      sensors.push({ id: `c-${x}-${z}`, x, y: ROOM_HEIGHT - 0.2, z, temperature: 20, humidity: 40, type: 'ceiling', status: 'online' });
    }
  }
  return sensors;
};

function App() {
  const { sensors, simMode, setSimMode, status, setStatus, activeHazards, handleSuppression, resolveHazard, thermalAnalysis, reset, log } = useSimulation(generateInitialSensors());
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [thermalImage, setThermalImage] = useState<string | null>(null);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedSensor = sensors.find(s => s.id === selectedSensorId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [status.lastAIAnalysis, simMode, activeHazards.length]);

  const runAnalysis = async (focus: AnalysisFocus) => {
    setIsAnalyzing(true);
    const updatedStatus = { ...status, analysisFocus: focus };
    setStatus(updatedStatus);
    const r = await analyzeThermalData(sensors, updatedStatus); 
    if (r) setStatus(prev => ({ ...prev, lastAIAnalysis: r, analysisFocus: focus }));
    setIsAnalyzing(false);
  };

  const fetchThermalImage = async () => {
    setIsFetchingImage(true);
    try {
      const resp = await fetch('http://localhost:3003/thermal-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sensors, status })
      });
      const j = await resp.json();
      if (j.imageBase64) setThermalImage(`data:image/png;base64,${j.imageBase64}`);
    } catch (e) {
      console.error('Failed to fetch thermal image', e);
    }
    setIsFetchingImage(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100 text-gray-900 overflow-hidden font-mono selection:bg-blue-500/30">
      <Header fireAlarm={status.fireAlarm} simMode={simMode} />

      <div className="flex-1 relative flex overflow-hidden">
        {/* TELEMETRY SIDEBAR */}
        <div className="absolute top-6 left-6 z-20 w-80 h-[calc(100%-48px)] flex flex-col pointer-events-none">
          <div className="pointer-events-auto flex flex-col gap-3 h-full">
            <StatCard label="Stability Index" value={status.stabilityIndex.toFixed(1)} unit="%" icon={<Layers size={18}/>} color={status.stabilityIndex < 70 ? 'amber' : 'emerald'} />
            
            <div className="bg-white/90 border border-gray-300/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col gap-3">
              <div className="flex justify-between items-center text-indigo-400">
                <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><BarChart3 size={12}/> Spectrum</h4>
                <div className="text-[10px] font-bold tabular-nums text-slate-400">ΔT: {thermalAnalysis.deltaT.toFixed(1)}°C</div>
              </div>
              <div className="relative h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                <div className="absolute h-full bg-indigo-500/40 border-x border-white/20 transition-all duration-300" style={{ left: `${Math.max(0, (thermalAnalysis.min / 60) * 100)}%`, right: `${100 - Math.min(100, (thermalAnalysis.max / 60) * 100)}%` }} />
                <div className="absolute h-full w-0.5 bg-white shadow-[0_0_10px_white] z-10 transition-all duration-300" style={{ left: `${Math.max(0, (thermalAnalysis.avg / 60) * 100)}%` }} />
              </div>
            </div>

            {selectedSensor && (
              <div className="bg-blue-50/95 border border-blue-500/50 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-left-4">
                <div className="flex justify-between items-center mb-2 font-black uppercase text-indigo-400 text-[10px]"><div className="flex items-center gap-2"><Gauge size={12}/> Telemetry</div><button onClick={() => setSelectedSensorId(null)}><ShieldX size={14}/></button></div>
                <div className="text-[10px] space-y-1">
                  <div className="flex justify-between border-b border-slate-700/50 pb-1"><span>Node</span><span>{selectedSensor.id}</span></div>
                  <div className="flex justify-between font-black"><span>Temp</span><span className="text-indigo-300">{selectedSensor.temperature.toFixed(2)}°C</span></div>
                </div>
              </div>
            )}

            {/* HAZARDS */}
            <div className="space-y-2 overflow-y-auto max-h-[35%] custom-scrollbar pr-1">
              {activeHazards.map(hazard => {
                const isSuppressed = hazard.message.includes("SUPPRESSION");
                return (
                  <div key={hazard.id} className={`${isSuppressed ? 'bg-blue-600' : 'bg-red-700'} p-3 rounded-xl border border-white/20 shadow-2xl backdrop-blur-sm`}>
                    <div className="flex items-center gap-2 text-white mb-2 uppercase text-[9px] font-black tracking-widest">
                      {isSuppressed ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} className="animate-pulse" />}
                      <span>{isSuppressed ? 'COOLING' : 'CRITICAL'}</span>
                    </div>
                    <p className="text-[10px] font-bold text-red-600 mb-3 uppercase leading-tight">{hazard.message}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleSuppression(hazard.id)} disabled={isSuppressed} className="flex-1 py-2 bg-white text-slate-950 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50">
                        {isSuppressed ? 'Sequence Active' : 'Actuate Suppression'}
                      </button>
                      <button onClick={() => resolveHazard(hazard.id)} className="py-2 px-3 bg-white/10 border border-white/20 text-white rounded-lg text-[9px] font-bold uppercase hover:bg-white/20">Acknowledge</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* LOG */}
            <div className="flex-1 min-h-0 bg-white/80 border border-gray-300/50 rounded-2xl overflow-hidden flex flex-col backdrop-blur-md">
              <div className="p-3 border-b border-gray-300/50 text-blue-400 flex items-center gap-2 font-black uppercase text-[10px]"><Terminal size={12}/> Kernel</div>
              <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto space-y-1.5 font-mono text-[9px] text-gray-600 custom-scrollbar">
                {(status.logs || []).map((l, i) => (
                  <div key={i} className={`pl-2 border-l ${l.includes('[FIRE]') || l.includes('[CRYO]') ? 'border-red-500 text-red-600' : 'border-gray-400 text-gray-700'}`}>{l}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI PANEL */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-6">
          <div className="flex justify-center gap-2 mb-3 pointer-events-auto">
            {['HSE', 'MAINTENANCE', 'DIAGNOSTIC'].map((id) => (
              <button key={id} onClick={() => runAnalysis(id as AnalysisFocus)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border transition-all ${status.analysisFocus === id ? 'bg-indigo-600 border-white text-white shadow-lg' : 'bg-slate-900/80 border-slate-700/50 text-slate-400'}`}>{id}</button>
            ))}
          </div>
          <div className="bg-white/95 border border-gray-300/50 rounded-3xl p-5 shadow-3xl backdrop-blur-md flex gap-4 items-center">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl"><BrainCircuit size={24} className={isAnalyzing ? 'animate-spin' : ''} /></div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] font-black uppercase text-indigo-400 mb-1">Copilot Feed</h3>
              <p className="text-sm font-semibold truncate-2-lines">{status.lastAIAnalysis}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchThermalImage} disabled={isFetchingImage} className="py-2 px-3 bg-gray-100 border rounded-lg text-sm font-bold">{isFetchingImage ? 'Generating...' : 'Thermal Image'}</button>
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="absolute top-6 right-6 z-20 w-80 h-[calc(100%-48px)] flex flex-col gap-4 pointer-events-none">
          <div className="pointer-events-auto flex-1 bg-white/80 border border-gray-300/50 rounded-3xl p-6 flex flex-col gap-6 backdrop-blur-md shadow-2xl">
            <div className="flex justify-between items-center text-blue-400 font-black uppercase text-[10px] tracking-widest">Global Telemetry</div>
            <div className="grid grid-cols-1 gap-3 text-[10px] font-black uppercase">
              <div className="bg-gray-100/40 p-3 rounded-2xl border border-gray-300/50"><span className="text-gray-500 block mb-1">HVAC</span><div className="flex items-center gap-2"><Power size={12} className={status.hvacActive ? 'text-emerald-500' : 'text-gray-500'}/>{status.hvacActive ? 'ACTIVE' : 'IDLE'}</div></div>
            </div>
            
            <div className="space-y-2">
              <div className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Engine Control</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'Normal', label: 'Nominal', icon: <Activity size={12}/> },
                  { id: 'LocalizedFire', label: 'Fire', icon: <Flame size={12}/> },
                  { id: 'SubZero', label: 'Leak', icon: <Snowflake size={12}/> },
                  { id: 'RealWorldDrill', label: 'SIM DRILL', icon: <Radio size={12}/> }
                ].map(m => (
                  <button key={m.id} onClick={() => setSimMode(m.id as SimulationMode)} className={`py-3 px-2 rounded-xl border text-[9px] font-black uppercase transition-all flex flex-col items-center gap-1 ${simMode === m.id ? 'bg-blue-600 border-white text-white shadow-lg' : 'bg-gray-200/40 border-gray-300 text-gray-400'}`}>
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => reset(generateInitialSensors())} className="mt-auto py-3 bg-red-600/10 border border-red-600/30 rounded-2xl text-[9px] font-black uppercase text-red-400 hover:bg-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"><RefreshCw size={12}/> System Reset</button>
          </div>
        </div>

        {/* 3D RENDER LAYER */}
        <div className="w-full h-full bg-gray-200">
          <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
            <PerspectiveCamera makeDefault position={[42, 32, 42]} fov={35} />
            <OrbitControls enableDamping dampingFactor={0.06} maxPolarAngle={Math.PI / 2.1} />
            <IndustrialHall 
              sensors={sensors} 
              selectedId={selectedSensorId} 
              onSelect={setSelectedSensorId} 
              suppressionActive={simMode === 'Suppression'}
              activeHazards={activeHazards}
            />
            <fog attach="fog" args={['#f3f4f6', 70, 180]} />
          </Canvas>
        </div>
      </div>
      {thermalImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-3xl w-full">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-black">Thermal Image</h4>
              <button onClick={() => setThermalImage(null)} className="px-2 py-1 bg-gray-200 rounded">Close</button>
            </div>
            <img src={thermalImage} alt="Thermal" className="w-full h-auto" />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
