import { motion } from 'motion/react';
import { Target, Compass, Sparkles, Volume2, VolumeX, ArrowUpRight } from 'lucide-react';

interface WelcomeScreenProps {
  onStart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export default function WelcomeScreen({ onStart, isMuted, onToggleMute }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 overflow-hidden relative font-sans">
      {/* Decorative ambient background spots */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="max-w-6xl w-full mx-auto flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <span className="font-display font-bold tracking-wider text-sm uppercase text-slate-300">Aero Range</span>
        </div>

        <button
          onClick={onToggleMute}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-sm text-slate-400 hover:text-white"
          title={isMuted ? "Unmute sounds" : "Mute sounds"}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          <span className="text-xs font-medium font-mono hidden sm:inline">
            {isMuted ? "MUTED" : "SOUNDS ON"}
          </span>
        </button>
      </header>

      {/* Main hero section */}
      <main className="max-w-4xl w-full mx-auto flex flex-col items-center text-center my-auto z-10 gap-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-4"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs font-semibold tracking-wider uppercase">
            <Target className="w-3.5 h-3.5 animate-spin-slow" />
            Physics-Based Archery Engine
          </div>

          <h1 className="text-5xl sm:text-7xl font-display font-extrabold tracking-tight bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent drop-shadow-sm select-none">
            ARCHERY <span className="text-amber-400">CHALLENGE</span>
          </h1>

          <p className="text-slate-400 max-w-xl mx-auto text-base sm:text-lg leading-relaxed font-sans">
            Draw back, align your angle, judge the wind, and release. A minimalist 10-level archery range simulating gravity, drag, wall sieges, and dynamic weather.
          </p>
        </motion.div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="z-10"
        >
          <button
            onClick={onStart}
            className="group px-8 py-4.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-lg rounded-2xl transition-all shadow-xl hover:shadow-amber-400/25 flex items-center gap-3 cursor-pointer select-none transform active:scale-98"
          >
            ENTER THE RANGE
            <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-0.5" />
          </button>
        </motion.div>

        {/* Dynamic visual layout of instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-6"
        >
          {/* Card 1 */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900/80 text-left space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <span className="font-mono font-bold text-sm">01</span>
            </div>
            <h3 className="font-display font-bold text-sm text-slate-200">Draw & Set Power</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Click and drag (or touch) anywhere on screen to pull back the bowstring. Distance controls the launch velocity.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900/80 text-left space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <span className="font-mono font-bold text-sm">02</span>
            </div>
            <h3 className="font-display font-bold text-sm text-slate-200">Visual Trajectory</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Adjust your vertical launch angle. Dotted line simulates gravity's arc—but disappears in later levels!
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900/80 text-left space-y-2">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
              <span className="font-mono font-bold text-sm">03</span>
            </div>
            <h3 className="font-display font-bold text-sm text-slate-200">Escalating Elements</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Wind gauge indicators show horizontal gale force. Re-calculate shots to curve over towering castle walls.
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center z-10 text-xs text-slate-500 border-t border-slate-900 py-4 mt-6">
        <p className="font-mono">PROJECTILE MATH (GRAVITY: 0.15px/frame² • AIR DRAG • WIND VECTORS)</p>
      </footer>
    </div>
  );
}
