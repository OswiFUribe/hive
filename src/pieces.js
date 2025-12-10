const pieceDefinitions = {
  queen: {
    id: 'queen',
    displayName: 'Queen Bee',
    movement: { type: 'step', maxSteps: 1, requiresSliding: true },
    attributes: { canStack: false, onTopCountsForSurround: true },
  },
  beetle: {
    id: 'beetle',
    displayName: 'Beetle',
    movement: { type: 'step', maxSteps: 1, allowsClimb: true },
    attributes: { canStack: true, onTopCountsForSurround: true },
  },
  spider: {
    id: 'spider',
    displayName: 'Spider',
    movement: { type: 'exact_crawl', steps: 3, requiresSliding: true },
    attributes: { canStack: false, onTopCountsForSurround: true },
  },
  grasshopper: {
    id: 'grasshopper',
    displayName: 'Grasshopper',
    movement: { type: 'jump_line' },
    attributes: { canStack: false, onTopCountsForSurround: true },
  },
  ant: {
    id: 'ant',
    displayName: 'Soldier Ant',
    movement: { type: 'crawl_any_distance', requiresSliding: true },
    attributes: { canStack: false, onTopCountsForSurround: true },
  },
};

const defaultReserve = {
  queen: 1,
  beetle: 2,
  spider: 2,
  grasshopper: 3,
  ant: 3,
};

module.exports = { pieceDefinitions, defaultReserve };
