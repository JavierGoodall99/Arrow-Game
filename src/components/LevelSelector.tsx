import { motion } from 'motion/react';
import { ArrowLeft, Lock, Star, ChevronRight, Sparkles, Flame } from 'lucide-react';
import { LEVELS } from '../data/levels';

interface LevelSelectorProps {
  maxUnlockedLevel: number;
  levelStars: Record<number, number>;
  onSelectLevel: (levelId: number) => void;
  onBack: () => void;
}

export default function LevelSelector({
  maxUnlockedLevel,
  levelStars,
  onSelectLevel,
  onBack
}: LevelSelectorProps) {
  // Sum up total stars earned
  const totalStars = Object.values(levelStars).reduce((sum, s) => sum + s, 0);
  const maxPossibleStars = LEVELS.length * 3;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans relative">
      {/* Decorative background gradients */}
      <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="max-w-6xl w-full mx-auto space-y-8 z-10 relative">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-6">
          <div className="space-y-1">
            <button
              onClick={onBack}
              className="group inline-flex items-center gap-1.5 text-xs font-mono tracking-wider uppercase text-slate-400 hover:text-white transition-colors cursor-pointer select-none"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              BACK TO MAIN
            </button>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
              SELECT YOUR <span className="text-amber-400">RANGE</span>
            </h1>
          </div>

          {/* Stars Counter */}
          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Star className="w-4.5 h-4.5 fill-current" />
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-wider uppercase text-slate-400">Stars Earned</div>
              <div className="font-display font-bold text-sm text-slate-100">
                {totalStars} <span className="text-slate-500">/ {maxPossibleStars}</span>
              </div>
            </div>
            {totalStars > 0 && (
              <div className="ml-2 pl-3 border-l border-slate-800 flex items-center gap-1 text-emerald-400 font-mono text-xs font-bold">
                <Flame className="w-3.5 h-3.5 fill-current text-amber-500" />
                {Math.round((totalStars / maxPossibleStars) * 100)}%
              </div>
            )}
          </div>
        </div>

        {/* Levels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {LEVELS.map((level, idx) => {
            const isUnlocked = level.id <= maxUnlockedLevel;
            const stars = levelStars[level.id] || 0;
            const isLatest = level.id === maxUnlockedLevel;

            return (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.5 }}
              >
                <button
                  disabled={!isUnlocked}
                  onClick={() => onSelectLevel(level.id)}
                  className={`w-full text-left h-full flex flex-col justify-between p-5 rounded-2xl border transition-all text-slate-100 relative ${
                    isUnlocked
                      ? isLatest
                        ? 'bg-gradient-to-br from-slate-900/90 to-slate-950 border-amber-500/40 hover:border-amber-400 shadow-md shadow-amber-500/5 cursor-pointer ring-1 ring-amber-500/10'
                        : 'bg-slate-900/50 border-slate-900 hover:border-slate-800 hover:bg-slate-900/80 cursor-pointer'
                      : 'bg-slate-950/20 border-slate-900/40 opacity-40 cursor-not-allowed select-none'
                  }`}
                >
                  <div className="space-y-3 w-full">
                    {/* Card Header */}
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-xs px-2.5 py-1 rounded-lg font-bold border ${
                        isUnlocked
                          ? isLatest
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-slate-800/40 text-slate-400 border-slate-800'
                          : 'bg-slate-950/40 text-slate-600 border-slate-900'
                      }`}>
                        LEVEL {level.id < 10 ? `0${level.id}` : level.id}
                      </span>

                      {/* Status / Locks / Stars */}
                      {isUnlocked ? (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${
                                s <= stars
                                  ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_2px_rgba(251,191,36,0.2)]'
                                  : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      ) : (
                        <Lock className="w-4 h-4 text-slate-600" />
                      )}
                    </div>

                    {/* Level Title */}
                    <h3 className="font-display font-bold text-lg leading-tight text-white flex items-center gap-1.5">
                      {level.name}
                      {isLatest && isUnlocked && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      )}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {level.description}
                    </p>
                  </div>

                  {/* Indicators bottom line */}
                  <div className="mt-5 pt-4 border-t border-slate-900/60 w-full flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-3">
                      <span>Arrows: <strong className="text-slate-200">{level.arrowLimit}</strong></span>
                      {level.windEnabled && (
                        <span className="text-amber-500">Wind</span>
                      )}
                      {!level.allowTrajectory && (
                        <span className="text-rose-500">Blind</span>
                      )}
                    </div>
                    {isUnlocked && (
                      <span className="group-hover:text-amber-400 flex items-center gap-0.5 font-bold transition-colors">
                        Aim
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
