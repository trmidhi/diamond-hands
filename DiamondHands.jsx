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
  let wave = 0;
  let wavePhase = 0;
  let volatility = 1;
  let trend = 0;
  let crashProbability = 0;

  // Pre-generate wave schedule for consistency
  const waveSchedule = [];
  let nextWaveTime = 10 + rng() * 5;
  for (let i = 0; i < 100; i++) {
    waveSchedule.push({
      time: nextWaveTime,
      intensity: 0.5 + rng() * 1.5,
      direction: rng() < 0.6 ? -1 : 1, // Slightly biased toward dips
      duration: 3 + rng() * 7
    });
    nextWaveTime += 15 + rng() * 30;
  }

  let waveIndex = 0;
  let activeWave = null;

  return {
    tick(elapsed) {
      // Check for wave triggers
      if (waveIndex < waveSchedule.length && elapsed >= waveSchedule[waveIndex].time) {
        activeWave = { ...waveSchedule[waveIndex], startTime: elapsed };
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

      // Base volatility increases over time
      volatility = 1 + (elapsed / 60) * 0.5;

      // Random micro-movements
      const noise = (rng() - 0.5) * 2 * volatility;

      // Momentum with decay
      velocity = velocity * 0.95 + noise * 0.3 + waveEffect * 0.5;

      // Apply movement
      const percentChange = velocity * 0.1;
      price = price * (1 + percentChange / 100);

      // Clamp price to prevent negative
      price = Math.max(price, 0.01);

      // Random crash events (rare but brutal)
      if (elapsed > 30 && rng() < 0.0005 * (elapsed / 60)) {
        price = price * (0.7 + rng() * 0.2); // 10-30% instant crash
      }

      // Random pumps (also rare)
      if (rng() < 0.0003 * (elapsed / 60)) {
        price = price * (1.1 + rng() * 0.2); // 10-30% instant pump
      }

      return {
        price,
        percentChange: ((price - 100) / 100) * 100,
        velocity,
        volatility,
        isWave: activeWave !== null,
        waveDirection: activeWave?.direction || 0
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
    }
  };
}

// ============================================================================
// EASTER EGGS
// ============================================================================

function checkEasterEgg(time, exitPercent) {
  const roundedPercent = Math.round(exitPercent * 10) / 10;
  const roundedTime = Math.round(time * 10) / 10;

  if (roundedPercent === -69.0) return 'Nice.';
  if (roundedPercent === -42.0) return 'The answer was HODL';
  if (roundedPercent === -99.0) return "At least it's not -100%";
  if (Math.floor(time) === 69) return 'Nice.';
  if (formatTime(time) === '4:20.0') return 'Blazed through that one';

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

  // Anti-cheat
  const [warnings, setWarnings] = useState(0);
  const [livenessCheck, setLivenessCheck] = useState(null);
  const [livenessTimer, setLivenessTimer] = useState(0);

  // UI state
  const [showResults, setShowResults] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [personalBest, setPersonalBest] = useState(null);
  const [copied, setCopied] = useState(false);
  const [screenFlash, setScreenFlash] = useState(null);
  const [waveAnnouncement, setWaveAnnouncement] = useState(null);

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

  // Reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

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

          // Screen flash for big moves
          if (!prefersReducedMotion) {
            const lastPrice = priceHistory[priceHistory.length - 1]?.price || 100;
            const change = ((update.price - lastPrice) / lastPrice) * 100;
            if (Math.abs(change) > 3) {
              flashScreen(change > 0 ? 'green' : 'red');
            }
          }
        }

        // Wave announcements
        if (update.isWave && !isWave) {
          announceWave(update.waveDirection);
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
  }, [gameState, isHolding, isWave, prefersReducedMotion]);

  // ============================================================================
  // ANTI-CHEAT: MOVEMENT CHECK
  // ============================================================================

  useEffect(() => {
    if (!isHolding) return;

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceMovement = now - lastMovementTimeRef.current;

      // Warn if no movement for 3+ seconds
      if (timeSinceMovement > 3000 && touchHistoryRef.current.length > 0) {
        triggerMovementWarning();
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, [isHolding]);

  // ============================================================================
  // ANTI-CHEAT: LIVENESS CHECK
  // ============================================================================

  useEffect(() => {
    if (gameState !== 'playing' || !isHolding) return;

    // Random liveness check between 20-30 seconds
    const scheduleCheck = () => {
      const delay = 20000 + Math.random() * 10000;
      return setTimeout(() => {
        triggerLivenessCheck();
      }, delay);
    };

    const timeout = scheduleCheck();

    return () => clearTimeout(timeout);
  }, [gameState, isHolding, livenessCheck]);

  // Liveness check timer countdown
  useEffect(() => {
    if (!livenessCheck) return;

    const interval = setInterval(() => {
      setLivenessTimer(prev => {
        if (prev <= 0) {
          // Failed liveness check
          handleLivenessFail();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [livenessCheck]);

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
    setWarnings(0);
    setLivenessCheck(null);
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

    setGameState('playing');
  }, [challenge, seed]);

  const startHolding = useCallback(() => {
    if (gameState === 'idle') {
      startGame();
    }

    if (gameState !== 'ended') {
      startTimeRef.current = startTimeRef.current || performance.now();
      setIsHolding(true);
      lastMovementTimeRef.current = Date.now();
    }
  }, [gameState, startGame]);

  const stopHolding = useCallback(() => {
    if (!isHolding || gameState !== 'playing') return;

    setIsHolding(false);
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
  }, [isHolding, gameState, time, percentChange, challenge]);

  const resetGame = useCallback(() => {
    setGameState('idle');
    setIsHolding(false);
    setShowResults(false);
    setChallengeResult(null);

    // Clear challenge if returning to menu
    if (!challenge) {
      setChallenge(null);
    }
  }, [challenge]);

  const startFreshGame = useCallback(() => {
    // Clear challenge and start new game
    setChallenge(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
    setGameState('idle');
    setShowResults(false);
  }, []);

  // ============================================================================
  // ANTI-CHEAT HANDLERS
  // ============================================================================

  const triggerMovementWarning = useCallback(() => {
    setWarnings(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        // Auto-release after 3 warnings
        stopHolding();
      }
      return newCount;
    });
  }, [stopHolding]);

  const triggerLivenessCheck = useCallback(() => {
    // Generate random target position
    const target = {
      x: 20 + Math.random() * 60, // 20-80% of width
      y: 20 + Math.random() * 60, // 20-80% of height
      size: 60
    };
    setLivenessCheck(target);
    setLivenessTimer(3); // 3 seconds to respond
  }, []);

  const handleLivenessSuccess = useCallback(() => {
    setLivenessCheck(null);
    setLivenessTimer(0);
  }, []);

  const handleLivenessFail = useCallback(() => {
    setLivenessCheck(null);
    setLivenessTimer(0);
    stopHolding();
  }, [stopHolding]);

  const recordTouch = useCallback((x, y) => {
    lastMovementTimeRef.current = Date.now();
    touchHistoryRef.current.push({ x, y, time: Date.now() });

    // Keep only last 50 touch points
    if (touchHistoryRef.current.length > 50) {
      touchHistoryRef.current = touchHistoryRef.current.slice(-50);
    }
  }, []);

  // ============================================================================
  // INPUT HANDLERS
  // ============================================================================

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    startHolding();
  }, [startHolding]);

  const handleMouseUp = useCallback((e) => {
    e.preventDefault();
    stopHolding();
  }, [stopHolding]);

  const handleMouseLeave = useCallback(() => {
    if (isHolding) {
      stopHolding();
    }
  }, [isHolding, stopHolding]);

  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    activeTouchIdRef.current = touch.identifier;
    touchHistoryRef.current = [];
    recordTouch(touch.clientX, touch.clientY);
    startHolding();
  }, [startHolding, recordTouch]);

  const handleTouchMove = useCallback((e) => {
    const touch = Array.from(e.touches).find(
      t => t.identifier === activeTouchIdRef.current
    );

    if (!touch) {
      stopHolding();
      return;
    }

    recordTouch(touch.clientX, touch.clientY);
  }, [stopHolding, recordTouch]);

  const handleTouchEnd = useCallback((e) => {
    const touch = Array.from(e.changedTouches).find(
      t => t.identifier === activeTouchIdRef.current
    );

    if (touch) {
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

  // ============================================================================
  // VISUAL EFFECTS
  // ============================================================================

  const flashScreen = useCallback((color) => {
    setScreenFlash(color);
    setTimeout(() => setScreenFlash(null), 100);
  }, []);

  const announceWave = useCallback((direction) => {
    const text = direction < 0 ? 'DUMP INCOMING' : 'PUMP DETECTED';
    setWaveAnnouncement(text);
    setTimeout(() => setWaveAnnouncement(null), 2000);
  }, []);

  // ============================================================================
  // SHARE HANDLERS
  // ============================================================================

  const handleCopyShare = useCallback(async () => {
    const titleData = getTitle(time);
    const diamonds = getDiamonds(time);
    const shareURL = generateShareURL(seed, time, percentChange);

    const shareText = `◆ DIAMOND HANDS ◆

Time: ${formatTime(time)} | Exit: ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%
${titleData.title} (${'◆'.repeat(diamonds)})

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
    const titleData = getTitle(time);
    const diamonds = getDiamonds(time);
    const shareURL = generateShareURL(seed, time, percentChange);

    const tweetText = encodeURIComponent(
      `I survived ${formatTime(time)} in DIAMOND HANDS\n\n` +
      `Exit: ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%\n` +
      `${titleData.title} ${'◆'.repeat(diamonds)}\n\n` +
      `Think you can beat me? 💎🙌`
    );

    const tweetURL = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareURL)}`;
    window.open(tweetURL, '_blank');
  }, [time, percentChange, seed]);

  // ============================================================================
  // LIVENESS CHECK CLICK
  // ============================================================================

  const handleLivenessClick = useCallback((e) => {
    if (!livenessCheck) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Check if click is within target
    const dx = x - livenessCheck.x;
    const dy = y - livenessCheck.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 10) { // Within 10% of screen
      handleLivenessSuccess();
    }
  }, [livenessCheck, handleLivenessSuccess]);

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

  return (
    <div
      className="min-h-screen bg-black text-white flex flex-col select-none overflow-hidden"
      style={{ minHeight: '100dvh' }}
    >
      {/* Screen flash overlay */}
      {screenFlash && !prefersReducedMotion && (
        <div
          className="fixed inset-0 pointer-events-none z-50 transition-opacity"
          style={{
            backgroundColor: screenFlash === 'red'
              ? 'rgba(239, 68, 68, 0.2)'
              : 'rgba(34, 197, 94, 0.2)'
          }}
        />
      )}

      {/* Wave announcement */}
      {waveAnnouncement && !prefersReducedMotion && (
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-40"
        >
          <div
            className="text-4xl md:text-6xl font-black tracking-wider"
            style={{
              color: waveAnnouncement.includes('DUMP') ? '#ef4444' : '#22c55e',
              animation: 'wave-enter 2s ease-out forwards'
            }}
          >
            {waveAnnouncement}
          </div>
        </div>
      )}

      {/* Liveness check overlay */}
      {livenessCheck && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={handleLivenessClick}
        >
          <div className="text-center">
            <div className="text-xl mb-4">PROVE YOU'RE HUMAN</div>
            <div className="text-4xl font-bold text-yellow-400 mb-4">
              TAP THE TARGET
            </div>
            <div className="text-2xl text-red-500">
              {livenessTimer.toFixed(1)}s
            </div>
          </div>

          {/* Target */}
          <div
            className="absolute w-16 h-16 rounded-full border-4 border-yellow-400 animate-pulse cursor-pointer"
            style={{
              left: `calc(${livenessCheck.x}% - 32px)`,
              top: `calc(${livenessCheck.y}% - 32px)`,
            }}
          >
            <div className="absolute inset-2 bg-yellow-400 rounded-full" />
          </div>
        </div>
      )}

      {/* Header */}
      <header className="p-4 text-center">
        <h1 className="text-2xl md:text-3xl font-black tracking-wider">
          ◆ DIAMOND HANDS ◆
        </h1>
        {personalBest && gameState === 'idle' && (
          <div className="text-sm text-gray-500 mt-1">
            Personal Best: {formatTime(personalBest.time)} ({personalBest.title})
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
            className={`text-5xl md:text-7xl font-black tabular-nums ${
              isVolatile && !prefersReducedMotion ? 'animate-shake' : ''
            }`}
            style={{ color: percentChange >= 0 ? '#22c55e' : '#ef4444' }}
          >
            ${price.toFixed(2)}
          </div>
          <div
            className="text-2xl md:text-3xl font-bold mt-1"
            style={{ color: percentChange >= 0 ? '#22c55e' : '#ef4444' }}
          >
            {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%
          </div>
        </div>

        {/* Chart */}
        <div
          ref={chartRef}
          className="flex-1 min-h-[200px] md:min-h-[300px] max-h-[400px] bg-gray-900/50 rounded-lg mb-4 overflow-hidden"
        >
          {renderChart()}
        </div>

        {/* Timer and stats */}
        <div className="flex justify-between items-center mb-4 px-2">
          <div>
            <div className="text-gray-500 text-sm">TIME</div>
            <div className="text-2xl md:text-3xl font-mono font-bold">
              {formatTime(time)}
            </div>
          </div>

          <div className="text-center">
            <div
              className="text-lg font-bold"
              style={{ color: getTierColor(titleData.tier) }}
            >
              {titleData.title}
            </div>
            <div className="text-yellow-400">
              {'◆'.repeat(diamonds)}{'◇'.repeat(10 - diamonds)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-gray-500 text-sm">WAVE</div>
            <div className={`text-xl font-bold ${isWave ? 'text-yellow-400' : 'text-gray-600'}`}>
              {isWave ? (waveDirection < 0 ? '↓ DUMP' : '↑ PUMP') : 'CALM'}
            </div>
          </div>
        </div>

        {/* Warnings */}
        {warnings > 0 && (
          <div className="text-center text-red-500 text-sm mb-2">
            ⚠️ Movement warning ({warnings}/3) - Keep your finger moving!
          </div>
        )}

        {/* Hold button */}
        {!showResults && (
          <button
            ref={holdButtonRef}
            className={`
              w-full py-8 md:py-10 rounded-xl font-black text-2xl md:text-3xl uppercase tracking-wider
              transition-all duration-150 outline-none
              ${isHolding
                ? 'bg-gradient-to-b from-green-600 to-green-800 text-white shadow-lg shadow-green-500/30 scale-[0.98]'
                : 'bg-gray-800 text-gray-300 border-2 border-gray-600 hover:border-gray-500'
              }
              ${!isHolding && !prefersReducedMotion ? 'animate-pulse-border' : ''}
              focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black
            `}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            aria-label={isHolding ? 'Release to sell' : 'Hold to buy'}
          >
            {isHolding ? '💎 HOLDING 💎' : 'HOLD TO HODL'}
          </button>
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

      {/* Results modal */}
      {showResults && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md bg-gray-900 rounded-2xl p-6 text-center"
            style={{
              border: challengeResult ? '3px solid #fbbf24' : '2px solid #333'
            }}
          >
            {/* Challenge result */}
            {challengeResult && (
              <div className={`text-4xl md:text-5xl font-black mb-4 ${
                challengeResult === 'win' ? 'text-green-400' : 'text-red-400'
              }`}>
                {challengeResult === 'win' ? '🏆 YOU WIN! 🏆' : '😭 THEY WIN 😭'}
              </div>
            )}

            {/* Title */}
            <div
              className="text-2xl md:text-3xl font-black mb-2"
              style={{ color: getTierColor(titleData.tier) }}
            >
              {titleData.title}
            </div>

            {/* Diamonds */}
            <div className="text-3xl text-yellow-400 mb-4">
              {'◆'.repeat(diamonds)}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-black/50 rounded-lg p-3">
                <div className="text-gray-500 text-sm">TIME</div>
                <div className="text-2xl font-bold">{formatTime(time)}</div>
              </div>
              <div className="bg-black/50 rounded-lg p-3">
                <div className="text-gray-500 text-sm">EXIT</div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: percentChange >= 0 ? '#22c55e' : '#ef4444' }}
                >
                  {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Challenge comparison */}
            {challenge && (
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 mb-4">
                <div className="text-yellow-400 text-sm mb-1">CHALLENGE COMPARISON</div>
                <div className="flex justify-center items-center gap-4">
                  <div>
                    <div className="text-xs text-gray-400">YOU</div>
                    <div className="font-bold">{formatTime(time)}</div>
                  </div>
                  <div className="text-gray-500">vs</div>
                  <div>
                    <div className="text-xs text-gray-400">THEM</div>
                    <div className="font-bold">{formatTime(challenge.time)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Easter egg */}
            {easterEgg && (
              <div className="text-yellow-400 italic mb-4">
                "{easterEgg}"
              </div>
            )}

            {/* New best */}
            {newBest && (
              <div className="text-green-400 font-bold mb-4">
                🎉 NEW PERSONAL BEST! 🎉
              </div>
            )}

            {/* Share buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleCopyShare}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition-colors"
              >
                {copied ? '✓ COPIED!' : '📋 COPY LINK'}
              </button>
              <button
                onClick={handleTweetShare}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-colors"
              >
                🐦 TWEET
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={resetGame}
                className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-bold transition-colors"
              >
                {challenge ? 'TRY AGAIN' : 'PLAY AGAIN'}
              </button>
              {challenge && (
                <button
                  onClick={startFreshGame}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition-colors"
                >
                  NEW GAME
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global styles */}
      <style>{`
        @keyframes pulse-border {
          0%, 100% { border-color: #404040; }
          50% { border-color: #737373; }
        }

        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }

        .animate-shake {
          animation: shake 0.1s linear infinite;
        }

        @keyframes wave-enter {
          0% { transform: scale(2); opacity: 0; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-pulse-border,
          .animate-shake {
            animation: none;
          }
        }

        /* Prevent text selection and touch highlights */
        * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
        }

        /* Ensure the hold button is large enough on mobile */
        @media (max-width: 640px) {
          .text-5xl { font-size: 2.5rem; }
          .text-7xl { font-size: 2.5rem; }
        }
      `}</style>
    </div>
  );
}
