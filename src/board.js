const { key, neighbors, directionIndex, directions, add } = require('./coords');

const cloneBoard = (board) => {
  const next = new Map();
  for (const [k, stack] of board.entries()) {
    next.set(k, [...stack]);
  }
  return next;
};

const getStack = (board, coord) => board.get(key(coord)) || [];

const isOccupied = (board, coord) => getStack(board, coord).length > 0;

const topPiece = (board, coord) => {
  const stack = getStack(board, coord);
  if (!stack.length) return null;
  return stack[stack.length - 1];
};

const placePiece = (board, coord, piece) => {
  const k = key(coord);
  const existing = board.get(k) || [];
  board.set(k, [...existing, piece]);
};

const removeTopPiece = (board, coord) => {
  const k = key(coord);
  const existing = board.get(k) || [];
  const next = [...existing];
  const removed = next.pop();
  if (next.length === 0) {
    board.delete(k);
  } else {
    board.set(k, next);
  }
  return removed;
};

const moveTopPiece = (board, from, to) => {
  const piece = removeTopPiece(board, from);
  if (!piece) return null;
  placePiece(board, to, piece);
  return piece;
};

const occupiedCoords = (board) =>
  Array.from(board.entries())
    .filter(([, stack]) => stack.length)
    .map(([k]) => k);

const adjacencyGraphFromBoard = (board) => {
  const occ = new Set(occupiedCoords(board));
  const graph = new Map();
  for (const k of occ) {
    const coord = k.split(',').map(Number);
    const nodeCoord = { x: coord[0], y: coord[1], z: coord[2] };
    const adj = neighbors(nodeCoord)
      .map((n) => key(n))
      .filter((nk) => occ.has(nk));
    graph.set(k, adj);
  }
  return graph;
};

const isHiveConnected = (board) => {
  const occKeys = occupiedCoords(board);
  if (occKeys.length <= 1) return true;
  const visited = new Set();
  const queue = [occKeys[0]];
  visited.add(occKeys[0]);
  while (queue.length) {
    const current = queue.shift();
    const [x, y, z] = current.split(',').map(Number);
    for (const n of neighbors({ x, y, z })) {
      const nk = key(n);
      if (visited.has(nk)) continue;
      if (board.has(nk)) {
        visited.add(nk);
        queue.push(nk);
      }
    }
  }
  return visited.size === occKeys.length;
};

const wouldBreakHive = (board, coord) => {
  const k = key(coord);
  const stack = board.get(k);
  if (!stack || stack.length === 0) return false;
  const temp = cloneBoard(board);
  removeTopPiece(temp, coord);
  return !isHiveConnected(temp);
};

const canSlideBetween = (board, from, to) => {
  const dirIdx = directionIndex(from, to);
  if (dirIdx === -1) return false;
  const leftIdx = (dirIdx + 5) % 6;
  const rightIdx = (dirIdx + 1) % 6;
  const leftNeighbor = add(from, directions[leftIdx]);
  const rightNeighbor = add(from, directions[rightIdx]);
  const leftOccupied = isOccupied(board, leftNeighbor);
  const rightOccupied = isOccupied(board, rightNeighbor);
  return !(leftOccupied && rightOccupied);
};

module.exports = {
  cloneBoard,
  getStack,
  isOccupied,
  topPiece,
  placePiece,
  removeTopPiece,
  moveTopPiece,
  occupiedCoords,
  adjacencyGraphFromBoard,
  isHiveConnected,
  wouldBreakHive,
  canSlideBetween,
};
