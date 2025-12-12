from __future__ import annotations

from copy import deepcopy
from typing import Dict, List, Optional

from .coords import Coord, DIRECTIONS, add, neighbors, direction_index

Piece = Dict[str, str]
Board = Dict[str, List[Piece]]


def clone_board(board: Board) -> Board:
    return deepcopy(board)


def get_stack(board: Board, coord: Coord) -> List[Piece]:
    return board.get(coord.key(), [])


def is_occupied(board: Board, coord: Coord) -> bool:
    return len(get_stack(board, coord)) > 0


def top_piece(board: Board, coord: Coord) -> Optional[Piece]:
    stack = get_stack(board, coord)
    return stack[-1] if stack else None


def place_piece(board: Board, coord: Coord, piece: Piece) -> None:
    board.setdefault(coord.key(), []).append(piece)


def remove_top_piece(board: Board, coord: Coord) -> Optional[Piece]:
    stack = board.get(coord.key())
    if not stack:
        return None
    piece = stack.pop()
    if not stack:
        board.pop(coord.key(), None)
    return piece


def move_top_piece(board: Board, from_coord: Coord, to_coord: Coord) -> Optional[Piece]:
    piece = remove_top_piece(board, from_coord)
    if piece is None:
        return None
    place_piece(board, to_coord, piece)
    return piece


def occupied_coords(board: Board) -> List[str]:
    return [k for k, stack in board.items() if stack]


def is_hive_connected(board: Board) -> bool:
    occ_keys = occupied_coords(board)
    if len(occ_keys) <= 1:
        return True
    visited = set()
    queue = [occ_keys[0]]
    visited.add(occ_keys[0])
    while queue:
        current_key = queue.pop(0)
        cx, cy, cz = map(int, current_key.split(","))
        for n in neighbors(Coord(cx, cy, cz)):
            nk = n.key()
            if nk in visited:
                continue
            if nk in board:
                visited.add(nk)
                queue.append(nk)
    return len(visited) == len(occ_keys)


def would_break_hive(board: Board, coord: Coord) -> bool:
    if coord.key() not in board:
        return False
    temp = clone_board(board)
    remove_top_piece(temp, coord)
    return not is_hive_connected(temp)


def can_slide_between(board: Board, from_coord: Coord, to_coord: Coord) -> bool:
    dir_idx = direction_index(from_coord, to_coord)
    if dir_idx == -1:
        return False
    left_idx = (dir_idx + 5) % 6
    right_idx = (dir_idx + 1) % 6
    left_neighbor = add(from_coord, DIRECTIONS[left_idx])
    right_neighbor = add(from_coord, DIRECTIONS[right_idx])
    left_occupied = is_occupied(board, left_neighbor)
    right_occupied = is_occupied(board, right_neighbor)
    return not (left_occupied and right_occupied)
