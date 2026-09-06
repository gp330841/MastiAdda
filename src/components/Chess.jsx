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
  getPieceValue,
} from '../utils/chessLogic';
import { getBestMove } from '../utils/chessAI';
import ChessPieceSvg from './ChessPieceSvg';
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playWinSound,
  playDrawSound,
  isMasterSoundEnabled,
  setMasterSoundEnabled,
  playClickSound,
} from '../utils/gameAudio';
import { getGameScore, saveGameScore } from '../utils/scoreSync';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];
const CHESS_STORAGE_KEY = 'omni_chess_state';

const loadSavedChessState = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CHESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.board) && parsed.board.length === 8 && parsed.gameMode) {
      return parsed;
    }
  } catch (error) {
    void error;
  }
  return null;
};

const Chess = ({ onBack }) => {
  const savedState = useMemo(() => loadSavedChessState(), []);

  const [gameMode, setGameMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode')) return params.get('mode');
    }
    return savedState?.gameMode || null;
  });
  const [board, setBoard] = useState(() => savedState?.board || initBoard());
  const [currentPlayer, setCurrentPlayer] = useState(() => savedState?.currentPlayer || 'white');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [moveHistory, setMoveHistory] = useState(() => savedState?.moveHistory || []);
  const [capturedPieces, setCapturedPieces] = useState(() => savedState?.capturedPieces || { white: [], black: [] });
  const [promotionPending, setPromotionPending] = useState(null);
  const [lastMove, setLastMove] = useState(() => savedState?.lastMove || null);
  const [soundEnabled, setSoundEnabled] = useState(() => isMasterSoundEnabled());
  const [boardTheme, setBoardTheme] = useState(() => {
    if (typeof window === 'undefined') return 'emerald';
    return localStorage.getItem('omni_chess_theme') || 'emerald';
  });

  const handleThemeChange = useCallback((theme) => {
    setBoardTheme(theme);
    try {
      localStorage.setItem('omni_chess_theme', theme);
    } catch {
      // ignore
    }
  }, []);

  const formatMoveNotation = useCallback((move) => {
    if (!move) return '';
    const pieceChar = move.piece ? move.piece.toUpperCase() : '';
    const piecePrefix = pieceChar === 'P' ? '' : pieceChar;
    const fromCol = FILES[move.from.col];
    const toCol = FILES[move.to.col];
    const toRow = RANKS[move.to.row];
    const capture = move.captured ? (pieceChar === 'P' ? `${fromCol}x` : 'x') : '';
    const promo = move.promotedTo ? `=${move.promotedTo.toUpperCase()}` : '';
    return `${piecePrefix}${capture}${toCol}${toRow}${promo}`;
  }, []);

  const formattedMoves = useMemo(() => {
    const list = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      const turnNum = Math.floor(i / 2) + 1;
      const whiteMove = moveHistory[i];
      const blackMove = moveHistory[i + 1];
      list.push({
        turnNum,
        white: formatMoveNotation(whiteMove),
        black: blackMove ? formatMoveNotation(blackMove) : null,
      });
    }
    return list;
  }, [moveHistory, formatMoveNotation]);

  // Compute status, winner, and checked king position directly from board & currentPlayer
  const { gameStatus, winner, checkedKingSquare } = useMemo(() => {
    const inMate = isCheckmate(board, currentPlayer);
    const inCheck = inMate || isInCheck(board, currentPlayer);

    let kingSquare = null;
    if (inCheck) {
      const kingTarget = currentPlayer === 'white' ? 'K' : 'k';
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (board[r][c] === kingTarget) {
            kingSquare = { row: r, col: c };
            break;
          }
        }
        if (kingSquare) break;
      }
    }

    if (inMate) {
      return {
        gameStatus: 'checkmate',
        winner: currentPlayer === 'white' ? 'black' : 'white',
        checkedKingSquare: kingSquare,
      };
    }
    if (isStalemate(board, currentPlayer)) {
      return { gameStatus: 'stalemate', winner: null, checkedKingSquare: null };
    }
    if (inCheck) {
      return { gameStatus: 'check', winner: null, checkedKingSquare: kingSquare };
    }
    return { gameStatus: 'playing', winner: null, checkedKingSquare: null };
  }, [board, currentPlayer]);

  // Material balance calculation
  const materialAdvantage = useMemo(() => {
    let whiteTotal = 0;
    let blackTotal = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece || piece.toUpperCase() === 'K') continue;
        const val = getPieceValue(piece);
        if (piece === piece.toUpperCase()) {
          whiteTotal += val;
        } else {
          blackTotal += val;
        }
      }
    }
    const diff = (whiteTotal - blackTotal) / 10;
    if (diff > 0) return { leader: 'White', score: `+${diff}` };
    if (diff < 0) return { leader: 'Black', score: `+${Math.abs(diff)}` };
    return { leader: 'Even', score: 'Equal' };
  }, [board]);

  // Sync wins to cloud
  useEffect(() => {
    if (gameStatus === 'checkmate' && winner === 'white') {
      const saved = getGameScore('chess');
      const prevWins = saved.stats?.wins || 0;
      saveGameScore('chess', {
        highScore: prevWins + 1,
        stats: { wins: prevWins + 1 },
      });
    }
  }, [gameStatus, winner]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setMasterSoundEnabled(next);
    if (next) playClickSound();
  };

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

  const handleUndo = useCallback(() => {
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
  }, [aiThinking, board, currentPlayer, gameMode, moveHistory]);

  // Keyboard shortcut for Undo (u or z)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'u' || e.key === 'U' || e.key === 'z' || e.key === 'Z') {
        if (!aiThinking && moveHistory.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aiThinking, handleUndo, moveHistory.length]);

  // Persist in-progress game state so switching games or refreshing never loses board state
  useEffect(() => {
    if (!gameMode) return;
    if (gameStatus === 'checkmate' || gameStatus === 'stalemate') {
      localStorage.removeItem(CHESS_STORAGE_KEY);
      return;
    }
    try {
      localStorage.setItem(
        CHESS_STORAGE_KEY,
        JSON.stringify({
          gameMode,
          board,
          currentPlayer,
          moveHistory,
          capturedPieces,
          lastMove,
          savedAt: Date.now(),
        })
      );
    } catch (error) {
      void error;
    }
  }, [gameMode, board, currentPlayer, moveHistory, capturedPieces, lastMove, gameStatus]);

  const handleNewGame = () => {
    playClickSound();
    localStorage.removeItem(CHESS_STORAGE_KEY);
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
    playClickSound();
    localStorage.removeItem(CHESS_STORAGE_KEY);
    setGameMode(mode);
    setBoard(initBoard());
    setCurrentPlayer('white');
    setSelectedSquare(null);
    setValidMoves([]);
    setMoveHistory([]);
    setCapturedPieces({ white: [], black: [] });
    setPromotionPending(null);
    setLastMove(null);
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

          {savedState && (
            <div className="resume-container">
              <button
                type="button"
                className="btn-resume"
                onClick={() => {
                  playClickSound();
                  setGameMode(savedState.gameMode);
                  setBoard(savedState.board);
                  setCurrentPlayer(savedState.currentPlayer);
                  setMoveHistory(savedState.moveHistory || []);
                  setCapturedPieces(savedState.capturedPieces || { white: [], black: [] });
                  setLastMove(savedState.lastMove || null);
                }}
              >
                <div className="resume-icon">▶️</div>
                <div className="resume-text">
                  <strong>Resume In-Progress Game</strong>
                  <span>{savedState.gameMode === '1p' ? 'vs Computer' : '2 Players'} • Turn: {savedState.currentPlayer?.toUpperCase()} • {savedState.moveHistory?.length || 0} moves</span>
                </div>
              </button>
            </div>
          )}

          <div className="mode-buttons">
            <button 
              type="button"
              className="btn-mode"
              onClick={() => handleStartGame('1p')}
            >
              <span className="mode-icon">🤖</span>
              <span>vs Computer</span>
            </button>
            <button 
              type="button"
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
    <div className={`chess-container animate-fade-in theme-${boardTheme}`}>
      <header className="chess-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h1 className="chess-title">Chess</h1>
        <div className="header-actions">
          <button
            type="button"
            className="btn-outline btn-sound-game"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute audio' : 'Unmute audio'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button className="btn-menu" onClick={handleNewGame}>Reset</button>
          <button className="btn-outline" onClick={() => setGameMode(null)}>Mode</button>
        </div>
      </header>

      <div className="chess-main-layout">
        {/* Left / Center: Grandmaster Board with Player Bars */}
        <div className="chess-board-column">
          {/* Top Player Strip (Black / Opponent) */}
          <div className={`player-strip opponent-strip ${currentPlayer === 'black' ? 'active-turn' : ''}`}>
            <div className="player-strip-left">
              <span className="player-avatar-badge">{gameMode === '1p' ? '🤖' : '👤'}</span>
              <div className="player-meta-box">
                <div className="player-title-row">
                  <span className="player-display-name">
                    {gameMode === '1p' ? 'Computer Bot' : 'Black Player'}
                  </span>
                  {gameMode === '1p' && <span className="bot-difficulty-pill">AI</span>}
                </div>
                <div className="captured-strip" aria-label="Pieces captured by opponent">
                  {capturedPieces.white.map((p, idx) => (
                    <span key={idx} className="mini-piece-box" title={`Captured White ${p}`}>
                      <ChessPieceSvg piece={p} />
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="player-strip-right">
              {materialAdvantage.leader === 'Black' && (
                <span className="material-pill">{materialAdvantage.score}</span>
              )}
              {currentPlayer === 'black' && (
                <span className="turn-indicator-pill bot-turn">
                  {aiThinking ? (
                    <>
                      <span className="thinking-dot" />
                      <span>Thinking...</span>
                    </>
                  ) : (
                    'Turn'
                  )}
                </span>
              )}
            </div>
          </div>

          {/* The Big Grandmaster Board Stage */}
          <div className="board-stage">
            <div className="board-frame-with-coords">
              {/* Top files: a-h */}
              <div className="board-coords-files top">
                {FILES.map((f) => (
                  <span key={f}>{f}</span>
                ))}
              </div>

              <div className="board-center-row">
                {/* Left ranks: 8-1 */}
                <div className="board-coords-ranks left">
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
                      const isCheckedKing =
                        checkedKingSquare &&
                        checkedKingSquare.row === rowIdx &&
                        checkedKingSquare.col === colIdx;

                      const pieceColor = piece ? getPieceColor(piece) : null;
                      const isCaptureTarget = isValidMove && piece;

                      return (
                        <button
                          type="button"
                          key={`${rowIdx}-${colIdx}`}
                          className={`chess-square ${isLight ? 'light' : 'dark'} ${
                            isSelected ? 'selected' : ''
                          } ${isValidMove ? 'valid-move' : ''} ${
                            isLastMoveSquare ? 'last-move' : ''
                          } ${isCheckedKing ? 'in-check' : ''}`}
                          onClick={() => handleSquareClick(rowIdx, colIdx)}
                          aria-label={`${FILES[colIdx]}${RANKS[rowIdx]}${piece ? `, ${pieceColor} ${piece}` : ', empty'}${isSelected ? ', selected' : ''}${isValidMove ? ', valid move' : ''}${isCheckedKing ? ', in check' : ''}`}
                        >
                          {piece && (
                            <span className={`chess-piece piece-${pieceColor}`}>
                              <ChessPieceSvg piece={piece} />
                            </span>
                          )}
                          {isValidMove && !isCaptureTarget && <span className="chess-move-dot" />}
                          {isCaptureTarget && <span className="chess-capture-ring" />}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Right ranks: 8-1 */}
                <div className="board-coords-ranks right">
                  {RANKS.map((r) => (
                    <span key={r}>{r}</span>
                  ))}
                </div>
              </div>

              {/* Bottom files: a-h */}
              <div className="board-coords-files bottom">
                {FILES.map((f) => (
                  <span key={f}>{f}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Player Strip (White / You) */}
          <div className={`player-strip user-strip ${currentPlayer === 'white' ? 'active-turn' : ''}`}>
            <div className="player-strip-left">
              <span className="player-avatar-badge">👤</span>
              <div className="player-meta-box">
                <div className="player-title-row">
                  <span className="player-display-name">You (White)</span>
                </div>
                <div className="captured-strip" aria-label="Pieces captured by you">
                  {capturedPieces.black.map((p, idx) => (
                    <span key={idx} className="mini-piece-box" title={`Captured Black ${p}`}>
                      <ChessPieceSvg piece={p} />
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="player-strip-right">
              {materialAdvantage.leader === 'White' && (
                <span className="material-pill">{materialAdvantage.score}</span>
              )}
              {currentPlayer === 'white' && (
                <span className="turn-indicator-pill user-turn">Your Turn</span>
              )}
            </div>
          </div>
        </div>

        {/* Right / Bottom: Grandmaster Console Column */}
        <div className="chess-console-column">
          {/* Status Alert Banner */}
          {gameStatus === 'check' && (
            <div className="status-banner check" role="status">
              ⚠️ Check! The King is under attack!
            </div>
          )}
          {gameStatus === 'checkmate' && (
            <div className="status-banner checkmate" role="status">
              ♚ Checkmate! {winner?.toUpperCase()} Wins!
            </div>
          )}
          {gameStatus === 'stalemate' && (
            <div className="status-banner stalemate" role="status">
              🤝 Stalemate (Draw)
            </div>
          )}

          {/* Algebraic Move History Table */}
          <div className="console-card move-history-card">
            <div className="console-card-header">
              <span className="card-title">📜 Move History</span>
              <span className="badge-subtle">{moveHistory.length} moves</span>
            </div>
            <div className="move-history-table">
              {formattedMoves.length === 0 ? (
                <div className="empty-history">Game started. Make your first move!</div>
              ) : (
                formattedMoves.map((m) => (
                  <div key={m.turnNum} className="move-row">
                    <span className="move-cell-num">{m.turnNum}.</span>
                    <span className="move-cell-move white-cell">{m.white}</span>
                    <span className="move-cell-move black-cell">{m.black || '...'}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Theme Switcher Card */}
          <div className="console-card theme-card">
            <label className="card-title">🎨 Board Theme</label>
            <div className="theme-toggle-group">
              <button
                type="button"
                className={`theme-toggle-btn ${boardTheme === 'emerald' ? 'active' : ''}`}
                onClick={() => handleThemeChange('emerald')}
              >
                <span className="swatch emerald-preview" />
                <span>Emerald</span>
              </button>
              <button
                type="button"
                className={`theme-toggle-btn ${boardTheme === 'wood' ? 'active' : ''}`}
                onClick={() => handleThemeChange('wood')}
              >
                <span className="swatch wood-preview" />
                <span>Wood</span>
              </button>
              <button
                type="button"
                className={`theme-toggle-btn ${boardTheme === 'midnight' ? 'active' : ''}`}
                onClick={() => handleThemeChange('midnight')}
              >
                <span className="swatch midnight-preview" />
                <span>Midnight</span>
              </button>
            </div>
          </div>

          {/* Controls: Undo & New Game */}
          <div className="console-actions">
            <button
              type="button"
              className="btn-action-undo"
              onClick={handleUndo}
              disabled={moveHistory.length === 0 || aiThinking}
            >
              ↶ Undo Move
            </button>
            <button
              type="button"
              className="btn-action-new"
              onClick={handleNewGame}
            >
              New Game
            </button>
          </div>
        </div>
      </div>

      {/* Checkmate Modal */}
      {gameStatus === 'checkmate' && (
        <div className="modal-overlay animate-fade-in" role="dialog" aria-modal="true">
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

      {/* Stalemate Modal */}
      {gameStatus === 'stalemate' && (
        <div className="modal-overlay animate-fade-in" role="dialog" aria-modal="true">
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

      {/* Pawn Promotion Modal */}
      {promotionPending && (
        <div className="modal-overlay animate-fade-in" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Pawn Promotion</h2>
            <p>Choose a piece to promote to:</p>
            <div className="promotion-choices">
              {['Q', 'R', 'B', 'N'].map((piece) => (
                <button
                  key={piece}
                  className="promotion-btn"
                  onClick={() => handlePromotion(piece)}
                  aria-label={`Promote pawn to ${piece === 'Q' ? 'Queen' : piece === 'R' ? 'Rook' : piece === 'B' ? 'Bishop' : 'Knight'}`}
                >
                  <span className="piece-preview-box">
                    <ChessPieceSvg piece={currentPlayer === 'white' ? piece : piece.toLowerCase()} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chess;
