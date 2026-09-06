import React from 'react';

/**
 * Standard Staunton Vector Chess Pieces
 * Scalable SVG rendering with high-contrast outlines and gradients.
 */
const ChessPieceSvg = ({ piece, className = '' }) => {
  if (!piece) return null;

  const isWhite = piece === piece.toUpperCase();
  const type = piece.toUpperCase();

  // White pieces: ivory gradient fill with sleek slate outline
  // Black pieces: deep obsidian carbon fill with bright silver outline for maximum contrast on dark squares
  const strokeColor = isWhite ? '#1e293b' : '#cbd5e1';
  const fillColor = isWhite ? 'url(#white-piece-grad)' : 'url(#black-piece-grad)';
  const detailColor = isWhite ? '#475569' : '#94a3b8';

  const renderPaths = () => {
    switch (type) {
      case 'P': // Pawn
        return (
          <g>
            <path
              d="M 22.5,9 C 19.8,9 17.7,11.1 17.7,13.8 C 17.7,15.6 18.7,17.1 20.2,18 C 17.5,19.2 16,21.5 16,25 C 16,26.5 16.5,27.5 17.5,28.5 L 14,36 L 31,36 L 27.5,28.5 C 28.5,27.5 29,26.5 29,25 C 29,21.5 27.5,19.2 24.8,18 C 26.3,17.1 27.3,15.6 27.3,13.8 C 27.3,11.1 25.2,9 22.5,9 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 12,36 L 33,36 L 32,39 L 13,39 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 11,39 L 34,39 L 34,41 L 11,41 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {isWhite && (
              <path
                d="M 20.5,12 C 20.5,10.9 21.4,10 22.5,10"
                fill="none"
                stroke="#fff"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            )}
          </g>
        );

      case 'R': // Rook
        return (
          <g>
            <path
              d="M 9,39 L 36,39 L 36,36 L 9,36 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 12,36 L 12,32 L 33,32 L 33,36 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 12,14 L 33,14 L 31,32 L 14,32 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 9,41 L 36,41 L 36,39 L 9,39 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <line x1="14" y1="17" x2="31" y2="17" stroke={detailColor} strokeWidth="1" />
            <line x1="13" y1="29" x2="32" y2="29" stroke={detailColor} strokeWidth="1" />
          </g>
        );

      case 'N': // Knight
        return (
          <g>
            <path
              d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 11,25 10,21 C 9,17 11.5,14.5 14,14 C 15,12 16,10 18,10 C 19.5,8 21.5,8 22,10 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 24,18 C 24,18 28,17 29,20 C 30,23 27,24 27,24 L 29,26 C 29,26 33,24 33,21 C 33,18 29,15 26,15 Z"
              fill={isWhite ? '#ffffff' : '#475569'}
              stroke={strokeColor}
              strokeWidth="1"
            />
            <circle cx="16" cy="18" r="1.5" fill={strokeColor} />
            <path
              d="M 9,39 L 36,39 L 36,41 L 9,41 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 13,24 C 14,24 16,25 16,27 C 16,29 13.5,30 12,30"
              fill="none"
              stroke={detailColor}
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>
        );

      case 'B': // Bishop
        return (
          <g>
            <path
              d="M 9,39 L 36,39 L 36,41 L 9,41 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 12,36 L 33,36 L 31,32 L 14,32 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 15,32 C 14,28 13.5,23 16,18 C 17.5,15 20,12 22.5,9 C 25,12 27.5,15 29,18 C 31.5,23 31,28 30,32 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle cx="22.5" cy="8" r="1.8" fill={fillColor} stroke={strokeColor} strokeWidth="1.2" />
            <path
              d="M 21,14 L 24,14 M 22.5,12.5 L 22.5,18.5"
              stroke={strokeColor}
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <path
              d="M 20,23 C 22.5,21.5 24,24 26,22"
              fill="none"
              stroke={detailColor}
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </g>
        );

      case 'Q': // Queen
        return (
          <g>
            <path
              d="M 9,39 L 36,39 L 36,41 L 9,41 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 12,36 L 33,36 L 31.5,32 L 13.5,32 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 14,32 C 13,26 11,21 9,15 C 13,18 16,19 18,17 C 20,15 22.5,11 22.5,11 C 22.5,11 25,15 27,17 C 29,19 32,18 36,15 C 34,21 32,26 31,32 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="14" r="1.5" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
            <circle cx="15.5" cy="15.5" r="1.5" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
            <circle cx="22.5" cy="10" r="1.8" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
            <circle cx="29.5" cy="15.5" r="1.5" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
            <circle cx="36" cy="14" r="1.5" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
            <path
              d="M 14,29 C 19,30 26,30 31,29"
              fill="none"
              stroke={detailColor}
              strokeWidth="1.2"
            />
          </g>
        );

      case 'K': // King
        return (
          <g>
            <path
              d="M 9,39 L 36,39 L 36,41 L 9,41 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 12,36 L 33,36 L 31.5,32 L 13.5,32 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 14,32 C 12,27 11.5,23 13,18 C 14.5,14 18,11.5 22.5,11.5 C 27,11.5 30.5,14 32,18 C 33.5,23 33,27 31,32 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* King's Cross */}
            <path
              d="M 22.5,5.5 L 22.5,11 M 20,7.5 L 25,7.5"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="square"
            />
            <circle cx="22.5" cy="5.5" r="0.8" fill={strokeColor} />
            <path
              d="M 17,21 C 20,23 25,23 28,21"
              fill="none"
              stroke={detailColor}
              strokeWidth="1.2"
            />
            <path
              d="M 15,28 C 19,30 26,30 30,28"
              fill="none"
              stroke={detailColor}
              strokeWidth="1.2"
            />
          </g>
        );

      default:
        return null;
    }
  };

  return (
    <svg
      viewBox="0 0 45 45"
      className={`chess-piece-svg ${isWhite ? 'piece-white' : 'piece-black'} ${className}`}
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="white-piece-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="black-piece-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="50%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      {renderPaths()}
    </svg>
  );
};

export default ChessPieceSvg;
