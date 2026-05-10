import React from 'react';
import { cn } from '../lib/utils';

export default function StatsGrid({ crowdCount = 0, identified = 0 }: { crowdCount?: number, identified?: number }) {
  const matchRate = crowdCount > 0 ? ((identified / crowdCount) * 100).toFixed(1) : '0.0';
  
  return (
    <div className="h-32 grid grid-cols-4 gap-4 p-6 bg-[#0a0a0c] border-t border-white/5">
      <StatItem 
        label="Database Managed" 
        value="104k Profiles" 
        subValue="+1.2k identifications"
        status="positive"
      />
      <StatItem 
        label="Match Accuracy" 
        value="99.82%" 
        subValue="NIST Standard Rank-1"
      />
      <StatItem 
        label="Attendance Matrix" 
        value={crowdCount.toLocaleString()} 
        subValue={`${matchRate}% match rate`}
        status="warning"
      />
      <StatItem 
        label="Uptime" 
        value="4h 12m" 
        subValue="Session: R_SYD_24"
      />
    </div>
  );
}

function StatItem({ label, value, subValue, status }: { label: string, value: string, subValue: string, status?: 'positive' | 'warning' }) {
  return (
    <div className="bg-[#0f0f12] rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-indigo-500/30 transition-all cursor-default group">
      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold group-hover:text-indigo-400 transition-colors">{label}</div>
      <div className="text-xl text-white font-light tracking-tight">{value}</div>
      <div className={cn(
        "text-[9px] uppercase tracking-tighter font-mono",
        status === 'positive' ? "text-emerald-400" : status === 'warning' ? "text-amber-400" : "text-slate-500"
      )}>
        {subValue}
      </div>
    </div>
  );
}
