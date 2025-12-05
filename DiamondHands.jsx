/**
 * DIAMOND HANDS - The Ultimate Hodl Game
 *
 * A brutal test of patience and nerve. Hold through the chaos.
 * Challenge your friends. Prove you're not paper hands.
 *
 * Features:
 * - Infinite volatile price simulation with seeded randomness
 * - Challenge mode via URL parameters
 * - Anti-cheat with liveness checks
 * - Time-based grading system
 * - Share to clipboard and Twitter
 * - Mobile optimized with touch handling
 * - Easter eggs for the dedicated
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================================================

/**
 * Mulberry32 PRNG - Fast, seedable, deterministic
 * Same seed = same price sequence = fair challenges
 */
function createSeededRandom(seed) {
  let state = seed;
  return function() {
    state |= 0;
    state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Convert string seed to numeric seed
 */
function hashSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Generate a random seed string
 */
function generateSeed() {
  return Math.random().toString(36).substring(2, 10);
}

// ============================================================================
// GRADING SYSTEM
// ============================================================================

/**
 * Get title based on survival time
 */
function getTitle(timeSeconds) {
  if (timeSeconds >= 3600) return { title: 'ONE HOUR IMMORTAL', tier: 'mythic' };
  if (timeSeconds >= 1800) return { title: 'HALF HOUR HERO', tier: 'legendary' };
  if (timeSeconds >= 900) return { title: 'QUARTER HOUR KING', tier: 'legendary' };
  if (timeSeconds >= 600) return { title: 'TEN MINUTE GOD', tier: 'epic' };
  if (timeSeconds >= 300) return { title: 'FIVE MINUTE LEGEND', tier: 'epic' };
  if (timeSeconds >= 180) return { title: 'STEEL GRIP', tier: 'rare' };
  if (timeSeconds >= 120) return { title: 'IRON HANDS', tier: 'rare' };
  if (timeSeconds >= 60) return { title: 'ONE MINUTE CLUB', tier: 'uncommon' };
  if (timeSeconds >= 30) return { title: 'GETTING SERIOUS', tier: 'common' };
  if (timeSeconds >= 10) return { title: 'WARM UP', tier: 'common' };
  return { title: 'PAPER HANDS', tier: 'none' };
}

/**
 * Get diamond count based on milestones reached
 */
function getDiamonds(timeSeconds) {
  const milestones = [10, 30, 60, 120, 180, 300, 600, 900, 1800, 3600];
  return milestones.filter(m => timeSeconds >= m).length;
}

/**
 * Get color for tier
 */
function getTierColor(tier) {
  switch (tier) {
    case 'mythic': return '#ff6b6b';
    case 'legendary': return '#ffd93d';
    case 'epic': return '#a855f7';
    case 'rare': return '#3b82f6';
    case 'uncommon': return '#22c55e';
    case 'common': return '#9ca3af';
    default: return '#525252';
  }
}

// ============================================================================
// TIME FORMATTING
// ============================================================================

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  if (mins === 0) return `${secs}s`;
  return `${mins}:${secs.padStart(4, '0')}`;
}

// ============================================================================
// PRICE GENERATION ENGINE
// ============================================================================

/**
 * Generate price movement with waves and volatility
 */
function createPriceEngine(seed) {
  const rng = createSeededRandom(hashSeed(seed));

  let price = 100;
  let velocity = 0;
  let volatility = 1;
  let lastDumpTime = -999; // Track when last dump happened for recovery pumps
  let isDumpRecovery = false;

  // Determine if this is a "brutal" game (10% chance - adds RNG variety)
  const isBrutalGame = rng() < 0.1;

  // Pre-generate wave schedule for consistency
  const waveSchedule = [];
  let nextWaveTime = 6 + rng() * 4;

  for (let i = 0; i < 100; i++) {
    // After a dump wave, next wave is more likely to be a pump (recovery)
    const lastWave = waveSchedule[waveSchedule.length - 1];
    const wasLastDump = lastWave?.direction === -1;

    // 70% pumps normally, 85% pump after a dump (recovery), brutal games have more dumps
    const pumpChance = isBrutalGame ? 0.5 : (wasLastDump ? 0.85 : 0.70);

    waveSchedule.push({
      time: nextWaveTime,
      intensity: 0.6 + rng() * 1.4,
      direction: rng() < pumpChance ? 1 : -1,
      duration: 2 + rng() * 4
    });
    nextWaveTime += 8 + rng() * 15; // Frequent waves
  }

  let waveIndex = 0;
  let activeWave = null;

  return {
    tick(elapsed) {
      // Check for wave triggers
      if (waveIndex < waveSchedule.length && elapsed >= waveSchedule[waveIndex].time) {
        activeWave = { ...waveSchedule[waveIndex], startTime: elapsed };
        if (activeWave.direction === -1) {
          lastDumpTime = elapsed;
        }
        waveIndex++;
      }

      // Calculate wave effect
      let waveEffect = 0;
      if (activeWave) {
        const waveProgress = (elapsed - activeWave.startTime) / activeWave.duration;
        if (waveProgress < 1) {
          // Sine wave envelope
          waveEffect = Math.sin(waveProgress * Math.PI) * activeWave.intensity * activeWave.direction;
        } else {
          activeWave = null;
        }
      }

      // Check if we're in dump recovery mode (5 seconds after a dump)
      isDumpRecovery = (elapsed - lastDumpTime) < 5 && (elapsed - lastDumpTime) > 0.5;

      // Base volatility increases over time
      volatility = 1 + (elapsed / 60) * 0.4;

      // UPWARD DRIFT - stronger to ensure chart trends up
      // Extra boost during dump recovery to show that "it always comes back"
      const baseUpwardDrift = 0.03 + (elapsed / 100) * 0.04;
      const recoveryBoost = isDumpRecovery ? 0.08 : 0;
      const upwardDrift = baseUpwardDrift + recoveryBoost;

      // Random micro-movements (less aggressive)
      const noise = (rng() - 0.5) * 1.5 * volatility;

      // Momentum with decay + upward bias
      velocity = velocity * 0.93 + noise * 0.25 + waveEffect * 0.6 + upwardDrift;

      // Apply movement
      const percentChange = velocity * 0.1;
      price = price * (1 + percentChange / 100);

      // Clamp price to prevent going too low
      price = Math.max(price, 10);

      // Random flash crash (rare, scary, but followed by recovery)
      const crashChance = isBrutalGame ? 0.0008 : 0.0003;
      if (elapsed > 30 && rng() < crashChance * (elapsed / 60)) {
        const crashAmount = isBrutalGame ? (0.75 + rng() * 0.15) : (0.85 + rng() * 0.10);
        price = price * crashAmount;
        lastDumpTime = elapsed; // Trigger recovery mode
      }

      // Random moon pumps (exciting reward moments)
      const moonChance = isBrutalGame ? 0.0004 : 0.0006;
      if (rng() < moonChance * (elapsed / 60)) {
        price = price * (1.10 + rng() * 0.20); // 10-30% instant pump!
      }

      // Calculate percent change from starting price of $100
      const pctChange = ((price - 100) / 100) * 100;

      return {
        price,
        percentChange: pctChange,
        velocity,
        volatility,
        isWave: activeWave !== null,
        waveDirection: activeWave?.direction || 0,
        isRecovery: isDumpRecovery
      };
    },

    getWaveSchedule() {
      return waveSchedule;
    },

    reset() {
      price = 100;
      velocity = 0;
      waveIndex = 0;
      activeWave = null;
      lastDumpTime = -999;
      isDumpRecovery = false;
    }
  };
}

// ============================================================================
// EASTER EGGS
// ============================================================================

function checkEasterEgg(time, exitPercent) {
  const roundedPercent = Math.round(exitPercent * 10) / 10;

  // Positive gains easter eggs (price goes up!)
  if (roundedPercent === 69.0) return 'Nice gains.';
  if (roundedPercent === 420.0) return 'Blazed to the moon';
  if (roundedPercent === 100.0) return 'Double your money!';
  if (roundedPercent === 1000.0) return '10x LEGEND';

  // Time-based easter eggs
  if (Math.floor(time) === 69) return 'Nice timing.';
  if (formatTime(time) === '4:20.0') return 'Blazed through that one';

  // Rare negative (if they somehow exit down)
  if (roundedPercent === -69.0) return 'Nice... wait, wrong direction';

  return null;
}

// ============================================================================
// LOCAL STORAGE
// ============================================================================

function saveBest(time, exitPercent, title, diamonds) {
  try {
    const current = JSON.parse(localStorage.getItem('diamondHandsBest') || 'null');
    if (!current || time > current.time) {
      localStorage.setItem('diamondHandsBest', JSON.stringify({
        time,
        exitPercent,
        title,
        diamonds,
        date: Date.now()
      }));
      return true;
    }
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
  return false;
}

function loadBest() {
  try {
    return JSON.parse(localStorage.getItem('diamondHandsBest') || 'null');
  } catch (e) {
    return null;
  }
}

// ============================================================================
// URL HANDLING
// ============================================================================

function parseURLParams() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const seed = params.get('s');
  const time = params.get('t');
  const exitPercent = params.get('p');

  if (seed && time) {
    return {
      seed,
      time: parseFloat(time),
      exitPercent: exitPercent ? parseFloat(exitPercent) : null,
      isChallenge: true
    };
  }

  return null;
}

function generateShareURL(seed, time, exitPercent) {
  if (typeof window === 'undefined') return '';

  const params = new URLSearchParams({
    s: seed,
    t: time.toFixed(1),
    p: exitPercent.toFixed(1)
  });
  return `${window.location.origin}${window.location.pathname}?${params}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DiamondHands() {
  // Game state
  const [gameState, setGameState] = useState('idle'); // idle, playing, ended
  const [isHolding, setIsHolding] = useState(false);
  const [time, setTime] = useState(0);
  const [price, setPrice] = useState(100);
  const [percentChange, setPercentChange] = useState(0);
  const [priceHistory, setPriceHistory] = useState([{ time: 0, price: 100 }]);
  const [seed, setSeed] = useState(generateSeed);
  const [volatility, setVolatility] = useState(1);
  const [isWave, setIsWave] = useState(false);
  const [waveDirection, setWaveDirection] = useState(0);

  // Challenge mode
  const [challenge, setChallenge] = useState(null);
  const [challengeResult, setChallengeResult] = useState(null);

  // Anti-cheat (simple movement reminder)
  const [showWiggleReminder, setShowWiggleReminder] = useState(false);

  // UI state
  const [showResults, setShowResults] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [personalBest, setPersonalBest] = useState(null);
  const [copied, setCopied] = useState(false);

  // Refs
  const priceEngineRef = useRef(null);
  const gameLoopRef = useRef(null);
  const startTimeRef = useRef(null);
  const lastTickRef = useRef(0);
  const touchHistoryRef = useRef([]);
  const activeTouchIdRef = useRef(null);
  const lastMovementTimeRef = useRef(0);
  const chartRef = useRef(null);
  const holdButtonRef = useRef(null);
  const gameStateRef = useRef('idle'); // Sync ref to avoid stale closures
  const isHoldingRef = useRef(false); // Track holding state synchronously

  // Reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // Detect if device supports touch (mobile check)
  const [isMobile, setIsMobile] = useState(true); // Default true to avoid flash

  useEffect(() => {
    // Check for touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    // Also check screen width as backup
    const isSmallScreen = window.innerWidth <= 768;
    setIsMobile(hasTouch || isSmallScreen);
  }, []);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    // Load personal best
    setPersonalBest(loadBest());

    // Check for challenge URL
    const urlParams = parseURLParams();
    if (urlParams?.isChallenge) {
      setChallenge(urlParams);
      setSeed(urlParams.seed);
    }
  }, []);

  // Initialize price engine when seed changes
  useEffect(() => {
    priceEngineRef.current = createPriceEngine(seed);
  }, [seed]);

  // ============================================================================
  // GAME LOOP
  // ============================================================================

  useEffect(() => {
    if (gameState !== 'playing' || !isHolding) return;

    const tick = () => {
      const now = performance.now();
      const elapsed = (now - startTimeRef.current) / 1000;

      // Update time
      setTime(elapsed);

      // Get price update
      if (priceEngineRef.current) {
        const update = priceEngineRef.current.tick(elapsed);
        setPrice(update.price);
        setPercentChange(update.percentChange);
        setVolatility(update.volatility);
        setIsWave(update.isWave);
        setWaveDirection(update.waveDirection);

        // Add to history (sample every 100ms)
        if (elapsed - lastTickRef.current >= 0.1) {
          lastTickRef.current = elapsed;
          setPriceHistory(prev => [...prev, { time: elapsed, price: update.price }]);
        }
      }

      gameLoopRef.current = requestAnimationFrame(tick);
    };

    gameLoopRef.current = requestAnimationFrame(tick);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, isHolding]);

  // ============================================================================
  // ANTI-CHEAT: SIMPLE MOVEMENT REMINDER
  // ============================================================================

  useEffect(() => {
    if (!isHolding) {
      setShowWiggleReminder(false);
      return;
    }

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceMovement = now - lastMovementTimeRef.current;

      // Show gentle reminder if no movement for 5+ seconds (mobile only)
      if (timeSinceMovement > 5000 && touchHistoryRef.current.length > 0) {
        setShowWiggleReminder(true);
      } else {
        setShowWiggleReminder(false);
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [isHolding]);

  // ============================================================================
  // GAME ACTIONS
  // ============================================================================

  const startGame = useCallback(() => {
    // Reset state
    if (!challenge) {
      setSeed(generateSeed());
    }
    setTime(0);
    setPrice(100);
    setPercentChange(0);
    setPriceHistory([{ time: 0, price: 100 }]);
    setShowWiggleReminder(false);
    setChallengeResult(null);
    setShowResults(false);
    setNewBest(false);
    lastTickRef.current = 0;
    touchHistoryRef.current = [];
    lastMovementTimeRef.current = Date.now();

    // Reset price engine
    if (priceEngineRef.current) {
      priceEngineRef.current.reset();
    } else {
      priceEngineRef.current = createPriceEngine(seed);
    }

    gameStateRef.current = 'playing';
    setGameState('playing');
  }, [challenge, seed]);

  const startHolding = useCallback(() => {
    if (isHoldingRef.current) return; // Already holding

    // Use ref to check current state (avoids stale closure)
    if (gameStateRef.current === 'idle') {
      startGame();
    }

    if (gameStateRef.current === 'idle' || gameStateRef.current === 'playing') {
      startTimeRef.current = performance.now();
      isHoldingRef.current = true;
      setIsHolding(true);
      lastMovementTimeRef.current = Date.now();
    }
  }, [startGame]);

  const stopHolding = useCallback(() => {
    if (!isHoldingRef.current) return; // Not holding

    isHoldingRef.current = false;
    setIsHolding(false);

    // Use ref to check current state (avoids stale closure)
    if (gameStateRef.current !== 'playing') return;

    gameStateRef.current = 'ended';
    setGameState('ended');

    // Calculate final stats
    const finalTime = time;
    const finalPercent = percentChange;
    const titleData = getTitle(finalTime);
    const diamonds = getDiamonds(finalTime);

    // Check for new personal best
    const isNewBest = saveBest(finalTime, finalPercent, titleData.title, diamonds);
    setNewBest(isNewBest);
    if (isNewBest) {
      setPersonalBest({ time: finalTime, exitPercent: finalPercent, title: titleData.title, diamonds });
    }

    // Check challenge result
    if (challenge) {
      setChallengeResult(finalTime > challenge.time ? 'win' : 'lose');
    }

    setShowResults(true);
  }, [time, percentChange, challenge]);

  const resetGame = useCallback(() => {
    // Reset all game state
    gameStateRef.current = 'idle';
    setGameState('idle');
    setIsHolding(false);
    isHoldingRef.current = false;
    setShowResults(false);
    setChallengeResult(null);
    setTime(0);
    setPrice(100);
    setPercentChange(0);
    setPriceHistory([{ time: 0, price: 100 }]);
    setShowWiggleReminder(false);
    setNewBest(false);

    // CRITICAL: Reset the start time ref so next game starts fresh
    startTimeRef.current = null;
    lastTickRef.current = 0;
    touchHistoryRef.current = [];

    // Reset price engine for challenge mode (same seed)
    if (challenge && priceEngineRef.current) {
      priceEngineRef.current.reset();
    }
  }, [challenge]);

  const startFreshGame = useCallback(() => {
    // Clear challenge and start completely fresh
    setChallenge(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Reset all game state
    gameStateRef.current = 'idle';
    setGameState('idle');
    setIsHolding(false);
    isHoldingRef.current = false;
    setShowResults(false);
    setChallengeResult(null);
    setTime(0);
    setPrice(100);
    setPercentChange(0);
    setPriceHistory([{ time: 0, price: 100 }]);
    setShowWiggleReminder(false);
    setNewBest(false);

    // Generate new seed for fresh game
    const newSeed = generateSeed();
    setSeed(newSeed);

    // Reset refs
    startTimeRef.current = null;
    lastTickRef.current = 0;
    touchHistoryRef.current = [];

    // Create new price engine with new seed
    priceEngineRef.current = createPriceEngine(newSeed);
  }, []);

  // ============================================================================
  // TOUCH TRACKING
  // ============================================================================

  const recordTouch = useCallback((x, y) => {
    lastMovementTimeRef.current = Date.now();
    touchHistoryRef.current.push({ x, y, time: Date.now() });

    // Keep only last 20 touch points
    if (touchHistoryRef.current.length > 20) {
      touchHistoryRef.current = touchHistoryRef.current.slice(-20);
    }
  }, []);

  // ============================================================================
  // INPUT HANDLERS - Using Pointer Events for reliable touch detection
  // ============================================================================

  const activePointerIdRef = useRef(null);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    // Capture this pointer so we get all its events even if it leaves the element
    e.target.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;
    touchHistoryRef.current = [];
    recordTouch(e.clientX, e.clientY);
    startHolding();
  }, [startHolding, recordTouch]);

  const handlePointerMove = useCallback((e) => {
    if (activePointerIdRef.current === e.pointerId) {
      recordTouch(e.clientX, e.clientY);
    }
  }, [recordTouch]);

  const handlePointerUp = useCallback((e) => {
    if (activePointerIdRef.current === e.pointerId) {
      activePointerIdRef.current = null;
      stopHolding();
    }
  }, [stopHolding]);

  const handlePointerCancel = useCallback((e) => {
    if (activePointerIdRef.current === e.pointerId) {
      activePointerIdRef.current = null;
      stopHolding();
    }
  }, [stopHolding]);

  const handleKeyDown = useCallback((e) => {
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      startHolding();
    }
  }, [startHolding]);

  const handleKeyUp = useCallback((e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      stopHolding();
    }
  }, [stopHolding]);

  // Global keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Global pointer up failsafe - catches releases if pointer capture fails
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isHoldingRef.current) {
        activePointerIdRef.current = null;
        stopHolding();
      }
    };

    // Also listen for visibility change (user switches tabs/apps)
    const handleVisibilityChange = () => {
      if (document.hidden && isHoldingRef.current) {
        activePointerIdRef.current = null;
        stopHolding();
      }
    };

    document.addEventListener('pointerup', handleGlobalPointerUp);
    document.addEventListener('pointercancel', handleGlobalPointerUp);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('pointerup', handleGlobalPointerUp);
      document.removeEventListener('pointercancel', handleGlobalPointerUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stopHolding]);

  // ============================================================================
  // SHARE HANDLERS
  // ============================================================================

  const handleCopyShare = useCallback(async () => {
    const diamonds = getDiamonds(time);
    const shareURL = generateShareURL(seed, time, percentChange);

    const shareText = `DIAMOND HANDS

Time: ${formatTime(time)} | Exit: ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%
${'◆'.repeat(diamonds)}

Can you beat me?
${shareURL}`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  }, [time, percentChange, seed]);

  const handleTweetShare = useCallback(() => {
    const diamonds = getDiamonds(time);
    const shareURL = generateShareURL(seed, time, percentChange);

    const tweetText = encodeURIComponent(
      `I held for ${formatTime(time)} in DIAMOND HANDS\n\n` +
      `Exit: ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%\n` +
      `${'◆'.repeat(diamonds)}\n\n` +
      `Can you beat me? 💎`
    );

    const tweetURL = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareURL)}`;
    window.open(tweetURL, '_blank');
  }, [time, percentChange, seed]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const titleData = getTitle(time);
  const diamonds = getDiamonds(time);
  const easterEgg = showResults ? checkEasterEgg(time, percentChange) : null;
  const isVolatile = volatility > 1.5;

  // ============================================================================
  // CHART RENDERING
  // ============================================================================

  const renderChart = () => {
    if (priceHistory.length < 2) return null;

    const width = 100;
    const height = 100;
    const padding = 5;

    // Calculate bounds
    const prices = priceHistory.map(p => p.price);
    const minPrice = Math.min(...prices) * 0.95;
    const maxPrice = Math.max(...prices) * 1.05;
    const priceRange = maxPrice - minPrice || 1;

    const maxTime = Math.max(priceHistory[priceHistory.length - 1].time, 10);

    // Generate path
    const points = priceHistory.map((point, i) => {
      const x = padding + (point.time / maxTime) * (width - 2 * padding);
      const y = height - padding - ((point.price - minPrice) / priceRange) * (height - 2 * padding);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Color based on current change
    const lineColor = percentChange >= 0 ? '#22c55e' : '#ef4444';

    // Fill gradient
    const fillPoints = points + ` L ${padding + (priceHistory[priceHistory.length - 1].time / maxTime) * (width - 2 * padding)} ${height - padding} L ${padding} ${height - padding} Z`;

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#333" strokeWidth="0.5" strokeDasharray="2,2" />
        <line x1={width/2} y1={padding} x2={width/2} y2={height-padding} stroke="#333" strokeWidth="0.5" strokeDasharray="2,2" />

        {/* Fill */}
        <path d={fillPoints} fill="url(#chartFill)" />

        {/* Line */}
        <path d={points} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Current point */}
        {priceHistory.length > 0 && (
          <circle
            cx={padding + (priceHistory[priceHistory.length - 1].time / maxTime) * (width - 2 * padding)}
            cy={height - padding - ((priceHistory[priceHistory.length - 1].price - minPrice) / priceRange) * (height - 2 * padding)}
            r="2"
            fill={lineColor}
          />
        )}

        {/* 100 line */}
        {minPrice < 100 && maxPrice > 100 && (
          <line
            x1={padding}
            y1={height - padding - ((100 - minPrice) / priceRange) * (height - 2 * padding)}
            x2={width - padding}
            y2={height - padding - ((100 - minPrice) / priceRange) * (height - 2 * padding)}
            stroke="#666"
            strokeWidth="0.5"
            strokeDasharray="4,4"
          />
        )}
      </svg>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Desktop blocker - game is mobile only
  if (!isMobile) {
    return (
      <div
        className="min-h-screen bg-black text-white flex flex-col items-center justify-center select-none p-8"
        style={{ minHeight: '100dvh' }}
      >
        <div className="text-center max-w-md">
          {/* Title */}
          <h1
            className="text-4xl md:text-5xl font-black tracking-tight mb-2"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #a1a1aa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            DIAMOND HANDS
          </h1>
          <div
            className="h-0.5 w-16 mx-auto mb-8"
            style={{
              background: 'linear-gradient(90deg, transparent, #fbbf24, transparent)'
            }}
          />

          {/* Phone icon */}
          <div className="text-6xl mb-6">
            📱
          </div>

          {/* Message */}
          <div className="text-xl font-bold text-white mb-3">
            Mobile Only
          </div>
          <p className="text-gray-400 mb-8">
            This game requires touch controls. Open on your phone to play.
          </p>

          {/* QR hint */}
          <div
            className="inline-block px-6 py-3 rounded-xl"
            style={{
              background: 'linear-gradient(180deg, #1f1f1f 0%, #171717 100%)',
              border: '1px solid #333'
            }}
          >
            <div className="text-sm text-gray-500 mb-2">
              Visit this URL on your phone
            </div>
            <div className="text-yellow-400 font-mono text-xs break-all">
              {typeof window !== 'undefined' ? window.location.href : ''}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-black text-white flex flex-col select-none overflow-hidden"
      style={{ minHeight: '100dvh' }}
    >
      {/* Header - Premium */}
      <header className="p-4 text-center">
        <div className="relative inline-block">
          <h1
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #a1a1aa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            DIAMOND HANDS
          </h1>
          <div
            className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 h-0.5 w-16"
            style={{
              background: 'linear-gradient(90deg, transparent, #fbbf24, transparent)'
            }}
          />
        </div>
        {personalBest && gameState === 'idle' && (
          <div className="text-xs text-gray-600 mt-3 tracking-wide">
            PERSONAL BEST: {formatTime(personalBest.time)}
          </div>
        )}
      </header>

      {/* Challenge banner */}
      {challenge && !showResults && (
        <div
          className="mx-4 mb-4 p-4 rounded-lg text-center"
          style={{
            border: '3px solid #fbbf24',
            background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.1) 0%, rgba(0,0,0,0) 100%)'
          }}
        >
          <div className="text-yellow-400 font-bold text-lg">CHALLENGE MODE</div>
          <div className="text-2xl font-black mt-2">
            BEAT: {formatTime(challenge.time)}
          </div>
          {challenge.exitPercent !== null && (
            <div className="text-gray-400 mt-1">
              Their exit: {challenge.exitPercent > 0 ? '+' : ''}{challenge.exitPercent.toFixed(1)}%
            </div>
          )}
          <div className="text-sm text-gray-500 mt-2">
            Same chart. Same chaos. Can you outlast them?
          </div>
        </div>
      )}

      {/* Main game area */}
      <main className="flex-1 flex flex-col px-4 pb-4">
        {/* Price display */}
        <div className="text-center mb-4">
          <div
            className={`text-5xl md:text-7xl font-black tabular-nums transition-all duration-150 ${
              isVolatile && !prefersReducedMotion ? 'animate-shake' : ''
            }`}
            style={{
              color: percentChange >= 0 ? '#22c55e' : '#ef4444',
              textShadow: percentChange >= 50
                ? '0 0 30px rgba(34, 197, 94, 0.5)'
                : percentChange <= -20
                ? '0 0 30px rgba(239, 68, 68, 0.5)'
                : 'none'
            }}
          >
            ${price.toFixed(2)}
          </div>
          <div
            className="text-2xl md:text-3xl font-bold mt-1 transition-all duration-150"
            style={{
              color: percentChange >= 0 ? '#22c55e' : '#ef4444',
              opacity: Math.min(1, 0.7 + Math.abs(percentChange) / 100)
            }}
          >
            {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%
          </div>
        </div>

        {/* Chart */}
        <div
          ref={chartRef}
          className="flex-1 min-h-[200px] md:min-h-[300px] max-h-[400px] rounded-xl mb-4 overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(17, 17, 17, 0.8) 0%, rgba(0, 0, 0, 0.9) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)'
          }}
        >
          {renderChart()}
        </div>

        {/* Timer and stats */}
        <div
          className="flex justify-between items-center mb-4 px-3 py-3 rounded-xl"
          style={{
            background: 'linear-gradient(180deg, rgba(26, 26, 26, 0.6) 0%, rgba(17, 17, 17, 0.8) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.03)'
          }}
        >
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Time</div>
            <div className="text-2xl md:text-3xl font-mono font-bold text-white">
              {formatTime(time)}
            </div>
          </div>

          <div className="text-center">
            <div
              className="text-base font-bold transition-all duration-300"
              style={{
                color: getTierColor(titleData.tier),
                textShadow: titleData.tier !== 'none' ? `0 0 20px ${getTierColor(titleData.tier)}40` : 'none'
              }}
            >
              {titleData.title}
            </div>
            <div className="flex justify-center gap-0.5 mt-1">
              {[...Array(10)].map((_, i) => (
                <span
                  key={i}
                  className="text-sm transition-all duration-200"
                  style={{
                    color: i < diamonds ? '#fbbf24' : '#333',
                    textShadow: i < diamonds ? '0 0 8px rgba(251, 191, 36, 0.4)' : 'none'
                  }}
                >
                  ◆
                </span>
              ))}
            </div>
          </div>

          <div className="text-right">
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Wave</div>
            <div
              className="text-lg font-bold transition-all duration-200"
              style={{
                color: isWave
                  ? (waveDirection < 0 ? '#ef4444' : '#22c55e')
                  : '#404040',
                textShadow: isWave
                  ? (waveDirection < 0 ? '0 0 15px rgba(239, 68, 68, 0.4)' : '0 0 15px rgba(34, 197, 94, 0.4)')
                  : 'none'
              }}
            >
              {isWave ? (waveDirection < 0 ? '↓ DUMP' : '↑ PUMP') : '—'}
            </div>
          </div>
        </div>

        {/* Gentle wiggle reminder for mobile */}
        {showWiggleReminder && (
          <div className="text-center text-yellow-400 text-sm mb-2 animate-pulse">
            👆 Wiggle your finger a bit to stay active
          </div>
        )}

        {/* Hold button - Premium game style */}
        {!showResults && (
          <div className="relative">
            {/* Outer glow ring when holding */}
            {isHolding && (
              <div
                className="absolute inset-0 rounded-2xl animate-pulse"
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
                  filter: 'blur(20px)',
                  opacity: 0.6,
                  transform: 'scale(1.1)'
                }}
              />
            )}
            <button
              ref={holdButtonRef}
              className="relative w-full outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
              style={{
                padding: isHolding ? '2rem 1rem' : '2.5rem 1rem',
                borderRadius: '1rem',
                border: isHolding ? 'none' : '2px solid transparent',
                background: isHolding
                  ? 'linear-gradient(180deg, #22c55e 0%, #16a34a 50%, #15803d 100%)'
                  : 'linear-gradient(180deg, #1f1f1f 0%, #171717 100%)',
                backgroundClip: 'padding-box',
                boxShadow: isHolding
                  ? 'inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3), 0 8px 32px rgba(34, 197, 94, 0.4)'
                  : 'inset 0 1px 2px rgba(255,255,255,0.05), inset 0 -1px 2px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.5)',
                transform: isHolding ? 'scale(0.98)' : 'scale(1)',
                transition: 'all 0.15s ease-out',
                touchAction: 'none' // Prevent browser handling of touch
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              aria-label={isHolding ? 'Release to sell' : 'Hold to HODL'}
            >
              {/* Inner highlight */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background: isHolding
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%)'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 30%)',
                  borderRadius: '1rem'
                }}
              />

              {/* Button border gradient */}
              {!isHolding && (
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{
                    padding: '2px',
                    background: 'linear-gradient(180deg, #404040 0%, #262626 100%)',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    borderRadius: '1rem'
                  }}
                />
              )}

              {/* Button text */}
              <div className="relative">
                <div
                  className="font-black text-2xl md:text-3xl uppercase tracking-widest"
                  style={{
                    color: isHolding ? '#ffffff' : '#a1a1aa',
                    textShadow: isHolding
                      ? '0 2px 4px rgba(0,0,0,0.3), 0 0 20px rgba(255,255,255,0.2)'
                      : 'none'
                  }}
                >
                  {isHolding ? 'HODLing...' : 'HOLD TO HODL'}
                </div>
                {!isHolding && gameState === 'idle' && (
                  <div className="text-xs text-gray-600 mt-2 tracking-wide">
                    TAP AND HOLD
                  </div>
                )}
              </div>
            </button>
          </div>
        )}

        {/* Instructions */}
        {gameState === 'idle' && !showResults && (
          <div className="text-center text-gray-500 text-sm mt-4">
            Hold the button to start. Release = sell. How long can you last?
            <br />
            <span className="text-gray-600">Press SPACE or tap to hold</span>
          </div>
        )}
      </main>

      {/* Results modal - Premium design */}
      {showResults && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
              borderRadius: '1.5rem',
              boxShadow: challengeResult
                ? '0 0 60px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                : '0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
            }}
          >
            {/* Decorative top border gradient */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{
                background: challengeResult
                  ? 'linear-gradient(90deg, transparent, #fbbf24, transparent)'
                  : `linear-gradient(90deg, transparent, ${getTierColor(titleData.tier)}, transparent)`
              }}
            />

            <div className="p-6 text-center">
              {/* Challenge result */}
              {challengeResult && (
                <div
                  className="mb-6"
                  style={{
                    background: challengeResult === 'win'
                      ? 'linear-gradient(180deg, rgba(34, 197, 94, 0.2) 0%, transparent 100%)'
                      : 'linear-gradient(180deg, rgba(239, 68, 68, 0.2) 0%, transparent 100%)',
                    margin: '-1.5rem -1.5rem 1.5rem -1.5rem',
                    padding: '1.5rem'
                  }}
                >
                  <div
                    className="text-4xl md:text-5xl font-black"
                    style={{
                      color: challengeResult === 'win' ? '#22c55e' : '#ef4444',
                      textShadow: challengeResult === 'win'
                        ? '0 0 30px rgba(34, 197, 94, 0.5)'
                        : '0 0 30px rgba(239, 68, 68, 0.5)'
                    }}
                  >
                    {challengeResult === 'win' ? 'YOU WIN' : 'THEY WIN'}
                  </div>
                </div>
              )}

              {/* Title with glow */}
              <div className="mb-3">
                <div
                  className="text-2xl md:text-3xl font-black tracking-wide"
                  style={{
                    color: getTierColor(titleData.tier),
                    textShadow: `0 0 20px ${getTierColor(titleData.tier)}40`
                  }}
                >
                  {titleData.title}
                </div>
              </div>

              {/* Diamonds row */}
              <div className="flex justify-center items-center gap-1 mb-6">
                {[...Array(10)].map((_, i) => (
                  <span
                    key={i}
                    className="text-2xl"
                    style={{
                      color: i < diamonds ? '#fbbf24' : '#333',
                      textShadow: i < diamonds ? '0 0 10px rgba(251, 191, 36, 0.5)' : 'none',
                      transition: 'all 0.3s ease',
                      transitionDelay: `${i * 50}ms`
                    }}
                  >
                    ◆
                  </span>
                ))}
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: 'linear-gradient(180deg, #262626 0%, #1a1a1a 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.3)'
                  }}
                >
                  <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Time Held</div>
                  <div className="text-2xl font-black text-white">{formatTime(time)}</div>
                </div>
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: 'linear-gradient(180deg, #262626 0%, #1a1a1a 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.3)'
                  }}
                >
                  <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Exit Price</div>
                  <div
                    className="text-2xl font-black"
                    style={{ color: percentChange >= 0 ? '#22c55e' : '#ef4444' }}
                  >
                    {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Challenge comparison */}
              {challenge && (
                <div
                  className="rounded-xl p-4 mb-5"
                  style={{
                    background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.1) 0%, transparent 100%)',
                    border: '1px solid rgba(251, 191, 36, 0.2)'
                  }}
                >
                  <div className="text-yellow-400/70 text-xs uppercase tracking-wider mb-3">Challenge</div>
                  <div className="flex justify-center items-center gap-6">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">YOU</div>
                      <div className="text-xl font-bold text-white">{formatTime(time)}</div>
                    </div>
                    <div className="text-2xl text-gray-600">⚔</div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">THEM</div>
                      <div className="text-xl font-bold text-gray-400">{formatTime(challenge.time)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Easter egg */}
              {easterEgg && (
                <div className="text-yellow-400/80 italic text-sm mb-4">"{easterEgg}"</div>
              )}

              {/* New best badge */}
              {newBest && (
                <div
                  className="inline-block px-4 py-2 rounded-full text-sm font-bold mb-5"
                  style={{
                    background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
                    boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)'
                  }}
                >
                  ★ NEW PERSONAL BEST ★
                </div>
              )}

              {/* Share buttons */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={handleCopyShare}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(180deg, #374151 0%, #1f2937 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.3)'
                  }}
                >
                  {copied ? '✓ COPIED!' : 'COPY LINK'}
                </button>
                <button
                  onClick={handleTweetShare}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(180deg, #1d9bf0 0%, #1a8cd8 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 12px rgba(29, 155, 240, 0.3)'
                  }}
                >
                  SHARE ON X
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={resetGame}
                  className="flex-1 py-4 rounded-xl font-black text-black transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)',
                    boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3), 0 4px 15px rgba(251, 191, 36, 0.4)'
                  }}
                >
                  {challenge ? 'TRY AGAIN' : 'PLAY AGAIN'}
                </button>
                {challenge && (
                  <button
                    onClick={startFreshGame}
                    className="flex-1 py-4 rounded-xl font-bold transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(180deg, #374151 0%, #1f2937 100%)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.3)'
                    }}
                  >
                    NEW GAME
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global styles */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }

        .animate-shake {
          animation: shake 0.1s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-shake {
            animation: none;
          }
        }

        /* Prevent text selection and touch highlights */
        * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
        }

        /* Mobile font sizing */
        @media (max-width: 640px) {
          .text-5xl { font-size: 2.5rem; }
          .text-7xl { font-size: 2.5rem; }
        }
      `}</style>
    </div>
  );
}
