import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Chess.css';
import {
  initBoard,
  getLegalMovesForPiece,
  movePiece,
  isInCheck,
  isCheckmate,
  isStalemate,
  isPawnPromotion,
  promotePawn,
  PIECE_SYMBOLS,
  getPieceColor,
} from '../utils/chessLogic';
import { getBestMove } from '../utils/chessAI';
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playWinSound,
  playDrawSound,
} from '../utils/gameAudio';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const Chess = ({ onBack }) => {
  const [gameMode, setGameMode] = useState(null); // null, '1p', '2p'
  const [board, setBoard] = useState(() => initBoard());
  const [currentPlayer, setCurrentPlayer] = useState('white');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });
  const [promotionPending, setPromotionPending] = useState(null);
  const [lastMove, setLastMove] = useState(null);

  // Compute status and winner directly from board & currentPlayer
  const { gameStatus, winner } = useMemo(() => {
    if (isCheckmate(board, currentPlayer)) {
      return {
        gameStatus: 'checkmate',
        winner: currentPlayer === 'white' ? 'black' : 'white',
      };
    }
    if (isStalemate(board, currentPlayer)) {
      return { gameStatus: 'stalemate', winner: null };
    }
    if (isInCheck(board, currentPlayer)) {
      return { gameStatus: 'check', winner: null };
    }
    return { gameStatus: 'playing', winner: null };
  }, [board, currentPlayer]);

  const aiThinking = gameMode === '1p' && currentPlayer === 'black' && gameStatus === 'playing';

  // Execute move logic
  const executeMove = useCallback((fromRow, fromCol, toRow, toCol, chosenPromotion = null) => {
    const piece = board[fromRow][fromCol];
    if (!piece) return;

    // Check for pawn promotion
    if (isPawnPromotion(piece, toRow)) {
      if (chosenPromotion) {
        // AI or preset promotion
        const { board: tempBoard, captured } = movePiece(board, fromRow, fromCol, toRow, toCol);
        const finalBoard = promotePawn(
          tempBoard,
          toRow,
          toCol,
          currentPlayer === 'white' ? chosenPromotion.toUpperCase() : chosenPromotion.toLowerCase()
        );

        if (captured) {
          setCapturedPieces((prev) => ({
            ...prev,
            [currentPlayer]: [...prev[currentPlayer], captured],
          }));
          playCaptureSound();
        } else {
          playMoveSound();
        }

        setBoard(finalBoard);
        setLastMove({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } });
        setMoveHistory((prev) => [
          ...prev,
          {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece,
            captured,
            promotedTo: chosenPromotion,
          },
        ]);
        setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
        setSelectedSquare(null);
        setValidMoves([]);
        setPromotionPending(null);
        return;
      }

      // If human in 1p or 2p, show promotion modal
      if (gameMode === '1p' && currentPlayer === 'black') {
        // AI automatically promotes to Queen
        const { board: tempBoard, captured } = movePiece(board, fromRow, fromCol, toRow, toCol);
        const finalBoard = promotePawn(tempBoard, toRow, toCol, 'q');

        if (captured) {
          setCapturedPieces((prev) => ({
            ...prev,
            black: [...prev.black, captured],
          }));
          playCaptureSound();
        } else {
          playMoveSound();
        }

        setBoard(finalBoard);
        setLastMove({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } });
        setMoveHistory((prev) => [
          ...prev,
          {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece,
            captured,
            promotedTo: 'q',
          },
        ]);
        setCurrentPlayer('white');
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }

      // Human promotion modal
      setPromotionPending({ fromRow, fromCol, toRow, toCol });
      return;
    }

    const { board: newBoard, captured } = movePiece(
      board,
      fromRow,
      fromCol,
      toRow,
      toCol
    );

    if (captured) {
      setCapturedPieces((prev) => ({
        ...prev,
        [currentPlayer]: [...prev[currentPlayer], captured],
      }));
      playCaptureSound();
    } else {
      playMoveSound();
    }

    setBoard(newBoard);
    setLastMove({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } });
    setMoveHistory((prev) => [
      ...prev,
      { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol }, piece, captured },
    ]);
    setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
    setSelectedSquare(null);
    setValidMoves([]);
  }, [board, currentPlayer, gameMode]);

  // Handle AI move
  useEffect(() => {
    if (gameMode !== '1p' || currentPlayer !== 'black' || gameStatus === 'checkmate' || gameStatus === 'stalemate') {
      return;
    }

    const timer = setTimeout(() => {
      const bestMove = getBestMove(board, 'black');
      if (bestMove) {
        executeMove(
          bestMove.from.row,
          bestMove.from.col,
          bestMove.to.row,
          bestMove.to.col
        );
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [gameMode, currentPlayer, board, gameStatus, executeMove]);

  // Play audio when game status changes
  useEffect(() => {
    if (gameStatus === 'checkmate') {
      playWinSound();
    } else if (gameStatus === 'stalemate') {
      playDrawSound();
    } else if (gameStatus === 'check') {
      playCheckSound();
    }
  }, [gameStatus]);

  const handleSquareClick = (row, col) => {
    if (aiThinking || gameStatus === 'checkmate' || gameStatus === 'stalemate') return;

    // If a valid move square is clicked, execute the move
    if (validMoves.some((m) => m.row === row && m.col === col)) {
      executeMove(selectedSquare.row, selectedSquare.col, row, col);
      return;
    }

    // If clicking on own piece, select it
    const piece = board[row][col];
    if (piece && getPieceColor(piece) === currentPlayer) {
      setSelectedSquare({ row, col });
      const moves = getLegalMovesForPiece(board, row, col);
      setValidMoves(moves);
      return;
    }

    // Otherwise deselect
    setSelectedSquare(null);
    setValidMoves([]);
  };

  const handlePromotion = (promotionPiece) => {
    if (!promotionPending) return;
    const { fromRow, fromCol, toRow, toCol } = promotionPending;
    executeMove(fromRow, fromCol, toRow, toCol, promotionPiece);
  };

  const handleUndo = () => {
    if (moveHistory.length === 0 || aiThinking) return;

    if (gameMode === '1p') {
      // In 1P mode, revert 2 half-moves (AI move and human move)
      const stepsToRevert = currentPlayer === 'black' ? 1 : moveHistory.length >= 2 ? 2 : 1;
      let tempBoard = initBoard();
      const targetHistory = moveHistory.slice(0, -stepsToRevert);

      // Replay moves to target state
      const newCaptured = { white: [], black: [] };
      let player = 'white';

      for (let hist of targetHistory) {
        const { from, to, promotedTo } = hist;
        const res = movePiece(tempBoard, from.row, from.col, to.row, to.col);
        tempBoard = res.board;
        if (promotedTo) {
          tempBoard = promotePawn(tempBoard, to.row, to.col, player === 'white' ? promotedTo.toUpperCase() : promotedTo.toLowerCase());
        }
        if (res.captured) {
          newCaptured[player].push(res.captured);
        }
        player = player === 'white' ? 'black' : 'white';
      }

      setBoard(tempBoard);
      setMoveHistory(targetHistory);
      setCapturedPieces(newCaptured);
      setCurrentPlayer(player);
      setSelectedSquare(null);
      setValidMoves([]);
      setPromotionPending(null);
      setLastMove(
        targetHistory.length > 0
          ? { from: targetHistory[targetHistory.length - 1].from, to: targetHistory[targetHistory.length - 1].to }
          : null
      );
    } else {
      // 2P mode: revert 1 half-move
      const last = moveHistory[moveHistory.length - 1];
      const newBoard = board.map((row) => [...row]);
      newBoard[last.from.row][last.from.col] = last.piece;
      newBoard[last.to.row][last.to.col] = last.captured || null;

      const prevColor = currentPlayer === 'white' ? 'black' : 'white';
      if (last.captured) {
        setCapturedPieces((prev) => ({
          ...prev,
          [prevColor]: prev[prevColor].slice(0, -1),
        }));
      }

      const nextHistory = moveHistory.slice(0, -1);
      setBoard(newBoard);
      setMoveHistory(nextHistory);
      setCurrentPlayer(prevColor);
      setSelectedSquare(null);
      setValidMoves([]);
      setPromotionPending(null);
      setLastMove(
        nextHistory.length > 0
          ? { from: nextHistory[nextHistory.length - 1].from, to: nextHistory[nextHistory.length - 1].to }
          : null
      );
    }
  };

  const handleNewGame = () => {
    setBoard(initBoard());
    setCurrentPlayer('white');
    setSelectedSquare(null);
    setValidMoves([]);
    setMoveHistory([]);
    setCapturedPieces({ white: [], black: [] });
    setPromotionPending(null);
    setLastMove(null);
  };

  const handleStartGame = (mode) => {
    setGameMode(mode);
    handleNewGame();
  };

  if (!gameMode) {
    return (
      <div className="chess-container animate-fade-in">
        <div className="chess-header">
          <button className="btn-back" onClick={onBack}>← Back</button>
          <h1>Chess</h1>
          <div className="spacer"></div>
        </div>

        <div className="mode-selector">
          <h2>Select Game Mode</h2>
          <div className="mode-buttons">
            <button 
              className="btn-mode"
              onClick={() => handleStartGame('1p')}
            >
              <span className="mode-icon">🤖</span>
              <span>vs Computer</span>
            </button>
            <button 
              className="btn-mode"
              onClick={() => handleStartGame('2p')}
            >
              <span className="mode-icon">👥</span>
              <span>2 Players</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chess-container animate-fade-in">
      <div className="chess-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h1>Chess</h1>
        <div className="header-actions">
          <button className="btn-menu" onClick={handleNewGame}>Reset</button>
          <button className="btn-outline" onClick={() => setGameMode(null)}>Mode</button>
        </div>
      </div>

      <div className="chess-content">
        <div className="info-panel">
          <div className="player-info">
            <div className="current-player">
              <span className={`player-indicator ${currentPlayer}`}>
                ●
              </span>
              <div>
                <p className="player-label">Current Turn</p>
                <p className="player-name">
                  {currentPlayer.toUpperCase()} {gameMode === '1p' && currentPlayer === 'black' ? '(Bot)' : ''}
                </p>
              </div>
            </div>
            {gameStatus === 'check' && (
              <div className="status-badge check" role="status">⚠️ Check!</div>
            )}
            {gameStatus === 'checkmate' && (
              <div className="status-badge checkmate" role="status">♚ Checkmate! {winner?.toUpperCase()} Wins!</div>
            )}
            {gameStatus === 'stalemate' && (
              <div className="status-badge stalemate" role="status">🤝 Stalemate (Draw)</div>
            )}
          </div>

          <div className="captured-pieces">
            <div className="captured-column">
              <p className="captured-label">Captured by White</p>
              <div className="captured-list">
                {capturedPieces.white.map((piece, idx) => (
                  <span key={idx} className="captured-piece piece-black">
                    {PIECE_SYMBOLS[piece]}
                  </span>
                ))}
              </div>
            </div>
            <div className="captured-column">
              <p className="captured-label">Captured by Black</p>
              <div className="captured-list">
                {capturedPieces.black.map((piece, idx) => (
                  <span key={idx} className="captured-piece piece-white">
                    {PIECE_SYMBOLS[piece]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="board-container">
          <div className="board-wrapper-with-coords">
            {/* Top Files */}
            <div className="board-files top">
              {FILES.map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>

            <div className="board-middle-row">
              {/* Left Ranks */}
              <div className="board-ranks">
                {RANKS.map((r) => (
                  <span key={r}>{r}</span>
                ))}
              </div>

              {/* 8x8 Board Grid */}
              <div className="chess-board">
                {board.map((row, rowIdx) =>
                  row.map((piece, colIdx) => {
                    const isSelected =
                      selectedSquare && selectedSquare.row === rowIdx && selectedSquare.col === colIdx;
                    const isValidMove = validMoves.some((m) => m.row === rowIdx && m.col === colIdx);
                    const isLight = (rowIdx + colIdx) % 2 === 0;
                    const isLastMoveSquare =
                      lastMove &&
                      ((lastMove.from.row === rowIdx && lastMove.from.col === colIdx) ||
                        (lastMove.to.row === rowIdx && lastMove.to.col === colIdx));

                    const pieceColor = piece ? getPieceColor(piece) : null;

                    return (
                      <button
                        type="button"
                        key={`${rowIdx}-${colIdx}`}
                        className={`chess-square ${isLight ? 'light' : 'dark'} ${
                          isSelected ? 'selected' : ''
                        } ${isValidMove ? 'valid-move' : ''} ${
                          isLastMoveSquare ? 'last-move' : ''
                        }`}
                        onClick={() => handleSquareClick(rowIdx, colIdx)}
                        aria-label={`${FILES[colIdx]}${RANKS[rowIdx]}${piece ? `, ${pieceColor} ${piece}` : ', empty'}${isSelected ? ', selected' : ''}${isValidMove ? ', valid move' : ''}`}
                      >
                        {piece && (
                          <span className={`chess-piece piece-${pieceColor}`}>
                            {PIECE_SYMBOLS[piece]}
                          </span>
                        )}
                        {isValidMove && <span className="chess-move-indicator"></span>}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right Ranks */}
              <div className="board-ranks">
                {RANKS.map((r) => (
                  <span key={r}>{r}</span>
                ))}
              </div>
            </div>

            {/* Bottom Files */}
            <div className="board-files bottom">
              {FILES.map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="controls">
          <button
            className="btn-undo"
            onClick={handleUndo}
            disabled={moveHistory.length === 0 || aiThinking}
          >
            ↶ Undo Move
          </button>
          <button className="btn-new-game" onClick={handleNewGame}>
            New Game
          </button>
        </div>

        {aiThinking && gameMode === '1p' && (
          <div className="thinking">
            🤖 Computer is calculating best move...
          </div>
        )}

        {gameStatus === 'checkmate' && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>🎉 Checkmate!</h2>
              <p><strong>{winner?.toUpperCase()}</strong> is victorious!</p>
              <div className="modal-buttons">
                <button className="btn-primary" onClick={handleNewGame}>
                  Play Again
                </button>
                <button className="btn-secondary" onClick={() => setGameMode(null)}>
                  Mode Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {gameStatus === 'stalemate' && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>🤝 Stalemate!</h2>
              <p>Game is a draw.</p>
              <div className="modal-buttons">
                <button className="btn-primary" onClick={handleNewGame}>
                  Play Again
                </button>
                <button className="btn-secondary" onClick={() => setGameMode(null)}>
                  Mode Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {promotionPending && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>Pawn Promotion</h2>
              <p>Choose a piece:</p>
              <div className="promotion-choices">
                {['Q', 'R', 'B', 'N'].map((piece) => (
                  <button
                    key={piece}
                    className="promotion-btn"
                    onClick={() => handlePromotion(piece)}
                  >
                    <span className={`piece piece-${currentPlayer}`}>
                      {PIECE_SYMBOLS[currentPlayer === 'white' ? piece : piece.toLowerCase()]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chess;
