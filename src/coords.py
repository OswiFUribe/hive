from dataclasses import dataclass
from typing import List, Tuple


@dataclass(frozen=True)
class Coord:
    x: int
    y: int
    z: int

    def key(self) -> str:
        return f"{self.x},{self.y},{self.z}"


DIRECTIONS: List[Coord] = [
    Coord(1, -1, 0),
    Coord(1, 0, -1),
    Coord(0, 1, -1),
    Coord(-1, 1, 0),
    Coord(-1, 0, 1),
    Coord(0, -1, 1),
]


def parse_key(k: str) -> Coord:
    x, y, z = map(int, k.split(","))
    return Coord(x, y, z)


def add(a: Coord, b: Coord) -> Coord:
    return Coord(a.x + b.x, a.y + b.y, a.z + b.z)


def neighbors(coord: Coord) -> List[Coord]:
    return [add(coord, d) for d in DIRECTIONS]


def key(coord: Coord) -> str:
    return coord.key()


def direction_index(from_coord: Coord, to_coord: Coord) -> int:
    diff = Coord(to_coord.x - from_coord.x, to_coord.y - from_coord.y, to_coord.z - from_coord.z)
    try:
        return DIRECTIONS.index(diff)
    except ValueError:
        return -1


def distance(a: Coord, b: Coord) -> int:
    return (abs(a.x - b.x) + abs(a.y - b.y) + abs(a.z - b.z)) // 2
