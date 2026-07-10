import { Target as TargetIcon, Compass, Sparkles, Volume2, VolumeX, RotateCcw, Menu, ArrowRight, ListTodo, Star } from 'lucide-react';
import { Level } from '../types';

interface GameHUDProps {
  level: Level;
  arrowsRemaining: number;
  score: number;
  targetsHitCount: number;
  totalTargetsCount: number;
  currentWind: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onRestart: () => void;
  onPause: () => void;
  onBackToSelector: () => void;
}

export default function GameHUD({
  level,
  arrowsRemaining,
  score,
  targetsHitCount,
  totalTargetsCount,
  currentWind,
  isMuted,
  onToggleMute,
  onRestart,
  onPause,
  onBackToSelector
}: GameHUDProps) {
  // Determine wind text
  let windText = "Calm";
  let windColor = "text-slate-400";
  if (level.windEnabled) {
    const absWind = Math.abs(currentWind);
    if (absWind < 0.8) {
      windText = "Still";
      windColor = "text-slate-500";
    } else if (absWind < 2.0) {
      windText = currentWind > 0 ? "Light Tailwind" : "Light Headwind";
      windColor = "text-emerald-400";
    } else if (absWind < 4.0) {
      windText = currentWind > 0 ? "Brisk Tailwind" : "Brisk Headwind";
      windColor = "text-amber-400";
    } else {
      windText = currentWind > 0 ? "Howling Tailwind" : "Howling Headwind";
      windColor = "text-rose-400 animate-pulse";
    }
  }

  // Find stars earned currently
  const getStarsCount = () => {
    if (score >= level.starRatings.three) return 3;
    if (score >= level.starRatings.two) return 2;
    if (score >= level.starRatings.one) return 1;
    return 0;
  };

  const currentStars = getStarsCount();

  return (
    <div className="w-full select-none font-sans text-slate-200">
      {/* Top Bar Overlay */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 p-4 rounded-2xl shadow-xl">
        
        {/* Left Side: Level Name & Back Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToSelector}
            className="p-2 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-xl text-slate-400 transition-colors cursor-pointer"
            title="All levels"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] font-bold text-amber-400 tracking-wider uppercase bg-amber-400/10 px-2 py-0.5 rounded-md">
                LEVEL {level.id < 10 ? `0${level.id}` : level.id}
              </span>
              {!level.allowTrajectory && (
                <span className="font-mono text-[10px] font-bold text-rose-500 tracking-wider uppercase bg-rose-500/10 px-2 py-0.5 rounded-md animate-pulse">
                  BLIND AIM
                </span>
              )}
            </div>
            <h2 className="font-display font-extrabold text-base sm:text-lg text-white leading-tight">
              {level.name}
            </h2>
          </div>
        </div>

        {/* Center: Score Progress & Star Goals */}
        <div className="flex-1 max-w-sm px-4 hidden lg:block">
          <div className="flex justify-between items-center text-[11px] font-mono mb-1.5">
            <span className="text-slate-400">Score Progress</span>
            <span className="text-amber-400 font-bold">{score} pts</span>
          </div>
          {/* Custom progress bar showing star milestones */}
          <div className="relative h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            {/* 1 Star marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-500/50 z-10"
              style={{ left: `${Math.min(100, (level.starRatings.one / level.starRatings.three) * 100)}%` }}
            />
            {/* 2 Star marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-500/50 z-10"
              style={{ left: `${Math.min(100, (level.starRatings.two / level.starRatings.three) * 100)}%` }}
            />
            
            {/* Filled status */}
            <div
              className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, (score / level.starRatings.three) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
            <span>Pass: {level.targetScore}</span>
            <span>⭐ {level.starRatings.one}</span>
            <span>⭐⭐ {level.starRatings.two}</span>
            <span>⭐⭐⭐ {level.starRatings.three}</span>
          </div>
        </div>

        {/* Targets Hit tracker */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-950/60 rounded-xl border border-slate-800/40">
          <TargetIcon className={`w-4 h-4 ${targetsHitCount === totalTargetsCount ? 'text-emerald-400' : 'text-slate-400'}`} />
          <div className="text-xs">
            <span className="font-mono text-slate-500 uppercase mr-1">Targets:</span>
            <span className={`font-mono font-bold ${targetsHitCount === totalTargetsCount ? 'text-emerald-400' : 'text-slate-200'}`}>
              {targetsHitCount} / {totalTargetsCount}
            </span>
          </div>
        </div>

        {/* Dynamic Wind gauge */}
        {level.windEnabled ? (
          <div className="flex items-center gap-3 px-3.5 py-1.5 bg-slate-950/60 rounded-xl border border-slate-800/40 min-w-[125px]">
            <Compass className={`w-5 h-5 ${Math.abs(currentWind) > 3.0 ? 'animate-spin' : ''} ${windColor}`} style={{ animationDuration: '6s' }} />
            <div>
              <div className="text-[9px] font-mono text-slate-500 uppercase leading-none">Wind Force</div>
              <div className={`font-display font-bold text-xs leading-tight ${windColor}`}>
                {currentWind > 0 ? `+${currentWind.toFixed(1)}` : currentWind.toFixed(1)}
              </div>
              <div className="text-[9px] font-mono text-slate-400 leading-none">{windText}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-950/20 rounded-xl border border-slate-800/20 opacity-40">
            <Compass className="w-4 h-4 text-slate-600" />
            <span className="font-mono text-xs text-slate-500 uppercase">Wind Disabled</span>
          </div>
        )}

        {/* Right Controls: Mute & Restart */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 transition-colors text-slate-400 hover:text-white cursor-pointer"
            title={isMuted ? "Unmute sound" : "Mute sound"}
          >
            {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
          </button>
          
          <button
            onClick={onRestart}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold"
            title="Reset range (R)"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">RESET</span>
          </button>
        </div>
      </div>

      {/* Floating Indicators Block: Stars & Ammo */}
      <div className="flex items-center justify-between gap-6 mt-3 px-1">
        {/* Active Stars */}
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              className={`w-5 h-5 transition-transform duration-300 ${
                s <= currentStars
                  ? 'text-amber-400 fill-amber-400 scale-110 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]'
                  : 'text-slate-800'
              }`}
            />
          ))}
          <span className="text-xs font-mono font-semibold text-slate-400 ml-1.5">
            {currentStars === 3 ? "PERFECT!" : currentStars > 0 ? `${currentStars} Star Rating` : "Aim for high scores!"}
          </span>
        </div>

        {/* Ammunition Rack */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Ammo:</span>
          <div className="flex gap-1.5">
            {Array.from({ length: level.arrowLimit }).map((_, i) => {
              const isAvailable = i < arrowsRemaining;
              return (
                <div
                  key={i}
                  className={`w-2.5 h-6 rounded-md border transition-all duration-300 ${
                    isAvailable
                      ? 'bg-amber-400 border-amber-300 shadow-sm shadow-amber-400/30'
                      : 'bg-slate-950/80 border-slate-900 opacity-20'
                  }`}
                  title={`${arrowsRemaining} arrows left`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
