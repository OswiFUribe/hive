const test = require('node:test');
const assert = require('node:assert');

const { createGame } = require('../src/gameState');
const { applyAction, getLegalMoves } = require('../src/rulesEngine');
const { key } = require('../src/coords');
const { topPiece } = require('../src/board');

const coord = (x, y, z) => ({ x, y, z });

test('queen cannot move if movement breaks hive connectivity', () => {
  let state = createGame();
  state = applyAction(state, 'white', { type: 'place', pieceType: 'queen', to: coord(0, 0, 0) });
  state = applyAction(state, 'black', { type: 'place', pieceType: 'queen', to: coord(1, -1, 0) });
  state = applyAction(state, 'white', { type: 'place', pieceType: 'beetle', to: coord(-1, 1, 0) });
  state = applyAction(state, 'black', { type: 'place', pieceType: 'beetle', to: coord(2, -2, 0) });
  const moves = getLegalMoves(state, 'white');
  const queenMoves = moves.filter((m) => m.type === 'move' && m.pieceId === 'white-queen-1');
  assert.strictEqual(queenMoves.length, 0);
});

test('beetle can climb on top of another piece', () => {
  let state = createGame();
  state = applyAction(state, 'white', { type: 'place', pieceType: 'queen', to: coord(0, 0, 0) });
  state = applyAction(state, 'black', { type: 'place', pieceType: 'queen', to: coord(-1, 1, 0) });
  state = applyAction(state, 'white', { type: 'place', pieceType: 'beetle', to: coord(0, 1, -1) });
  state.currentPlayer = 'white';
  const moves = getLegalMoves(state, 'white');
  const beetleId = topPiece(state.board, coord(0, 1, -1)).id;
  const beetleClimb = moves.find(
    (m) => m.type === 'move' && m.pieceId === beetleId && key(m.to) === key(coord(-1, 1, 0)),
  );
  assert.ok(beetleClimb, 'beetle should be able to climb onto occupied neighbor');
});

test('grasshopper jumps over a line of pieces', () => {
  let state = createGame();
  state = applyAction(state, 'white', { type: 'place', pieceType: 'grasshopper', to: coord(0, 0, 0) });
  state = applyAction(state, 'black', { type: 'place', pieceType: 'queen', to: coord(1, -1, 0) });
  state = applyAction(state, 'white', { type: 'place', pieceType: 'ant', to: coord(2, -2, 0) });
  state = applyAction(state, 'black', { type: 'place', pieceType: 'ant', to: coord(1, 0, -1) });
  state = applyAction(state, 'white', { type: 'place', pieceType: 'queen', to: coord(0, 1, -1) });
  state.currentPlayer = 'white';
  const moves = getLegalMoves(state, 'white');
  const hopperId = topPiece(state.board, coord(0, 0, 0)).id;
  const jumpTarget = key(coord(3, -3, 0));
  const hopperMoves = moves.filter(
    (m) => m.type === 'move' && m.pieceId === hopperId && key(m.to) === jumpTarget,
  );
  assert.ok(hopperMoves.length === 1, 'grasshopper should land on first empty after chain');
});

test('spider must move exactly three sliding steps', () => {
  let state = createGame();
  state = applyAction(state, 'white', { type: 'place', pieceType: 'spider', to: coord(0, 0, 0) });
  state = applyAction(state, 'black', { type: 'place', pieceType: 'queen', to: coord(1, -1, 0) });
  state = applyAction(state, 'white', { type: 'place', pieceType: 'queen', to: coord(-1, 1, 0) });
  state = applyAction(state, 'black', { type: 'place', pieceType: 'beetle', to: coord(1, 0, -1) });
  state = applyAction(state, 'white', { type: 'place', pieceType: 'ant', to: coord(0, 1, -1) });
  state.currentPlayer = 'white';
  const moves = getLegalMoves(state, 'white');
  const spiderId = topPiece(state.board, coord(0, 0, 0)).id;
  const spiderTargets = moves.filter((m) => m.type === 'move' && m.pieceId === spiderId);
  assert.ok(spiderTargets.every((m) => key(m.to) !== key(coord(0, 0, 0))), 'spider cannot stay in place');
  assert.ok(spiderTargets.length > 0, 'spider should have at least one 3-step crawl');
});

test('ant can traverse around the hive with sliding rule', () => {
  let state = createGame();
  state = applyAction(state, 'white', { type: 'place', pieceType: 'ant', to: coord(0, 0, 0) });
  state = applyAction(state, 'black', { type: 'place', pieceType: 'queen', to: coord(1, -1, 0) });
  state = applyAction(state, 'white', { type: 'place', pieceType: 'queen', to: coord(-1, 1, 0) });
  state = applyAction(state, 'black', { type: 'place', pieceType: 'beetle', to: coord(1, 0, -1) });
  state = applyAction(state, 'white', { type: 'place', pieceType: 'beetle', to: coord(0, 1, -1) });
  state.currentPlayer = 'white';
  const moves = getLegalMoves(state, 'white');
  const antId = topPiece(state.board, coord(0, 0, 0)).id;
  const antMoves = moves.filter((m) => m.type === 'move' && m.pieceId === antId);
  assert.ok(antMoves.length > 0, 'ant should find sliding paths around hive');
});

test('placements cannot be adjacent to opponent pieces after first turn', () => {
  let state = createGame();
  state = applyAction(state, 'white', { type: 'place', pieceType: 'queen', to: coord(0, 0, 0) });
  state = applyAction(state, 'black', { type: 'place', pieceType: 'queen', to: coord(1, -1, 0) });
  const moves = getLegalMoves(state, 'white').filter((m) => m.type === 'place');
  const forbidden = moves.find((m) => key(m.to) === key(coord(1, 0, -1)));
  assert.ok(!forbidden, 'cannot place adjacent to opponent piece');
});

test('queen must be placed on or before fourth turn', () => {
  let state = createGame();
  // white turn 1: place ant
  state = applyAction(state, 'white', { type: 'place', pieceType: 'ant', to: coord(0, 0, 0) });
  // black 1
  state = applyAction(state, 'black', { type: 'place', pieceType: 'ant', to: coord(1, -1, 0) });
  // white 2
  state = applyAction(state, 'white', { type: 'place', pieceType: 'ant', to: coord(0, 1, -1) });
  // black 2
  state = applyAction(state, 'black', { type: 'place', pieceType: 'ant', to: coord(2, -2, 0) });
  // white 3
  state = applyAction(state, 'white', { type: 'place', pieceType: 'ant', to: coord(-1, 1, 0) });
  state.currentPlayer = 'white';
  const moves = getLegalMoves(state, 'white');
  const hasNonQueenPlacement = moves.some((m) => m.type === 'place' && m.pieceType !== 'queen');
  const queenPlacements = moves.filter((m) => m.type === 'place' && m.pieceType === 'queen');
  assert.ok(!hasNonQueenPlacement, 'only queen placements allowed on fourth turn if not placed');
  assert.ok(queenPlacements.length > 0, 'queen placement should be offered');
});
