const { cloneBoard, wouldBreakHive, canSlideBetween, removeTopPiece, isHiveConnected } = require('./board');
const { neighbors, key, directionIndex, directions, add } = require('./coords');
const { pieceDefinitions } = require('./pieces');
const { applyPlacement, applyMovement, nextPieceId } = require('./gameState');

const getPlayerPieces = (state, player) => {
  const pieces = [];
  for (const [coordKey, stack] of state.board.entries()) {
    if (!stack.length) continue;
    const top = stack[stack.length - 1];
    if (top.player !== player) continue;
    pieces.push({ coord: parseCoordKey(coordKey), stackHeight: stack.length, piece: top });
  }
  return pieces;
};

const parseCoordKey = (k) => {
  const [x, y, z] = k.split(',').map(Number);
  return { x, y, z };
};

const hivePiecesCount = (state) => {
  let count = 0;
  for (const stack of state.board.values()) {
    count += stack.length;
  }
  return count;
};

const hasQueenOnBoard = (state, player) =>
  Array.from(state.board.values()).some((stack) => stack.some((p) => p.player === player && p.type === 'queen'));

const queenRequirementActive = (state, player) => {
  const turnNumber = state.turnCounts[player] + 1; // turnCounts is completed turns
  return turnNumber >= 4 && !hasQueenOnBoard(state, player);
};

const emptyCellsAdjacentToBoard = (state) => {
  const empty = new Set();
  for (const [k] of state.board.entries()) {
    const coord = parseCoordKey(k);
    for (const n of neighbors(coord)) {
      const nk = key(n);
      if (!state.board.has(nk)) empty.add(nk);
    }
  }
  return Array.from(empty).map(parseCoordKey);
};

const cellsAdjacentToPlayer = (state, player) => {
  const empty = new Set();
  for (const [k, stack] of state.board.entries()) {
    if (!stack.some((p) => p.player === player)) continue;
    const coord = parseCoordKey(k);
    for (const n of neighbors(coord)) {
      const nk = key(n);
      if (!state.board.has(nk)) empty.add(nk);
    }
  }
  return Array.from(empty).map(parseCoordKey);
};

const placementMoves = (state, player) => {
  const mustPlaceQueen = queenRequirementActive(state, player);
  const availablePieces = Object.entries(state.reserves[player]).filter(
    ([type, count]) => count > 0 && (!mustPlaceQueen || type === 'queen'),
  );
  if (!availablePieces.length) return [];
  const placements = [];
  const isFirstMove = state.turnCounts[player] === 0 && hivePiecesCount(state) === 0;
  if (isFirstMove) {
    for (const [pieceType] of availablePieces) {
      placements.push({ type: 'place', pieceType, to: { x: 0, y: 0, z: 0 } });
    }
    return placements;
  }

  const potentialCells =
    state.turnCounts[player] === 0
      ? emptyCellsAdjacentToBoard(state)
      : cellsAdjacentToPlayer(state, player);

  for (const [pieceType] of availablePieces) {
    for (const cell of potentialCells) {
      const nk = key(cell);
      if (state.board.has(nk)) continue;
      if (state.turnCounts[player] > 0) {
        const neighborPieces = neighbors(cell)
          .map((c) => state.board.get(key(c)))
          .filter(Boolean)
          .flat();
        if (!neighborPieces.some((p) => p.player === player)) continue;
        if (neighborPieces.some((p) => p.player !== player)) continue;
      }
      placements.push({ type: 'place', pieceType, to: cell });
    }
  }
  return placements;
};

const touchesHive = (board, cell) => neighbors(cell).some((n) => board.has(key(n)));

const slidingNeighbors = (board, from) =>
  neighbors(from).filter(
    (n) => !board.has(key(n)) && canSlideBetween(board, from, n) && touchesHive(board, n),
  );

const spiderMoves = (state, from) => {
  const boardWithoutPiece = cloneBoard(state.board);
  removeTopPiece(boardWithoutPiece, from);
  const results = new Set();
  const dfs = (current, depth, visited) => {
    if (depth === 3) {
      results.add(key(current));
      return;
    }
    for (const n of slidingNeighbors(boardWithoutPiece, current)) {
      const nk = key(n);
      if (visited.has(nk)) continue;
      visited.add(nk);
      dfs(n, depth + 1, visited);
      visited.delete(nk);
    }
  };
  dfs(from, 0, new Set([key(from)]));
  return Array.from(results).map(parseCoordKey);
};

const antMoves = (state, from) => {
  const boardWithout = cloneBoard(state.board);
  removeTopPiece(boardWithout, from);
  const visited = new Set();
  const queue = [from];
  visited.add(key(from));
  const targets = new Set();
  while (queue.length) {
    const current = queue.shift();
    for (const n of slidingNeighbors(boardWithout, current)) {
      const nk = key(n);
      if (visited.has(nk)) continue;
      visited.add(nk);
      targets.add(nk);
      queue.push(n);
    }
  }
  targets.delete(key(from));
  return Array.from(targets).map(parseCoordKey);
};

const queenOrBeetleStepTargets = (state, from, allowsClimb) => {
  const targets = [];
  for (const n of neighbors(from)) {
    const nk = key(n);
    const occupied = state.board.has(nk);
    if (!occupied) {
      if (canSlideBetween(state.board, from, n)) targets.push(n);
    } else if (allowsClimb) {
      targets.push(n);
    }
  }
  return targets;
};

const grasshopperMoves = (state, from) => {
  const moves = [];
  for (const dir of directions) {
    let current = add(from, dir);
    let jumped = 0;
    while (true) {
      const k = key(current);
      if (!state.board.has(k)) {
        if (jumped > 0) moves.push(current);
        break;
      }
      jumped += 1;
      current = add(current, dir);
    }
  }
  return moves;
};

const generateMovesForPiece = (state, pieceEntry) => {
  const { coord, stackHeight, piece } = pieceEntry;
  const def = pieceDefinitions[piece.type];
  if (!def) return [];
  if (stackHeight > 1 && piece.type !== 'beetle') return [];
  if (wouldBreakHive(state.board, coord)) return [];
  const movement = def.movement;
  let targets = [];
  switch (movement.type) {
    case 'step': {
      targets = queenOrBeetleStepTargets(state, coord, movement.allowsClimb);
      break;
    }
    case 'exact_crawl': {
      targets = spiderMoves(state, coord);
      break;
    }
    case 'crawl_any_distance': {
      targets = antMoves(state, coord);
      break;
    }
    case 'jump_line': {
      targets = grasshopperMoves(state, coord);
      break;
    }
    default:
      break;
  }
  const filtered = targets
    .filter((t) => key(t) !== key(coord))
    .filter((t) => !wouldBreakHiveAfterMove(state, coord, t));
  return filtered.map((t) => ({
    type: 'move',
    pieceId: piece.id,
    from: coord,
    to: t,
  }));
};

const wouldBreakHiveAfterMove = (state, from, to) => {
  const boardCopy = cloneBoard(state.board);
  const moving = removeTopPiece(boardCopy, from);
  if (!moving) return true;
  const kTo = key(to);
  const stack = boardCopy.get(kTo) || [];
  boardCopy.set(kTo, [...stack, moving]);
  return !isHiveConnected(boardCopy);
};

const getLegalMoves = (state, player) => {
  if (state.currentPlayer !== player) return [];
  const mustPlaceQueen = queenRequirementActive(state, player);
  const moves = [];
  const placements = placementMoves(state, player);
  moves.push(...placements);
  if (mustPlaceQueen) {
    return dedupeMoves(moves);
  }
  const pieces = getPlayerPieces(state, player);
  for (const p of pieces) {
    moves.push(...generateMovesForPiece(state, p));
  }
  return dedupeMoves(moves);
};

const dedupeMoves = (moves) => {
  const seen = new Set();
  const uniq = [];
  for (const m of moves) {
    const sig = JSON.stringify(m);
    if (seen.has(sig)) continue;
    seen.add(sig);
    uniq.push(m);
  }
  return uniq;
};

const applyAction = (state, player, action) => {
  if (action.type === 'place') {
    const pieceId = nextPieceId(state, player, action.pieceType);
    return applyPlacement(state, player, action.pieceType, action.to, pieceId);
  }
  if (action.type === 'move') {
    return applyMovement(state, player, action.pieceId, action.from, action.to);
  }
  return state;
};

module.exports = {
  getLegalMoves,
  applyAction,
  queenRequirementActive,
  hivePiecesCount,
};
