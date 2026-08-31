/**
 * Rock-Paper-Scissors Game Logic
 */

export const CHOICES = ['rock', 'paper', 'scissors'];

export const getRPSWinner = (playerChoice, botChoice) => {
  if (playerChoice === botChoice) {
    return 'draw';
  }

  if (
    (playerChoice === 'rock' && botChoice === 'scissors') ||
    (playerChoice === 'paper' && botChoice === 'rock') ||
    (playerChoice === 'scissors' && botChoice === 'paper')
  ) {
    return 'player';
  }

  return 'bot';
};

// Simple weighted bot AI - slightly favors common player patterns
export const getBotChoice = (playerHistory = []) => {
  const recentMoves = playerHistory.slice(-3); // Look at last 3 moves
  
  if (recentMoves.length === 0) {
    // First move - random
    return CHOICES[Math.floor(Math.random() * CHOICES.length)];
  }

  // Count frequency of player moves
  const moveCounts = { rock: 0, paper: 0, scissors: 0 };
  recentMoves.forEach(move => {
    if (Object.prototype.hasOwnProperty.call(moveCounts, move)) {
      moveCounts[move]++;
    }
  });

  // Find most common move
  const mostCommon = Object.keys(moveCounts).reduce((a, b) => 
    moveCounts[a] > moveCounts[b] ? a : b
  );

  // Counter the most common move 70% of the time, random 30%
  if (Math.random() < 0.7 && moveCounts[mostCommon] > 0) {
    if (mostCommon === 'rock') return 'paper';
    if (mostCommon === 'paper') return 'scissors';
    if (mostCommon === 'scissors') return 'rock';
  }

  // Random move
  return CHOICES[Math.floor(Math.random() * CHOICES.length)];
};

export const getChoiceEmoji = (choice) => {
  switch (choice) {
    case 'rock':
      return '✊';
    case 'paper':
      return '✋';
    case 'scissors':
      return '✌️';
    default:
      return '';
  }
};
