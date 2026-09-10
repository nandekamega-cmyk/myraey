import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, INITIAL_STATE, getUpgradeCost, getAntStage, formatNumber } from './gameData';
import { playTapSound, playBonusSound, playUpgradeSound, playAchievementSound, vibrate } from './sounds';

interface FloatingText {
  id: number;
  x: number;
  y: number;
  value: string;
  isBonus: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
}

interface AchievementPopup {
  id: number;
  name: string;
  icon: string;
  reward: number;
}

// Yandex Games SDK
let ysdk: any = null;
let player: any = null;

async function initYandexSDK() {
  try {
    if (typeof (window as any).YaGames !== 'undefined') {
      ysdk = await (window as any).YaGames.init();
      player = await ysdk.getPlayer();
      console.log('Yandex SDK initialized');
    }
  } catch (e) {
    console.log('Yandex SDK not available, running in standalone mode');
  }
}

function showRewardedAd(onReward: () => void, onClose: () => void) {
  if (ysdk) {
    ysdk.adv.showRewardedVideo({
      callbacks: {
        onOpen: () => {},
        onRewarded: () => onReward(),
        onClose: () => onClose(),
        onError: () => onClose(),
      }
    });
  } else {
    // Demo mode - simulate ad
    setTimeout(() => onReward(), 500);
    setTimeout(() => onClose(), 1000);
  }
}

function saveGame(state: GameState) {
  try {
    localStorage.setItem('antClicker', JSON.stringify({ ...state, lastSaveTime: Date.now() }));
    if (player && player.setData) {
      player.setData({ gameData: state }).catch(() => {});
    }
  } catch (e) {}
}

function loadGame(): GameState | null {
  try {
    const saved = localStorage.getItem('antClicker');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

export default function App() {
  const [state, setState] = useState<GameState>(() => {
    const saved = loadGame();
    if (saved) {
      // Calculate offline earnings
      const elapsed = (Date.now() - saved.lastSaveTime) / 1000;
      const offlineEarnings = Math.floor(elapsed * saved.perSecond * saved.prestigeMultiplier * 0.5);
      if (offlineEarnings > 0) {
        saved.food += offlineEarnings;
        saved.totalEarned += offlineEarnings;
      }
      return saved;
    }
    return { ...INITIAL_STATE, upgrades: INITIAL_STATE.upgrades.map(u => ({ ...u })), achievements: INITIAL_STATE.achievements.map(a => ({ ...a })) };
  });

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [achievementPopups, setAchievementPopups] = useState<AchievementPopup[]>([]);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [offlineEarnings, setOfflineEarnings] = useState(0);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showPrestige, setShowPrestige] = useState(false);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [antEmotion, setAntEmotion] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [showGoldenFind, setShowGoldenFind] = useState(false);
  const [goldenFindPos, setGoldenFindPos] = useState({ x: 50, y: 50 });
  const [tapRings, setTapRings] = useState<{ id: number; x: number; y: number }[]>([]);
  const [antJump, setAntJump] = useState(false);
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [isFrenzyMode, setIsFrenzyMode] = useState(true);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const textIdRef = useRef(0);
  const particleIdRef = useRef(0);
  const ringIdRef = useRef(0);

  // Check offline earnings on mount
  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      const elapsed = (Date.now() - saved.lastSaveTime) / 1000;
      const earnings = Math.floor(elapsed * saved.perSecond * saved.prestigeMultiplier * 0.5);
      if (earnings > 10) {
        setOfflineEarnings(earnings);
        setShowOfflineModal(true);
      }
    }
    initYandexSDK();
  }, []);

  // Check daily reward
  useEffect(() => {
    const today = new Date().toDateString();
    if (state.dailyRewardClaimed !== today) {
      setTimeout(() => setShowDailyReward(true), 2000);
    }
  }, []);

  // Frenzy mode timer
  useEffect(() => {
    const timeout = setTimeout(() => setIsFrenzyMode(false), 15000);
    return () => clearTimeout(timeout);
  }, []);

  // Passive income
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const income = prev.perSecond * prev.prestigeMultiplier * (prev.x3Active ? 3 : 1);
        if (income <= 0) return prev;
        return {
          ...prev,
          food: prev.food + income / 10,
          totalEarned: prev.totalEarned + income / 10,
        };
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Auto-save
  useEffect(() => {
    const interval = setInterval(() => {
      saveGame(state);
    }, 5000);
    return () => clearInterval(interval);
  }, [state]);

  // Check achievements
  useEffect(() => {
    const newAchievements: AchievementPopup[] = [];
    setState(prev => {
      let changed = false;
      const newAch = prev.achievements.map(a => {
        if (!a.unlocked && a.condition(prev)) {
          changed = true;
          newAchievements.push({ id: Date.now() + Math.random(), name: a.name, icon: a.icon, reward: a.reward });
          return { ...a, unlocked: true };
        }
        return a;
      });
      if (!changed) return prev;
      return { ...prev, achievements: newAch };
    });

    if (newAchievements.length > 0) {
      newAchievements.forEach((ach, i) => {
        setTimeout(() => {
          playAchievementSound();
          vibrate([50, 30, 50]);
          setAchievementPopups(prev => [...prev, ach]);
          setState(prev => ({ ...prev, food: prev.food + ach.reward, totalEarned: prev.totalEarned + ach.reward }));
          setTimeout(() => {
            setAchievementPopups(prev => prev.filter(p => p.id !== ach.id));
          }, 3000);
        }, i * 1500);
      });
    }
  }, [state.totalTaps, state.totalEarned, state.bonusCount, state.prestigeLevel]);

  // Random golden find
  useEffect(() => {
    let active = true;
    let hideTimeout: ReturnType<typeof setTimeout>;
    let spawnTimeout: ReturnType<typeof setTimeout>;

    const spawnGolden = () => {
      if (!active) return;
      const delay = 15000 + Math.random() * 20000;
      spawnTimeout = setTimeout(() => {
        if (!active) return;
        setShowGoldenFind(true);
        setGoldenFindPos({ x: 15 + Math.random() * 70, y: 20 + Math.random() * 50 });
        hideTimeout = setTimeout(() => {
          if (active) setShowGoldenFind(false);
          spawnGolden();
        }, 5000);
      }, delay);
    };
    spawnGolden();
    return () => {
      active = false;
      clearTimeout(spawnTimeout);
      clearTimeout(hideTimeout);
    };
  }, []);

  // X3 timer check
  useEffect(() => {
    if (state.x3Active && Date.now() > state.x3EndTime) {
      setState(prev => ({ ...prev, x3Active: false }));
    }
    const interval = setInterval(() => {
      if (state.x3Active && Date.now() > state.x3EndTime) {
        setState(prev => ({ ...prev, x3Active: false }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [state.x3Active, state.x3EndTime]);

  // Calculate ant level
  useEffect(() => {
    const totalUpgrades = state.upgrades.reduce((sum, u) => sum + u.level, 0);
    setState(prev => {
      const newLevel = totalUpgrades + Math.floor(prev.totalTaps / 50);
      if (newLevel !== prev.antLevel) {
        return { ...prev, antLevel: newLevel };
      }
      return prev;
    });
  }, [state.upgrades, state.totalTaps]);

  const spawnParticles = useCallback((x: number, y: number, isBonus: boolean) => {
    const count = isBonus ? 20 : 8;
    const newParticles: Particle[] = [];
    const colors = isBonus
      ? ['#FFD700', '#FFA500', '#FF6347', '#FF69B4', '#00FF00', '#00BFFF']
      : ['#8B4513', '#A0522D', '#D2691E', '#CD853F'];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const distance = 40 + Math.random() * 80;
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.includes(p)));
    }, 800);
  }, []);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX || rect.left + rect.width / 2;
      clientY = e.touches[0]?.clientY || rect.top + rect.height / 2;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const isEarlyGame = isFrenzyMode;
    const bonusChance = isEarlyGame ? 0.3 : 0.15;
    const isBonus = Math.random() < bonusChance;

    let earned = state.clickPower * state.prestigeMultiplier * (state.x3Active ? 3 : 1);
    if (isBonus) {
      const bonusAmount = isEarlyGame ? (5 + Math.floor(Math.random() * 10)) : (5 + Math.floor(Math.random() * 6));
      earned += bonusAmount;
      playBonusSound();
      vibrate([30, 20, 60]);
    } else {
      playTapSound();
      vibrate(20);
    }

    setState(prev => ({
      ...prev,
      food: prev.food + earned,
      totalEarned: prev.totalEarned + earned,
      totalTaps: prev.totalTaps + 1,
      bonusCount: isBonus ? prev.bonusCount + 1 : prev.bonusCount,
    }));

    // Floating text
    const textId = textIdRef.current++;
    const floatText: FloatingText = {
      id: textId,
      x: x + (Math.random() - 0.5) * 40,
      y: y - 20,
      value: `+${formatNumber(earned)}`,
      isBonus,
    };
    setFloatingTexts(prev => [...prev, floatText]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== textId));
    }, 1000);

    // Particles
    spawnParticles(x, y, isBonus);

    // Ant emotion
    const emotions = isBonus ? ['😍', '🤩', '🥳', '💫'] : ['😊', '😄', '🙂', '😎'];
    setAntEmotion(emotions[Math.floor(Math.random() * emotions.length)]);
    setTimeout(() => setAntEmotion(''), 600);

    // Shake
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 300);

    // Ant jump
    setAntJump(true);
    setTimeout(() => setAntJump(false), 300);

    // Tap ring
    const ringId = ringIdRef.current++;
    setTapRings(prev => [...prev, { id: ringId, x, y }]);
    setTimeout(() => setTapRings(prev => prev.filter(r => r.id !== ringId)), 500);

    // Combo
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    setCombo(prev => {
      const newCombo = prev + 1;
      if (newCombo >= 3) {
        setShowCombo(true);
        setTimeout(() => setShowCombo(false), 800);
      }
      return newCombo;
    });
    comboTimerRef.current = setTimeout(() => setCombo(0), 1000);
  }, [state.clickPower, state.prestigeMultiplier, state.x3Active, spawnParticles, isFrenzyMode, combo]);

  const handleGoldenFind = useCallback(() => {
    const reward = Math.floor(50 + state.totalEarned * 0.05);
    setState(prev => ({
      ...prev,
      food: prev.food + reward,
      totalEarned: prev.totalEarned + reward,
    }));
    setShowGoldenFind(false);
    playBonusSound();
    vibrate([50, 30, 50, 30, 100]);

    const textId = textIdRef.current++;
    setFloatingTexts(prev => [...prev, {
      id: textId,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      value: `🌟 +${formatNumber(reward)}`,
      isBonus: true,
    }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== textId)), 1500);
  }, [state.totalEarned]);

  const buyUpgrade = useCallback((upgradeId: string) => {
    setState(prev => {
      const upgrade = prev.upgrades.find(u => u.id === upgradeId);
      if (!upgrade) return prev;
      const cost = getUpgradeCost(upgrade);
      if (prev.food < cost) return prev;

      const newUpgrades = prev.upgrades.map(u => {
        if (u.id === upgradeId) return { ...u, level: u.level + 1 };
        return u;
      });

      const newClickPower = 1 + newUpgrades.reduce((sum, u) => sum + (u.perClick || 0) * u.level, 0);
      const newPerSecond = newUpgrades.reduce((sum, u) => sum + (u.perSecond || 0) * u.level, 0);

      playUpgradeSound();
      vibrate(40);

      return {
        ...prev,
        food: prev.food - cost,
        upgrades: newUpgrades,
        clickPower: newClickPower,
        perSecond: newPerSecond,
      };
    });
  }, []);

  const handlePrestige = useCallback(() => {
    const newPrestige = state.prestigeLevel + 1;
    const newMultiplier = 1 + newPrestige * 0.5;
    setState({
      ...INITIAL_STATE,
      upgrades: INITIAL_STATE.upgrades.map(u => ({ ...u })),
      achievements: state.achievements.map(a => ({ ...a })),
      prestigeLevel: newPrestige,
      prestigeMultiplier: newMultiplier,
      bonusCount: state.bonusCount,
      dailyRewardClaimed: state.dailyRewardClaimed,
      lastSaveTime: Date.now(),
    });
    setShowPrestige(false);
    playAchievementSound();
    vibrate([100, 50, 100, 50, 200]);
  }, [state]);

  const claimDailyReward = useCallback(() => {
    const today = new Date().toDateString();
    const reward = 100 * (state.prestigeLevel + 1);
    setState(prev => ({
      ...prev,
      food: prev.food + reward,
      totalEarned: prev.totalEarned + reward,
      dailyRewardClaimed: today,
    }));
    setShowDailyReward(false);
    playBonusSound();
    vibrate([50, 30, 100]);
  }, [state.prestigeLevel]);

  const handleX3 = useCallback(() => {
    showRewardedAd(
      () => {
        setState(prev => ({
          ...prev,
          x3Active: true,
          x3EndTime: Date.now() + 15000,
        }));
        playBonusSound();
        vibrate([30, 20, 30, 20, 100]);
      },
      () => {}
    );
  }, []);

  const antStage = getAntStage(state.antLevel);
  const progressToNext = (() => {
    const stages = [0, 5, 15, 30, 50, 80, 120, 200];
    const currentIdx = stages.findIndex((s, i) => i === stages.length - 1 || state.antLevel < stages[i + 1]);
    const currentMin = stages[currentIdx];
    const nextMin = stages[Math.min(currentIdx + 1, stages.length - 1)];
    if (currentIdx >= stages.length - 1) return 100;
    return Math.min(100, ((state.antLevel - currentMin) / (nextMin - currentMin)) * 100);
  })();

  const x3Remaining = state.x3Active ? Math.max(0, Math.ceil((state.x3EndTime - Date.now()) / 1000)) : 0;

  return (
    <div className="game-bg w-full h-full flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{antStage.icon}</span>
          <div>
            <div className="text-yellow-300 font-bold text-lg leading-tight">{formatNumber(state.food)} 🍎</div>
            <div className="text-yellow-100/60 text-xs">+{formatNumber(state.perSecond * state.prestigeMultiplier * (state.x3Active ? 3 : 1))}/сек</div>
          </div>
        </div>
        <div className="flex gap-2">
          {state.prestigeLevel > 0 && (
            <div className="bg-purple-500/30 px-2 py-1 rounded-full text-purple-200 text-xs font-bold">
              ✨ x{state.prestigeMultiplier.toFixed(1)}
            </div>
          )}
          {state.x3Active && (
            <div className="bg-yellow-500/30 px-2 py-1 rounded-full text-yellow-200 text-xs font-bold animate-pulse">
              x3 ⏱{x3Remaining}с
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-yellow-200/70">{antStage.name}</span>
          <div className="flex-1 h-2 bg-black/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
          <span className="text-xs text-yellow-200/70">Ур.{state.antLevel}</span>
        </div>
      </div>

      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[10%] left-[5%] text-4xl animate-wiggle" style={{ animationDelay: '0s', animationDuration: '3s' }}>🐜</div>
        <div className="absolute top-[30%] right-[8%] text-3xl animate-wiggle" style={{ animationDelay: '1s', animationDuration: '4s' }}>🐜</div>
        <div className="absolute bottom-[25%] left-[12%] text-2xl animate-wiggle" style={{ animationDelay: '2s', animationDuration: '3.5s' }}>🐜</div>
        <div className="absolute top-[60%] right-[15%] text-3xl animate-wiggle" style={{ animationDelay: '0.5s', animationDuration: '2.8s' }}>🐜</div>
        <div className="absolute top-[15%] left-[60%] text-2xl animate-wiggle" style={{ animationDelay: '1.5s', animationDuration: '3.2s' }}>🍄</div>
        <div className="absolute bottom-[15%] right-[25%] text-3xl animate-wiggle" style={{ animationDelay: '2.5s', animationDuration: '4s' }}>🍃</div>
      </div>

      {/* Main tap area */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Golden find */}
        {showGoldenFind && (
          <button
            onClick={handleGoldenFind}
            className="absolute z-20 animate-bounce-in cursor-pointer"
            style={{ left: `${goldenFindPos.x}%`, top: `${goldenFindPos.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="text-4xl animate-rainbow drop-shadow-lg">🌟</div>
            <div className="text-xs text-yellow-300 font-bold text-center mt-1">ЗАБРАТЬ!</div>
          </button>
        )}

        {/* Ant button */}
        <button
          onMouseDown={handleTap}
          onTouchStart={handleTap}
          className={`ant-btn relative w-44 h-44 rounded-full flex items-center justify-center
            bg-gradient-to-br from-amber-800 via-amber-900 to-yellow-900
            border-4 border-yellow-600/50 shadow-2xl
            ${isShaking ? 'animate-shake' : ''}
            ${state.x3Active ? 'animate-pulse-glow' : ''}
            ${antJump ? 'animate-ant-jump' : ''}
          `}
          style={{ boxShadow: state.x3Active ? '0 0 60px rgba(255,200,0,0.5)' : undefined }}
        >
          <div className="text-7xl select-none" style={{ filter: isShaking ? 'brightness(1.3)' : undefined }}>
            {antStage.icon}
          </div>
          {antEmotion && (
            <div className="absolute -top-2 -right-2 text-3xl animate-bounce-in">
              {antEmotion}
            </div>
          )}
          {/* Tap rings */}
          {tapRings.map(ring => (
            <div
              key={ring.id}
              className="absolute w-20 h-20 rounded-full border-2 border-yellow-400/60 tap-ring pointer-events-none"
              style={{ left: ring.x - 40, top: ring.y - 40 }}
            />
          ))}
          {/* Tap hint */}
          <div className="absolute -bottom-8 text-yellow-300/80 text-sm font-medium">
            {combo >= 3 ? `🔥 COMBO x${combo}!` : 'Тапай! 👆'}
          </div>
        </button>

        {/* Combo indicator */}
        {showCombo && combo >= 5 && (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 animate-bounce-in z-30">
            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-orange-500 animate-rainbow">
              🔥 COMBO x{combo}! 🔥
            </div>
          </div>
        )}

        {/* Floating texts */}
        {floatingTexts.map(ft => (
          <div
            key={ft.id}
            className={`absolute pointer-events-none animate-float-up font-bold text-xl z-30
              ${ft.isBonus ? 'text-yellow-300 text-3xl drop-shadow-[0_0_10px_rgba(255,200,0,0.8)]' : 'text-white'}
            `}
            style={{ left: ft.x, top: ft.y, transform: 'translate(-50%, -50%)' }}
          >
            {ft.value}
          </div>
        ))}

        {/* Particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute pointer-events-none animate-particle w-3 h-3 rounded-full z-20"
            style={{
              left: p.x,
              top: p.y,
              backgroundColor: p.color,
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Bottom panel */}
      <div className="px-3 pb-4 pt-2 z-10">
        {/* X3 Button */}
        {!state.x3Active && (
          <button
            onClick={handleX3}
            className="w-full mb-3 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500
              text-white font-bold text-lg shadow-lg active:scale-95 transition-transform
              animate-pulse-glow"
          >
            🎬 x3 на 15 секунд!
          </button>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setShowUpgrades(true)}
            className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white/10 backdrop-blur-sm
              border border-white/20 active:scale-95 transition-transform"
          >
            <span className="text-2xl">⬆️</span>
            <span className="text-[10px] text-white/80">Улучшения</span>
          </button>
          <button
            onClick={() => setShowAchievements(true)}
            className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white/10 backdrop-blur-sm
              border border-white/20 active:scale-95 transition-transform"
          >
            <span className="text-2xl">🏆</span>
            <span className="text-[10px] text-white/80">Ачивки</span>
          </button>
          <button
            onClick={() => setShowPrestige(true)}
            className="flex flex-col items-center gap-1 py-3 rounded-xl bg-purple-500/20 backdrop-blur-sm
              border border-purple-400/30 active:scale-95 transition-transform"
          >
            <span className="text-2xl">✨</span>
            <span className="text-[10px] text-purple-200">Престиж</span>
          </button>
          <button
            onClick={() => {
              const today = new Date().toDateString();
              if (state.dailyRewardClaimed !== today) {
                setShowDailyReward(true);
              }
            }}
            className={`flex flex-col items-center gap-1 py-3 rounded-xl backdrop-blur-sm
              border active:scale-95 transition-transform
              ${state.dailyRewardClaimed === new Date().toDateString()
                ? 'bg-green-500/20 border-green-400/30'
                : 'bg-yellow-500/20 border-yellow-400/30 animate-pulse'
              }`}
          >
            <span className="text-2xl">🎁</span>
            <span className="text-[10px] text-yellow-200">
              {state.dailyRewardClaimed === new Date().toDateString() ? '✓' : 'Награда'}
            </span>
          </button>
        </div>
      </div>

      {/* Upgrades Modal */}
      {showUpgrades && (
        <div className="absolute inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h2 className="text-xl font-bold text-yellow-300">⬆️ Улучшения</h2>
            <button onClick={() => setShowUpgrades(false)} className="text-white/60 text-2xl px-2">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {state.upgrades
              .filter(u => state.totalEarned >= u.unlockAt || u.level > 0)
              .map(upgrade => {
                const cost = getUpgradeCost(upgrade);
                const canAfford = state.food >= cost;
                return (
                  <button
                    key={upgrade.id}
                    onClick={() => canAfford && buyUpgrade(upgrade.id)}
                    disabled={!canAfford}
                    className={`upgrade-card w-full p-3 rounded-xl border text-left
                      ${canAfford
                        ? 'bg-white/10 border-yellow-500/40 active:bg-white/20'
                        : 'bg-white/5 border-white/10 opacity-60'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{upgrade.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold text-sm">{upgrade.name}</span>
                          <span className="text-yellow-300/80 text-xs">Ур.{upgrade.level}</span>
                        </div>
                        <div className="text-white/60 text-xs">{upgrade.description}</div>
                        <div className={`text-sm font-bold mt-1 ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                          🍎 {formatNumber(cost)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Achievements Modal */}
      {showAchievements && (
        <div className="absolute inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h2 className="text-xl font-bold text-yellow-300">🏆 Достижения</h2>
            <button onClick={() => setShowAchievements(false)} className="text-white/60 text-2xl px-2">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {state.achievements.map(ach => (
              <div
                key={ach.id}
                className={`p-3 rounded-xl border ${ach.unlocked ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10 opacity-50'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{ach.icon}</span>
                  <div className="flex-1">
                    <div className="text-white font-bold text-sm">{ach.name}</div>
                    <div className="text-white/60 text-xs">{ach.description}</div>
                    {ach.reward > 0 && (
                      <div className="text-yellow-300 text-xs mt-1">Награда: 🍎{ach.reward}</div>
                    )}
                  </div>
                  {ach.unlocked && <span className="text-green-400 text-xl">✓</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prestige Modal */}
      {showPrestige && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-6 border border-purple-400/30 max-w-sm w-full animate-bounce-in">
            <h2 className="text-2xl font-bold text-purple-200 text-center mb-4">✨ Престиж</h2>
            <p className="text-purple-100/80 text-sm text-center mb-4">
              Сбрось прогресс, но получи постоянный множитель!
            </p>
            <div className="bg-black/30 rounded-xl p-4 mb-4 text-center">
              <div className="text-purple-300 text-sm">Текущий множитель</div>
              <div className="text-3xl font-bold text-purple-100">x{state.prestigeMultiplier.toFixed(1)}</div>
              <div className="text-purple-300 text-sm mt-2">После престижа</div>
              <div className="text-3xl font-bold text-yellow-300">x{(1 + (state.prestigeLevel + 1) * 0.5).toFixed(1)}</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPrestige(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold active:scale-95"
              >
                Отмена
              </button>
              <button
                onClick={handlePrestige}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold active:scale-95"
              >
                Престиж!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Reward Modal */}
      {showDailyReward && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="bg-gradient-to-br from-yellow-800 to-orange-900 rounded-2xl p-6 border border-yellow-400/30 max-w-sm w-full animate-bounce-in">
            <h2 className="text-2xl font-bold text-yellow-200 text-center mb-2">🎁 Ежедневная награда!</h2>
            <p className="text-yellow-100/80 text-sm text-center mb-4">
              Заходи каждый день за бонусом!
            </p>
            <div className="bg-black/30 rounded-xl p-4 mb-4 text-center">
              <div className="text-5xl mb-2">🎁</div>
              <div className="text-3xl font-bold text-yellow-300">+{formatNumber(100 * (state.prestigeLevel + 1))} 🍎</div>
            </div>
            <button
              onClick={claimDailyReward}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-lg active:scale-95"
            >
              Забрать! 🎉
            </button>
          </div>
        </div>
      )}

      {/* Offline Earnings Modal */}
      {showOfflineModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="bg-gradient-to-br from-green-900 to-emerald-900 rounded-2xl p-6 border border-green-400/30 max-w-sm w-full animate-bounce-in">
            <h2 className="text-2xl font-bold text-green-200 text-center mb-2">🏰 Пока тебя не было...</h2>
            <p className="text-green-100/80 text-sm text-center mb-4">
              Колония работала!
            </p>
            <div className="bg-black/30 rounded-xl p-4 mb-4 text-center">
              <div className="text-5xl mb-2">🐜</div>
              <div className="text-3xl font-bold text-green-300">+{formatNumber(offlineEarnings)} 🍎</div>
            </div>
            <button
              onClick={() => setShowOfflineModal(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg active:scale-95"
            >
              Отлично! 🎉
            </button>
          </div>
        </div>
      )}

      {/* Achievement popups */}
      <div className="absolute top-20 right-3 z-40 space-y-2">
        {achievementPopups.map(ach => (
          <div
            key={ach.id}
            className="animate-slide-up bg-gradient-to-r from-yellow-600/90 to-orange-600/90 backdrop-blur-sm
              rounded-xl px-4 py-3 border border-yellow-400/50 shadow-lg max-w-[200px]"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{ach.icon}</span>
              <div>
                <div className="text-white font-bold text-xs">🏆 {ach.name}</div>
                {ach.reward > 0 && <div className="text-yellow-200 text-[10px]">+{ach.reward} 🍎</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Frenzy mode indicator */}
      {isFrenzyMode && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-gradient-to-r from-red-500/80 to-orange-500/80 backdrop-blur-sm px-4 py-1 rounded-full
            text-white text-xs font-bold animate-pulse border border-yellow-400/50">
            🔥 ФЕЙЕРВЕРК! Бонусы x2! 🔥
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 flex gap-3 text-[10px] text-white/40">
        <span>Тапов: {state.totalTaps}</span>
        <span>Всего: {formatNumber(state.totalEarned)}</span>
      </div>
    </div>
  );
}
