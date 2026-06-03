/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Shield, 
  AlertTriangle, 
  Activity, 
  Camera, 
  History, 
  Settings, 
  Database,
  Search,
  Maximize2,
  Lock,
  LogOut,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Person, RecognitionEvent } from './types';
import VideoFeed from './components/VideoFeed';
import Sidebar from './components/Sidebar';
import StatsGrid from './components/StatsGrid';
import { VideoFeedHandle } from './components/VideoFeed';
import { useFirebase } from './lib/FirebaseProvider';

export default function App() {
  const { user, loading, signIn, logOut, people, events, registerPerson } = useFirebase();
  const [activeTab, setActiveTab] = useState<'monitor' | 'people' | 'history'>('monitor');
  const videoFeedRef = useRef<VideoFeedHandle>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('Citizen');
  const [isWatchlist, setIsWatchlist] = useState(false);
  const [regImage, setRegImage] = useState<string | null>(null);
  const [regDescriptor, setRegDescriptor] = useState<number[] | null>(null);
  const [alerts, setAlerts] = useState<{ id: string; name: string; time: string }[]>([]);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);

  const handleRegister = async () => {
    let finalImage = regImage;
    let finalDescriptor = regDescriptor;

    if (!finalImage || !finalDescriptor) {
      const frame = videoFeedRef.current?.captureFrame();
      const descriptor = videoFeedRef.current?.getCurrentDescriptor();
      finalImage = frame || null;
      finalDescriptor = descriptor || null;
    }
    
    if (!finalImage || !regName || !finalDescriptor) {
      alert("Registration data incomplete. Please ensure a face is detected via camera or uploaded photo.");
      return;
    }

    await registerPerson({
      name: regName,
      role: regRole,
      status: isWatchlist ? 'VIP' : (regRole as any),
      imageUrl: finalImage,
      descriptor: finalDescriptor,
      lastSeen: new Date().toLocaleTimeString(),
    });

    setIsRegistering(false);
    setRegName('');
    setIsWatchlist(false);
    setRegImage(null);
    setRegDescriptor(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setRegImage(base64);
      
      // Process face descriptor from image
      const img = new Image();
      img.onload = async () => {
        const descriptor = await videoFeedRef.current?.detectInImage(img);
        if (descriptor) {
          setRegDescriptor(descriptor);
        } else {
          alert("No face detected in the uploaded image. Please try another photo.");
          setRegImage(null);
        }
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedVideoFile(file);
      setActiveTab('monitor');
    }
  };

  const handleMatch = (personId: string, name: string) => {
    const newAlert = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      time: new Date().toLocaleTimeString()
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 3));
    
    // Auto-remove alert after 5 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== newAlert.id));
    }, 5000);
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Shield className="w-12 h-12 text-indigo-500 animate-pulse" />
          <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">Decrypting Neural Links...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-[#0a0a0c] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ 
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }} />
        <div className="relative z-10 w-full max-w-md p-10 bg-[#0f0f12] border border-white/10 rounded-2xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-600/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter italic">Aegis | Rally Intelligence</h1>
          <p className="text-[10px] text-slate-500 mb-10 font-mono uppercase tracking-[0.3em]">Command Center Authentication</p>
          
          <button 
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-4 rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
          >
            <LogIn className="w-5 h-5" />
            Establish Secure Link
          </button>
          
          <p className="mt-8 text-[9px] text-slate-600 font-mono uppercase tracking-[0.2em]">Authorized Access Only // Secure Connection V4.5</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "flex h-screen bg-[#0a0a0c] text-slate-300 font-sans selection:bg-indigo-500/30 overflow-hidden transition-all duration-700",
      alerts.length > 0 && "ring-8 ring-red-600/30 ring-inset"
    )}>
      {/* Sidebar Navigation */}
      <nav className="w-20 flex flex-col items-center py-8 gap-10 border-r border-white/5 bg-[#0f0f12]">
        <div className="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center shadow-lg shadow-indigo-600/20">
          <Shield className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex flex-col gap-8 flex-1">
          <NavButton 
            active={activeTab === 'monitor'} 
            onClick={() => setActiveTab('monitor')}
            icon={<Camera className="w-5 h-5" />} 
            label="Live Feed"
          />
          <NavButton 
            active={activeTab === 'people'} 
            onClick={() => setActiveTab('people')}
            icon={<Database className="w-5 h-5" />} 
            label="Database"
          />
          <NavButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
            icon={<History className="w-5 h-5" />} 
            label="Archive"
          />
        </div>

        <div className="mt-auto flex flex-col gap-8 pb-4">
          <NavButton icon={<Settings className="w-5 h-5" />} label="System Settings" />
          <button 
            onClick={logOut}
            className="p-3 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-white/10 px-8 flex items-center justify-between bg-[#0f0f12]">
          <div className="flex items-center gap-6">
            <h1 className="text-xs font-bold tracking-[0.3em] uppercase text-white italic">
              Aegis <span className="text-indigo-500 font-normal mx-2">|</span> 
              <span className="text-slate-500 font-medium">Command Center</span>
            </h1>
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-indigo-500/5 border border-indigo-500/10 text-[10px] font-mono text-indigo-400">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              SESSION: {user.email?.split('@')[0]}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider text-indigo-400 hover:bg-indigo-500/20 transition-colors cursor-pointer group">
              <LogOut className="w-4 h-4 rotate-90 group-hover:-translate-y-0.5 transition-transform" />
              Upload Video
              <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
            </label>
            {selectedVideoFile && (
              <button 
                onClick={() => setSelectedVideoFile(null)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Live Feed
              </button>
            )}
            <button 
              onClick={() => setIsRegistering(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-indigo-400 hover:bg-indigo-500/10 transition-colors"
            >
              <Users className="w-4 h-4" />
              Enrollment
            </button>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-8 text-[11px] font-mono text-slate-500 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Latency:</span> 0.4ms
              </div>
              <div className="text-slate-300 font-medium">
                {new Date().toLocaleTimeString('en-US', { hour12: false })}
              </div>
            </div>
          </div>
        </header>

        {/* Content Section */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'monitor' && (
            <>
              <div className="flex-1 flex flex-col bg-black relative">
                <VideoFeed 
                  ref={videoFeedRef} 
                  onMatch={handleMatch} 
                  videoFile={selectedVideoFile} 
                  key={selectedVideoFile ? selectedVideoFile.name : 'live'} 
                />
                <StatsGrid crowdCount={12482} identified={people.length} />
                
                {/* Floating Alerts Container */}
                <div className="absolute top-8 right-8 z-[60] flex flex-col gap-4 pointer-events-none">
                  <AnimatePresence>
                    {alerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className="bg-red-600/90 backdrop-blur-xl border border-red-500/50 p-4 rounded-xl shadow-2xl flex items-center gap-4 min-w-[280px]"
                      >
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                          <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Watchlist Alert</div>
                          <div className="text-sm font-bold text-white tracking-tight">{alert.name} DETECTED</div>
                          <div className="text-[9px] font-mono text-white/40 uppercase mt-1">Sighted at {alert.time}</div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
              <Sidebar identifiedPeople={people} />
            </>
          )}

          {activeTab === 'people' && (
            <div className="flex-1 p-10 overflow-y-auto bg-[#0a0a0c]">
              <div className="max-w-6xl mx-auto space-y-10">
                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <div>
                    <h2 className="text-2xl font-light tracking-[0.2em] text-white uppercase mb-2">Personnel Matrix</h2>
                    <p className="text-[10px] font-mono text-slate-500 tracking-widest">{people.length} IDENTITIES ENROLLED</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {people.map(person => (
                    <div key={person.id} className="bg-[#0f0f12] border border-white/10 rounded-2xl overflow-hidden group hover:border-indigo-500/50 transition-all duration-500 shadow-xl">
                      <div className="aspect-[4/5] bg-slate-900 relative">
                        {person.imageUrl ? (
                          <img src={person.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Users className="w-16 h-16 text-slate-800" />
                          </div>
                        )}
                        <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded text-[9px] font-bold text-indigo-400 border border-indigo-400/20 uppercase tracking-widest">
                          {person.status}
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-white text-lg tracking-tight mb-1">{person.name}</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">{person.role}</p>
                        <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-tighter">ID: {person.id}</span>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {people.length === 0 && (
                  <div className="py-32 flex flex-col items-center gap-6 text-slate-700">
                    <Database className="w-16 h-16 stroke-[1]" />
                    <p className="text-[10px] font-mono uppercase tracking-[0.4em]">Substrate database empty</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="flex-1 p-10 overflow-y-auto bg-[#0a0a0c]">
               <div className="max-w-5xl mx-auto space-y-10">
                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <div>
                    <h2 className="text-2xl font-light tracking-[0.2em] text-white uppercase mb-2">Engagement Archive</h2>
                    <p className="text-[10px] font-mono text-slate-500 tracking-widest">{events.length} LOGS CAPTURED</p>
                  </div>
                </div>
                <div className="grid gap-3">
                  {events.map((event) => (
                    <motion.div 
                      key={event.id} 
                      className="flex items-center gap-6 p-5 bg-[#0f0f12] border border-white/5 rounded-xl hover:bg-[#15151a] transition-colors group"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="w-16 h-16 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0 border border-white/5">
                        {event.imageUrl && <img src={event.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-sm font-bold text-white uppercase tracking-wider">Detection Signature</p>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">MATCH VERIFIED</span>
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">Sector Access Node // Port 042</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <p className="text-xs font-mono font-bold text-emerald-400">+{event.confidence}% CONF</p>
                        <p className="text-[10px] font-mono text-slate-600 uppercase">{event.timestamp}</p>
                      </div>
                    </motion.div>
                  ))}
                  {events.length === 0 && (
                     <div className="py-32 flex flex-col items-center gap-6 text-slate-700">
                      <History className="w-16 h-16 stroke-[1]" />
                      <p className="text-[10px] font-mono uppercase tracking-[0.4em]">No archive data found</p>
                    </div>
                  )}
                </div>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Enrollment Modal */}
      <AnimatePresence>
        {isRegistering && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f0f12] border border-white/10 rounded-2xl p-10 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-500" />
                </div>
                <h2 className="text-xl font-light text-white uppercase tracking-[0.2em]">Personnel Enrollment</h2>
              </div>
              
              <div className="space-y-8">
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] transition-all relative group overflow-hidden">
                  {regImage ? (
                    <div className="relative w-full aspect-square">
                      <img src={regImage} className="w-full h-full object-cover rounded-xl" />
                      <button 
                        onClick={() => { setRegImage(null); setRegDescriptor(null); }}
                        className="absolute top-2 right-2 bg-red-600 p-2 rounded-full shadow-lg"
                      >
                        <LogOut className="w-3 h-3 text-white" />
                      </button>
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                         <div className="text-[10px] text-white/60 font-mono flex items-center justify-between">
                            <span>{regDescriptor ? 'Signal: Valid' : 'Processing...'}</span>
                            {regDescriptor && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                         </div>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-3 cursor-pointer">
                      <Camera className="w-8 h-8 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-white uppercase tracking-widest">Upload Identity Image</p>
                        <p className="text-[9px] text-slate-500 font-mono mt-1">Faces will be automatically indexed</p>
                      </div>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Identified Subject</label>
                  <input 
                    type="text" 
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Enter full legal name..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Access Classification</label>
                  <div className="relative">
                    <select 
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white text-sm focus:outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="Citizen">General Visitor</option>
                      <option value="Staff">Security Personnel</option>
                      <option value="VIP">Protected Status (VIP)</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <Search className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={cn(
                      "w-6 h-6 rounded border flex items-center justify-center transition-all",
                      isWatchlist ? "bg-red-600 border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.4)]" : "bg-white/5 border-white/10 group-hover:border-white/20"
                    )}>
                      {isWatchlist && <Shield className="w-4 h-4 text-white" />}
                    </div>
                    <input 
                      type="checkbox" 
                      checked={isWatchlist} 
                      onChange={(e) => setIsWatchlist(e.target.checked)} 
                      className="hidden" 
                    />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider">Flag as Watchlist Priority</span>
                      <span className="text-[9px] text-slate-500 font-mono">Triggers high-priority visual alerts on detection</span>
                    </div>
                  </label>
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    onClick={() => setIsRegistering(false)}
                    className="flex-1 px-6 py-4 rounded-xl text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRegister}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    Confirm Enrollment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "group relative p-3 rounded-xl transition-all duration-300",
        active ? "bg-indigo-500/10 text-indigo-400 shadow-inner" : "text-slate-500 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      {/* Tooltip */}
      <span className="absolute left-full ml-4 px-2 py-1 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-xl">
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="active-nav"
          className="absolute -left-6 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_15px_rgba(99,102,241,0.6)]"
        />
      )}
    </button>
  );
}
