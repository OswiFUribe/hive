from __future__ import annotations

from typing import Dict, List, Set

from .board import (
    Board,
    can_slide_between,
    clone_board,
    is_hive_connected,
    remove_top_piece,
    top_piece,
    would_break_hive,
)
from .coords import Coord, DIRECTIONS, add, neighbors, parse_key
from .game_state import GameState, apply_movement, apply_placement, next_piece_id
from .pieces import piece_definitions


def _hive_piece_count(state: GameState) -> int:
    return sum(len(stack) for stack in state.board.values())


def _has_queen_on_board(state: GameState, player: str) -> bool:
    return any(piece["player"] == player and piece["type"] == "queen" for stack in state.board.values() for piece in stack)


def queen_requirement_active(state: GameState, player: str) -> bool:
    turn_number = state.turn_counts[player] + 1
    return turn_number >= 4 and not _has_queen_on_board(state, player)


def _empty_cells_adjacent(state: GameState) -> List[Coord]:
    empty = set()
    for k in state.board:
        coord = parse_key(k)
        for n in neighbors(coord):
            if n.key() not in state.board:
                empty.add(n.key())
    return [parse_key(k) for k in empty]


def _cells_adjacent_to_player(state: GameState, player: str) -> List[Coord]:
    empty = set()
    for k, stack in state.board.items():
        if not any(p["player"] == player for p in stack):
            continue
        coord = parse_key(k)
        for n in neighbors(coord):
            if n.key() not in state.board:
                empty.add(n.key())
    return [parse_key(k) for k in empty]


def placement_moves(state: GameState, player: str) -> List[dict]:
    must_place_queen = queen_requirement_active(state, player)
    available = [(t, c) for t, c in state.reserves[player].items() if c > 0 and (not must_place_queen or t == "queen")]
    if not available:
        return []
    placements: List[dict] = []
    is_first_move = state.turn_counts[player] == 0 and _hive_piece_count(state) == 0
    if is_first_move:
        for piece_type, _ in available:
            placements.append({"type": "place", "pieceType": piece_type, "to": Coord(0, 0, 0)})
        return placements

    potential_cells = _cells_adjacent_to_player(state, player) if state.turn_counts[player] > 0 else _empty_cells_adjacent(state)
    for piece_type, _ in available:
        for cell in potential_cells:
            if cell.key() in state.board:
                continue
            neighbor_pieces = [
                piece for n in neighbors(cell) for piece in state.board.get(n.key(), [])
            ]
            if state.turn_counts[player] > 0:
                if not any(p["player"] == player for p in neighbor_pieces):
                    continue
                if any(p["player"] != player for p in neighbor_pieces):
                    continue
            placements.append({"type": "place", "pieceType": piece_type, "to": cell})
    return placements


def _touches_hive(board: Board, cell: Coord) -> bool:
    return any(n.key() in board for n in neighbors(cell))


def _sliding_neighbors(board: Board, from_coord: Coord) -> List[Coord]:
    return [
        n
        for n in neighbors(from_coord)
        if n.key() not in board and can_slide_between(board, from_coord, n) and _touches_hive(board, n)
    ]


def _spider_moves(state: GameState, from_coord: Coord) -> List[Coord]:
    board_without = clone_board(state.board)
    remove_top_piece(board_without, from_coord)
    results = set()

    def dfs(current: Coord, depth: int, visited: Set[str]) -> None:
        if depth == 3:
            results.add(current.key())
            return
        for n in _sliding_neighbors(board_without, current):
            nk = n.key()
            if nk in visited:
                continue
            visited.add(nk)
            dfs(n, depth + 1, visited)
            visited.remove(nk)

    dfs(from_coord, 0, {from_coord.key()})
    return [parse_key(k) for k in results]


def _ant_moves(state: GameState, from_coord: Coord) -> List[Coord]:
    board_without = clone_board(state.board)
    remove_top_piece(board_without, from_coord)
    visited = {from_coord.key()}
    queue = [from_coord]
    targets = set()
    while queue:
        current = queue.pop(0)
        for n in _sliding_neighbors(board_without, current):
            nk = n.key()
            if nk in visited:
                continue
            visited.add(nk)
            targets.add(nk)
            queue.append(n)
    targets.discard(from_coord.key())
    return [parse_key(k) for k in targets]


def _step_targets(state: GameState, from_coord: Coord, allows_climb: bool) -> List[Coord]:
    targets: List[Coord] = []
    for n in neighbors(from_coord):
        occupied = n.key() in state.board
        if not occupied:
            if can_slide_between(state.board, from_coord, n):
                targets.append(n)
        elif allows_climb:
            targets.append(n)
    return targets


def _grasshopper_moves(state: GameState, from_coord: Coord) -> List[Coord]:
    moves: List[Coord] = []
    for direction in DIRECTIONS:
        current = add(from_coord, direction)
        jumped = 0
        while True:
            if current.key() not in state.board:
                if jumped > 0:
                    moves.append(current)
                break
            jumped += 1
            current = add(current, direction)
    return moves


def _generate_moves_for_piece(state: GameState, coord: Coord, stack_height: int, piece: dict) -> List[dict]:
    definition = piece_definitions.get(piece["type"])
    if not definition:
        return []
    if stack_height > 1 and piece["type"] != "beetle":
        return []
    if would_break_hive(state.board, coord):
        return []

    movement = definition["movement"]
    targets: List[Coord] = []
    if movement["type"] == "step":
        targets = _step_targets(state, coord, movement.get("allowsClimb", False))
    elif movement["type"] == "exact_crawl":
        targets = _spider_moves(state, coord)
    elif movement["type"] == "crawl_any_distance":
        targets = _ant_moves(state, coord)
    elif movement["type"] == "jump_line":
        targets = _grasshopper_moves(state, coord)

    filtered = [
        t
        for t in targets
        if t.key() != coord.key() and not _would_break_hive_after_move(state, coord, t)
    ]
    return [{"type": "move", "pieceId": piece["id"], "from": coord, "to": t} for t in filtered]


def _would_break_hive_after_move(state: GameState, from_coord: Coord, to_coord: Coord) -> bool:
    board_copy = clone_board(state.board)
    moving = remove_top_piece(board_copy, from_coord)
    if not moving:
        return True
    board_copy.setdefault(to_coord.key(), []).append(moving)
    return not is_hive_connected(board_copy)


def _player_pieces(state: GameState, player: str) -> List[dict]:
    pieces = []
    for coord_key, stack in state.board.items():
        if not stack:
            continue
        top = stack[-1]
        if top["player"] != player:
            continue
        pieces.append({"coord": parse_key(coord_key), "stackHeight": len(stack), "piece": top})
    return pieces


def _move_signature(move: dict) -> tuple:
    from_key = move.get("from").key() if move.get("from") else None
    to_key = move.get("to").key() if move.get("to") else None
    return (move.get("type"), move.get("pieceId"), move.get("pieceType"), from_key, to_key)


def _dedupe_moves(moves: List[dict]) -> List[dict]:
    seen: Set[tuple] = set()
    unique = []
    for m in moves:
        sig = _move_signature(m)
        if sig in seen:
            continue
        seen.add(sig)
        unique.append(m)
    return unique


def get_legal_moves(state: GameState, player: str) -> List[dict]:
    if state.current_player != player:
        return []
    must_place_queen = queen_requirement_active(state, player)
    moves: List[dict] = placement_moves(state, player)
    if must_place_queen:
        return _dedupe_moves(moves)
    for entry in _player_pieces(state, player):
        moves.extend(_generate_moves_for_piece(state, entry["coord"], entry["stackHeight"], entry["piece"]))
    return _dedupe_moves(moves)


def apply_action(state: GameState, player: str, action: dict) -> GameState:
    if action["type"] == "place":
        piece_id = action.get("pieceId") or next_piece_id(state, player, action["pieceType"])
        return apply_placement(state, player, action["pieceType"], action["to"], piece_id)
    if action["type"] == "move":
        return apply_movement(state, player, action["pieceId"], action["from"], action["to"])
    return state
