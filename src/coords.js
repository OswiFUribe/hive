const directions = [
  { x: 1, y: -1, z: 0 },
  { x: 1, y: 0, z: -1 },
  { x: 0, y: 1, z: -1 },
  { x: -1, y: 1, z: 0 },
  { x: -1, y: 0, z: 1 },
  { x: 0, y: -1, z: 1 },
];

const key = ({ x, y, z }) => `${x},${y},${z}`;

const parseKey = (k) => {
  const [x, y, z] = k.split(',').map(Number);
  return { x, y, z };
};

const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });

const equals = (a, b) => a.x === b.x && a.y === b.y && a.z === b.z;

const neighbors = (coord) => directions.map((d) => add(coord, d));

const directionIndex = (from, to) => {
  const diff = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
  return directions.findIndex((d) => equals(d, diff));
};

const distance = (a, b) =>
  (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z)) / 2;

module.exports = {
  directions,
  key,
  parseKey,
  add,
  equals,
  neighbors,
  directionIndex,
  distance,
};
