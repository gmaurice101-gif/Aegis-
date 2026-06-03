import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import Human, { type Human as HumanInstance } from '@vladmandic/human';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, AlertCircle, Scan, RefreshCw, BrainCircuit, Sparkles, Bell } from 'lucide-react';
import { humanConfig } from '../lib/humanConfig';
import { cn } from '../lib/utils';
import { analyzeCrowd } from '../services/geminiService';
import { useFirebase } from '../lib/FirebaseProvider';

export interface VideoFeedHandle {
  captureFrame: () => string | null;
  getCurrentDescriptor: () => number[] | null;
  detectInImage: (imageElement: HTMLImageElement) => Promise<number[] | null>;
}

const VideoFeed = forwardRef<VideoFeedHandle, { onMatch?: (personId: string, name: string) => void, videoFile?: File | null }>((props, ref) => {
  const { logEvent, people } = useFirebase();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const humanRef = useRef<HumanInstance | null>(null);
  const [status, setStatus] = useState<string>('Initializing AI...');
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const lastLogTime = useRef<number>(0);
  const currentDescriptor = useRef<number[] | null>(null);

  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      if (!videoRef.current) return null;
      const offscreen = document.createElement('canvas');
      offscreen.width = videoRef.current.videoWidth;
      offscreen.height = videoRef.current.videoHeight;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        return offscreen.toDataURL('image/jpeg', 0.8);
      }
      return null;
    },
    getCurrentDescriptor: () => currentDescriptor.current,
    detectInImage: async (imageElement: HTMLImageElement) => {
      if (!humanRef.current) return null;
      const result = await humanRef.current.detect(imageElement);
      if (result.face.length > 0) {
        return result.face[0].embedding || null;
      }
      return null;
    }
  }));

  const handleAIAnalysis = async () => {
    if (isAnalyzing) return;
    
    const imageData = (ref as any).current?.captureFrame();
    if (!imageData) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    const result = await analyzeCrowd(imageData);
    setAnalysisResult(result || "No insights found.");
    setIsAnalyzing(false);
  };

  useEffect(() => {
    async function initHuman() {
      try {
        const human = new Human(humanConfig);
        setStatus('Loading models...');
        await human.load();
        humanRef.current = human;
        
        if (props.videoFile) {
          setStatus('Processing video file...');
          if (videoRef.current) {
            videoRef.current.src = URL.createObjectURL(props.videoFile);
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              setIsReady(true);
              setStatus('Video Analysis Active');
              detect();
            };
          }
        } else {
          setStatus('Initializing camera...');
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              setIsReady(true);
              setStatus('System Online');
              detect();
            };
          }
        }
      } catch (err) {
        console.error('Human Init Error:', err);
        setError('Camera access denied or hardware error');
        setStatus('System Failed');
      }
    }

    async function detect() {
      if (!videoRef.current || !canvasRef.current || !humanRef.current) return;
      
      const result = await humanRef.current.detect(videoRef.current);
      
      // Re-verify refs after await as component might have unmounted
      if (!videoRef.current || !canvasRef.current || !humanRef.current) return;
      
      const ctx = canvasRef.current.getContext('2d');
      if (ctx && canvasRef.current.width > 0 && canvasRef.current.height > 0) {
        humanRef.current.draw.all(canvasRef.current, result);
      }

      // Update current descriptor for registration
      if (result.face.length > 0) {
        currentDescriptor.current = result.face[0].embedding || null;
      } else {
        currentDescriptor.current = null;
      }

      // Match against watchlist
      if (result.face.length > 0 && people.length > 0) {
        for (const face of result.face) {
          if (!face.embedding) continue;
          
          for (const person of people) {
            if (!person.descriptor) continue;
            
            // Calculate similarity (Cosine distance)
            const similarity = humanRef.current.match.similarity(face.embedding, person.descriptor);
            
            if (similarity > 0.82) {
              // High confidence match found
              const isPriority = person.status === 'VIP';
              
              if (Date.now() - lastLogTime.current > 10000) { // Throttle alerts to 10s
                const frame = (ref as any).current?.captureFrame();
                logEvent({
                  personId: person.id,
                  confidence: Math.round(similarity * 100),
                  location: isPriority ? 'WATCHLIST HIT - SECTOR 1' : 'Main Entrance - Managed Guard',
                  imageUrl: frame || undefined
                });
                
                if (isPriority || similarity > 0.9) {
                  props.onMatch?.(person.id, person.name);
                }
                lastLogTime.current = Date.now();
              }
              break;
            }
          }
        }
      }

      // Auto-log unknown high confidence detections (fallback)
      if (result.face.length > 0 && people.length === 0 && Date.now() - lastLogTime.current > 15000) {
        const bestFace = result.face[0];
        if (bestFace.score > 0.9) {
          const frame = (ref as any).current?.captureFrame();
          logEvent({
            confidence: Math.round(bestFace.score * 100),
            location: 'Main Entrance - Auto Signal',
            imageUrl: frame || undefined
          });
          lastLogTime.current = Date.now();
        }
      }
      
      requestAnimationFrame(detect);
    }

    initHuman();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden border-b border-white/5">
      <video 
        ref={videoRef} 
        className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale-[0.2]" 
        muted 
        playsInline 
      />
      
      <canvas 
        ref={canvasRef} 
        width={1280}
        height={720}
        className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none" 
      />

      {/* Decorative Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-10">
        <div className="w-full h-full" style={{ 
          backgroundImage: 'radial-gradient(circle, #ffffff 0.5px, transparent 0.5px)', 
          backgroundSize: '30px 30px' 
        }} />
      </div>

      <AnimatePresence>
        {isReady && (
          <motion.div 
            initial={{ top: '0%' }}
            animate={{ top: '100%' }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-[1px] bg-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.5)] z-30"
          />
        )}
      </AnimatePresence>

      <UIFrame />

      {/* Control Buttons - HUD Analytics Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-6 flex items-center gap-4">
        <div className="flex-1 h-12 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center px-6 gap-4 shadow-2xl">
           <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
           <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
             <motion.div 
              initial={{ width: '66%' }}
              animate={{ width: isAnalyzing ? '100%' : '66%' }}
              className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
             />
           </div>
           <span className="text-[10px] uppercase font-bold text-white tracking-widest whitespace-nowrap">Threat Level: Low</span>
        </div>

        <button 
          onClick={handleAIAnalysis}
          disabled={!isReady || isAnalyzing}
          className={cn(
            "p-3 rounded-full transition-all duration-300",
            isAnalyzing 
              ? "bg-white/10 text-white/40 cursor-wait" 
              : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 active:scale-95 border border-indigo-400/20"
          )}
        >
          {isAnalyzing ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <BrainCircuit className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* AI Analysis Modal */}
      <AnimatePresence>
        {analysisResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="absolute inset-x-8 bottom-24 z-50 bg-[#0f0f12]/95 backdrop-blur-2xl border border-indigo-500/30 rounded-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-h-[40%] overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white">Neural Intelligence Feed</h3>
              </div>
              <button 
                onClick={() => setAnalysisResult(null)}
                className="text-[9px] font-mono text-slate-500 hover:text-white transition-colors uppercase tracking-widest px-3 py-1 bg-white/5 rounded-md"
              >
                Terminate View
              </button>
            </div>
            <div className="text-[11px] leading-relaxed text-slate-400 font-medium space-y-4">
              {analysisResult.split('\n').map((line, i) => (
                <p key={i} className="border-l-2 border-indigo-500/10 pl-4 py-1">{line}</p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isReady && !error && (
        <div className="flex flex-col items-center gap-6 z-40">
          <div className="relative">
            <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 animate-pulse uppercase tracking-[0.4em]">
            Calibrating Optical Sensors...
          </span>
        </div>
      )}
    </div>
  );
});

export default VideoFeed;

function UIFrame() {
  return (
    <div className="absolute inset-0 p-8 pointer-events-none z-30">
      {/* HUD Corners */}
      <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-indigo-500/40" />
      <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-indigo-500/40" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-indigo-500/40" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-indigo-500/40" />
      
      {/* Top Labels */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-8">
        <div className="px-3 py-1 bg-black/60 border border-white/10 rounded text-[9px] text-white font-mono uppercase tracking-widest">
          CAM_ID: 0042_RALLY_NORTH
        </div>
        <div className="px-3 py-1 bg-red-600/60 border border-red-500/50 rounded text-[9px] text-white font-bold uppercase tracking-widest animate-pulse flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-white rounded-full" />
          Recording
        </div>
      </div>

      {/* Side HUD Elements */}
      <div className="absolute left-8 top-1/3 w-32 h-32 border border-indigo-400/20 flex flex-col justify-end p-2 opacity-50">
        <div className="text-[7px] text-indigo-400 font-mono uppercase tracking-tighter">Scanning...</div>
        <div className="w-full h-1 bg-indigo-500/20 mt-1 relative overflow-hidden">
          <div className="absolute inset-0 bg-indigo-500 animate-[scan_2s_ease-in-out_infinite]" />
        </div>
      </div>

      <div className="absolute right-8 bottom-1/3 w-24 h-24 border border-emerald-400/20 flex flex-col justify-end p-2 opacity-50">
        <div className="text-[7px] text-emerald-400 font-mono uppercase tracking-tighter">Verified Area</div>
        <div className="w-full h-1 bg-emerald-500/20 mt-1" />
      </div>
      
      {/* Side Labels */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 [writing-mode:vertical-rl] text-[9px] font-mono text-slate-600 tracking-[0.5em] uppercase">
        Aegis Neural Stream // Node 042
      </div>
      <div className="absolute right-8 top-1/2 -translate-y-1/2 [writing-mode:vertical-rl] text-[9px] font-mono text-slate-600 tracking-[0.5em] uppercase">
        Encrypted | Layer 7
      </div>
    </div>
  );
}
