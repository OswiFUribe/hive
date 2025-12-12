from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from .board import clone_board, move_top_piece, place_piece
from .coords import Coord
from .pieces import default_reserve


@dataclass
class GameState:
    board: Dict[str, List[dict]] = field(default_factory=dict)
    reserves: Dict[str, Dict[str, int]] = field(
        default_factory=lambda: {"white": dict(default_reserve), "black": dict(default_reserve)}
    )
    turn: int = 0
    current_player: str = "white"
    turn_counts: Dict[str, int] = field(default_factory=lambda: {"white": 0, "black": 0})
    piece_positions: Dict[str, dict] = field(default_factory=dict)
    move_history: List[dict] = field(default_factory=list)
    piece_counters: Dict[str, int] = field(default_factory=lambda: {"white": 0, "black": 0})


def create_game() -> GameState:
    return GameState()


def _clone_reserves(reserves: Dict[str, Dict[str, int]]) -> Dict[str, Dict[str, int]]:
    return {player: dict(pool) for player, pool in reserves.items()}


def clone_state(state: GameState, **overrides) -> GameState:
    return GameState(
        board=clone_board(state.board),
        reserves=_clone_reserves(state.reserves),
        turn=overrides.get("turn", state.turn),
        current_player=overrides.get("current_player", state.current_player),
        turn_counts=dict(state.turn_counts),
        piece_positions=dict(state.piece_positions),
        move_history=list(state.move_history),
        piece_counters=dict(state.piece_counters),
    )


def next_player(player: str) -> str:
    return "black" if player == "white" else "white"


def next_piece_id(state: GameState, player: str, piece_type: str) -> str:
    count = state.piece_counters[player] + 1
    return f"{player}-{piece_type}-{count}"


def apply_placement(state: GameState, player: str, piece_type: str, coord: Coord, piece_id: Optional[str] = None) -> GameState:
    next_state = GameState(
        board=clone_board(state.board),
        reserves=_clone_reserves(state.reserves),
        turn=state.turn,
        current_player=state.current_player,
        turn_counts=dict(state.turn_counts),
        piece_positions=dict(state.piece_positions),
        move_history=list(state.move_history),
        piece_counters=dict(state.piece_counters),
    )
    pid = piece_id or next_piece_id(state, player, piece_type)
    piece = {"id": pid, "player": player, "type": piece_type}
    place_piece(next_state.board, coord, piece)
    next_state.reserves[player][piece_type] -= 1
    next_state.piece_positions[pid] = {"coord": coord}
    next_state.move_history.append({"type": "place", "player": player, "pieceType": piece_type, "coord": coord})
    next_state.turn_counts[player] += 1
    next_state.turn += 1
    next_state.current_player = next_player(player)
    next_state.piece_counters[player] += 1
    return next_state


def apply_movement(state: GameState, player: str, piece_id: str, from_coord: Coord, to_coord: Coord) -> GameState:
    next_state = GameState(
        board=clone_board(state.board),
        reserves=_clone_reserves(state.reserves),
        turn=state.turn,
        current_player=state.current_player,
        turn_counts=dict(state.turn_counts),
        piece_positions=dict(state.piece_positions),
        move_history=list(state.move_history),
        piece_counters=dict(state.piece_counters),
    )
    move_top_piece(next_state.board, from_coord, to_coord)
    next_state.piece_positions[piece_id] = {"coord": to_coord}
    next_state.move_history.append({"type": "move", "player": player, "pieceId": piece_id, "from": from_coord, "to": to_coord})
    next_state.turn_counts[player] += 1
    next_state.turn += 1
    next_state.current_player = next_player(player)
    return next_state
