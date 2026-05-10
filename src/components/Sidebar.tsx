import React from 'react';
import { motion } from 'motion/react';
import { History, Shield, Info, UserCheck, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Person } from '../types';
import { useFirebase } from '../lib/FirebaseProvider';

export default function Sidebar({ identifiedPeople = [] }: { identifiedPeople?: Person[] }) {
  const { events } = useFirebase();

  // Combine real registered people with mock/live events
  const allEvents = [
    ...events.map(e => ({
      id: e.id,
      name: e.personId ? identifiedPeople.find(p => p.id === e.personId)?.name : 'Unknown Visitor',
      role: e.personId ? identifiedPeople.find(p => p.id === e.personId)?.role : 'Unregistered Signal',
      status: e.personId ? identifiedPeople.find(p => p.id === e.personId)?.status : 'Citizen',
      timestamp: e.timestamp,
      confidence: e.confidence,
      imageUrl: e.imageUrl,
      type: e.personId ? identifiedPeople.find(p => p.id === e.personId)?.status.toLowerCase() : 'unknown'
    }))
  ].slice(0, 8);

  return (
    <aside className="w-80 border-l border-white/5 bg-[#0f0f12] flex flex-col">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
          Live Matches
        </h3>
        <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-widest">
          Active Scan
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6 space-y-4">
          {allEvents.map((event, idx) => (
            <motion.div 
              key={event.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "p-4 rounded-xl border flex gap-4 transition-all duration-300 group hover:scale-[1.02]",
                event.type === 'vip' 
                  ? "bg-indigo-500/10 border-indigo-500/30" 
                  : "bg-white/5 border-white/10 hover:bg-white/[0.08]"
              )}
            >
              <div className="w-12 h-12 bg-slate-800 rounded-lg flex-shrink-0 border border-white/5 overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
                {event.imageUrl ? (
                  <img src={event.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-20">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-sm text-white font-medium truncate tracking-tight">{event.name}</p>
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium truncate mb-2">{event.role}</p>
                
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        event.confidence > 90 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-400"
                      )} />
                      <span className={cn(
                        "text-[9px] font-mono font-bold",
                        event.confidence > 90 ? "text-emerald-400" : "text-amber-400"
                      )}>
                        {event.confidence}% MATCH
                      </span>
                   </div>
                   <span className="text-[9px] font-mono text-slate-600 font-bold">{event.timestamp}</span>
                </div>
              </div>
            </motion.div>
          ))}

          {allEvents.length === 0 && (
            <div className="py-20 flex flex-col items-center gap-4 text-slate-700">
              <div className="relative">
                <Shield className="w-10 h-10 stroke-[1]" />
                <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-10 animate-pulse" />
              </div>
              <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-center">
                Awaiting Bio-Metric Signal...
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 border-t border-white/5 bg-black/20">
        <button className="w-full py-3.5 border border-indigo-500/30 text-indigo-400 rounded-xl text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-indigo-500/10 transition-all active:scale-95 flex items-center justify-center gap-2">
          <History className="w-3.5 h-3.5" />
          Full System Log
        </button>
      </div>
    </aside>
  );
}
