import { PATH, PLAYERS, SAFE_SPOTS, getTokenPosition } from './ludoPositions.js';

const getPathKey = (position) => `${position[0]},${position[1]}`;

export const isPositionSafe = (position) => {
  const pathIndex = PATH.findIndex(([row, col]) => row === position[0] && col === position[1]);
  return pathIndex >= 0 && SAFE_SPOTS.includes(pathIndex);
};

const getTokenDestination = (playerColor, token, roll) => {
  if (token.status === 'base') {
    if (roll !== 6) return null;
    return {
      status: 'active',
      step: 0,
      position: getTokenPosition(playerColor, { ...token, status: 'active', step: 0 }),
      isStart: true,
    };
  }

  if (token.status === 'active') {
    const nextStep = token.step + roll;
    if (nextStep > 57) return null;
    const status = nextStep === 57 ? 'home' : 'active';
    const position = getTokenPosition(playerColor, { ...token, step: nextStep, status });
    return { status, step: nextStep, position, isStart: false };
  }

  return null;
};

const getEnemyTokensAtPosition = (players, playerColor, position) => {
  const targetKey = getPathKey(position);
  const matches = [];

  Object.entries(players).forEach(([color, tokens]) => {
    if (color === playerColor) return;

    tokens.forEach((token) => {
      if (token.status === 'base' || token.status === 'home') return;
      const tokenPos = getTokenPosition(color, token);
      if (getPathKey(tokenPos) === targetKey) {
        matches.push({ color, tokenId: token.id });
      }
    });
  });

  return matches;
};

export const getPlayableTokens = (playerColor, players, roll) => {
  if (!roll) return [];

  return players[playerColor].filter((token) => {
    if (token.status === 'home') return false;
    if (token.status === 'base' && roll !== 6) return false;
    if (token.status === 'active' && token.step + roll > 57) return false;
    return true;
  });
};

export const chooseBestBotMove = (playerColor, players, roll) => {
  const playable = getPlayableTokens(playerColor, players, roll);
  if (playable.length === 0) return null;

  let bestMove = null;

  playable.forEach((token) => {
    const candidate = getTokenDestination(playerColor, token, roll);
    if (!candidate) return;

    const enemyTokens = getEnemyTokensAtPosition(players, playerColor, candidate.position);
    const canCapture = enemyTokens.length > 0 && !isPositionSafe(candidate.position);
    const isFinish = candidate.status === 'home' || candidate.step === 57;
    const isSafe = isPositionSafe(candidate.position) || candidate.isStart;

    let score = 0;
    if (isFinish) score += 1000;
    if (canCapture) score += 600 + enemyTokens.length * 120;
    if (isSafe) score += 70;
    score += token.status === 'base' ? 40 : token.step * 2;

    if (!bestMove || score > bestMove.score) {
      bestMove = {
        tokenId: token.id,
        score,
        reason: canCapture ? 'capture' : isFinish ? 'finish' : isSafe ? 'safe' : 'progress',
      };
    }
  });

  return bestMove;
};

export const canTokenCaptureOnMove = (playerColor, players, token, roll) => {
  const candidate = getTokenDestination(playerColor, token, roll);
  if (!candidate) return false;

  const captured = getEnemyTokensAtPosition(players, playerColor, candidate.position);
  return captured.length > 0 && !isPositionSafe(candidate.position);
};

export const getPlayerHome = (color) => PLAYERS[color].home;

export const hasPlayerWon = (tokens) => {
  return Array.isArray(tokens) && tokens.length > 0 && tokens.every((t) => t.status === 'home');
};
