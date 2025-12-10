const { cloneBoard, placePiece, moveTopPiece } = require('./board');
const { pieceDefinitions, defaultReserve } = require('./pieces');
const { key } = require('./coords');

const createEmptyReserve = () => ({ ...defaultReserve });

const createGame = () => ({
  board: new Map(),
  reserves: {
    white: createEmptyReserve(),
    black: createEmptyReserve(),
  },
  turn: 0,
  currentPlayer: 'white',
  turnCounts: { white: 0, black: 0 },
  piecePositions: new Map(),
  moveHistory: [],
  pieceCounters: { white: 0, black: 0 },
});

const nextPlayer = (player) => (player === 'white' ? 'black' : 'white');

const applyPlacement = (state, player, pieceType, coord, pieceId) => {
  const next = { ...state, board: cloneBoard(state.board) };
  const piece = {
    id: pieceId,
    player,
    type: pieceType,
  };
  placePiece(next.board, coord, piece);
  next.reserves = {
    ...state.reserves,
    [player]: { ...state.reserves[player], [pieceType]: state.reserves[player][pieceType] - 1 },
  };
  next.piecePositions = new Map(state.piecePositions);
  next.piecePositions.set(pieceId, { coord });
  next.moveHistory = [...state.moveHistory, { type: 'place', player, pieceType, coord }];
  next.turnCounts = { ...state.turnCounts, [player]: state.turnCounts[player] + 1 };
  next.turn += 1;
  next.currentPlayer = nextPlayer(player);
  next.pieceCounters = { ...state.pieceCounters, [player]: state.pieceCounters[player] + 1 };
  return next;
};

const applyMovement = (state, player, pieceId, from, to) => {
  const next = { ...state, board: cloneBoard(state.board) };
  moveTopPiece(next.board, from, to);
  next.piecePositions = new Map(state.piecePositions);
  next.piecePositions.set(pieceId, { coord: to });
  next.moveHistory = [...state.moveHistory, { type: 'move', player, pieceId, from, to }];
  next.turnCounts = { ...state.turnCounts, [player]: state.turnCounts[player] + 1 };
  next.turn += 1;
  next.currentPlayer = nextPlayer(player);
  next.reserves = state.reserves;
  next.pieceCounters = state.pieceCounters;
  return next;
};

const pieceIsPlaced = (state, pieceId) => state.piecePositions.has(pieceId);

const playerHasPlacedQueen = (state, player) => {
  for (const stack of state.board.values()) {
    if (stack.some((p) => p.player === player && p.type === 'queen')) return true;
  }
  return false;
};

const nextPieceId = (state, player, pieceType) => {
  const count = state.pieceCounters[player] + 1;
  return `${player}-${pieceType}-${count}`;
};

module.exports = {
  createGame,
  applyPlacement,
  applyMovement,
  nextPlayer,
  pieceIsPlaced,
  playerHasPlacedQueen,
  nextPieceId,
};
