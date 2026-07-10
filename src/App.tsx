import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Target, Star, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { GameScreen, Level } from './types';
import { LEVELS } from './data/levels';
import WelcomeScreen from './components/WelcomeScreen';
import LevelSelector from './components/LevelSelector';
import ArcheryGame from './components/ArcheryGame';
import { audio } from './utils/audio';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('welcome');
  const [activeLevelId, setActiveLevelId] = useState<number>(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<number>(1);
  const [levelStars, setLevelStars] = useState<Record<number, number>>({});
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Load progress from localStorage on boot
  useEffect(() => {
    try {
      const storedMax = localStorage.getItem('archery_max_unlocked');
      if (storedMax) {
        setMaxUnlockedLevel(parseInt(storedMax, 10));
      }

      const storedStars = localStorage.getItem('archery_level_stars');
      if (storedStars) {
        setLevelStars(JSON.parse(storedStars));
      }

      const storedMute = localStorage.getItem('archery_muted');
      if (storedMute) {
        const muted = storedMute === 'true';
        setIsMuted(muted);
        audio.setMute(muted);
      }
    } catch (e) {
      console.warn("Storage read blocked or unsupported in current environment", e);
    }
  }, []);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audio.setMute(nextMuted);
  };

  const handleSelectLevel = (levelId: number) => {
    setActiveLevelId(levelId);
    setScreen('playing');
  };

  const handleLevelComplete = (levelId: number, stars: number) => {
    // 1. Record stars if better than current score
    const currentStarsForLevel = levelStars[levelId] || 0;
    const updatedStars = { ...levelStars };
    if (stars > currentStarsForLevel) {
      updatedStars[levelId] = stars;
      setLevelStars(updatedStars);
    }

    // 2. Unlock next level
    const nextLevelId = levelId + 1;
    let nextMax = maxUnlockedLevel;
    if (nextLevelId <= LEVELS.length && nextLevelId > maxUnlockedLevel) {
      nextMax = nextLevelId;
      setMaxUnlockedLevel(nextLevelId);
    }

    // Save to localStorage
    try {
      localStorage.setItem('archery_max_unlocked', String(nextMax));
      localStorage.setItem('archery_level_stars', JSON.stringify(updatedStars));
    } catch (e) {}

    // 3. Move automatically to the next level if exists, otherwise return to select screen
    if (nextLevelId <= LEVELS.length) {
      setActiveLevelId(nextLevelId);
    } else {
      setScreen('level_select');
    }
  };

  const activeLevel = LEVELS.find((l) => l.id === activeLevelId) || LEVELS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-400 selection:text-slate-950">
      <AnimatePresence mode="wait">
        {screen === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <WelcomeScreen
              onStart={() => setScreen('level_select')}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
            />
          </motion.div>
        )}

        {screen === 'level_select' && (
          <motion.div
            key="level_select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <LevelSelector
              maxUnlockedLevel={maxUnlockedLevel}
              levelStars={levelStars}
              onSelectLevel={handleSelectLevel}
              onBack={() => setScreen('welcome')}
            />
          </motion.div>
        )}

        {screen === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="min-h-screen flex flex-col justify-center items-center py-8 px-4 bg-slate-950"
          >
            <div className="w-full max-w-5xl space-y-6">
              <ArcheryGame
                level={activeLevel}
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
                onLevelComplete={handleLevelComplete}
                onBackToSelector={() => setScreen('level_select')}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
