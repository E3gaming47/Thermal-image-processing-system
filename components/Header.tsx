
import React from 'react';
import { Database } from 'lucide-react';

interface HeaderProps {
  fireAlarm: boolean;
  simMode: string;
}

export const Header: React.FC<HeaderProps> = ({ fireAlarm, simMode }) => (
  <header className={`flex items-center justify-between px-6 py-3 border-b border-gray-300 bg-white/80 backdrop-blur-xl z-50 transition-all ${fireAlarm ? 'bg-red-50/40 border-red-500 animate-pulse' : ''}`}>
    <div className="flex items-center gap-6">
      <div className="p-2 rounded-lg bg-indigo-600 shadow-xl"><Database size={22} /></div>
      <div>
        <h1 className="text-lg font-black tracking-tighter uppercase">Thermal_Guard.Enterprise</h1>
        <div className="flex gap-2 text-[10px] font-bold text-gray-500 uppercase">
          <span className="text-blue-400">Sector_01_Reactor</span>
          <span>•</span>
          <span className={fireAlarm ? 'text-red-500 animate-bounce font-black' : 'text-emerald-500'}>
            {fireAlarm ? 'HAZARD_DETECTED' : 'SYSTEM_NOMINAL'}
          </span>
        </div>
      </div>
    </div>
    <div className="text-right flex items-center gap-8">
      <div className="hidden lg:block">
        <div className="text-[10px] font-bold text-gray-500 uppercase">Engine_State</div>
        <div className="text-xs font-black text-blue-400 uppercase tracking-widest">{simMode}</div>
      </div>
      <div>
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Master Clock</div>
        <div className="text-xs font-black tabular-nums text-gray-300">{new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  </header>
);
