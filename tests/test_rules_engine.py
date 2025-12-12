import unittest

from src.game_state import create_game, clone_state
from src.rules_engine import apply_action, get_legal_moves
from src.coords import Coord
from src.board import top_piece


def c(x, y, z):
    return Coord(x, y, z)


class RulesEngineTests(unittest.TestCase):
    def test_queen_move_breaks_hive_is_blocked(self):
        state = create_game()
        state = apply_action(state, "white", {"type": "place", "pieceType": "queen", "to": c(0, 0, 0)})
        state = apply_action(state, "black", {"type": "place", "pieceType": "queen", "to": c(1, -1, 0)})
        state = apply_action(state, "white", {"type": "place", "pieceType": "beetle", "to": c(-1, 1, 0)})
        state = apply_action(state, "black", {"type": "place", "pieceType": "beetle", "to": c(2, -2, 0)})
        moves = get_legal_moves(state, "white")
        queen_moves = [m for m in moves if m["type"] == "move" and m["pieceId"] == "white-queen-1"]
        self.assertEqual(len(queen_moves), 0)

    def test_beetle_can_climb(self):
        state = create_game()
        state = apply_action(state, "white", {"type": "place", "pieceType": "queen", "to": c(0, 0, 0)})
        state = apply_action(state, "black", {"type": "place", "pieceType": "queen", "to": c(-1, 1, 0)})
        state = apply_action(state, "white", {"type": "place", "pieceType": "beetle", "to": c(0, 1, -1)})
        state = clone_state(state, current_player="white")
        moves = get_legal_moves(state, "white")
        beetle_id = top_piece(state.board, c(0, 1, -1))["id"]
        target_key = c(-1, 1, 0).key()
        beetle_climb = next(
            (m for m in moves if m["type"] == "move" and m["pieceId"] == beetle_id and m["to"].key() == target_key),
            None,
        )
        self.assertIsNotNone(beetle_climb)

    def test_grasshopper_jump_line(self):
        state = create_game()
        state = apply_action(state, "white", {"type": "place", "pieceType": "grasshopper", "to": c(0, 0, 0)})
        state = apply_action(state, "black", {"type": "place", "pieceType": "queen", "to": c(1, -1, 0)})
        state = apply_action(state, "white", {"type": "place", "pieceType": "ant", "to": c(2, -2, 0)})
        state = apply_action(state, "black", {"type": "place", "pieceType": "ant", "to": c(1, 0, -1)})
        state = apply_action(state, "white", {"type": "place", "pieceType": "queen", "to": c(0, 1, -1)})
        state = clone_state(state, current_player="white")
        moves = get_legal_moves(state, "white")
        hopper_id = top_piece(state.board, c(0, 0, 0))["id"]
        jump_target = c(3, -3, 0)
        hopper_moves = [
            m for m in moves if m["type"] == "move" and m["pieceId"] == hopper_id and m["to"].key() == jump_target.key()
        ]
        self.assertEqual(len(hopper_moves), 1)

    def test_spider_three_steps(self):
        state = create_game()
        state = apply_action(state, "white", {"type": "place", "pieceType": "spider", "to": c(0, 0, 0)})
        state = apply_action(state, "black", {"type": "place", "pieceType": "queen", "to": c(1, -1, 0)})
        state = apply_action(state, "white", {"type": "place", "pieceType": "queen", "to": c(-1, 1, 0)})
        state = apply_action(state, "black", {"type": "place", "pieceType": "beetle", "to": c(1, 0, -1)})
        state = apply_action(state, "white", {"type": "place", "pieceType": "ant", "to": c(0, 1, -1)})
        state = clone_state(state, current_player="white")
        moves = get_legal_moves(state, "white")
        spider_id = top_piece(state.board, c(0, 0, 0))["id"]
        spider_targets = [m for m in moves if m["type"] == "move" and m["pieceId"] == spider_id]
        origin_key = c(0, 0, 0).key()
        self.assertTrue(all(m["to"].key() != origin_key for m in spider_targets))
        self.assertGreater(len(spider_targets), 0)

    def test_ant_sliding_paths(self):
        state = create_game()
        state = apply_action(state, "white", {"type": "place", "pieceType": "ant", "to": c(0, 0, 0)})
        state = apply_action(state, "black", {"type": "place", "pieceType": "queen", "to": c(1, -1, 0)})
        state = apply_action(state, "white", {"type": "place", "pieceType": "queen", "to": c(-1, 1, 0)})
        state = apply_action(state, "black", {"type": "place", "pieceType": "beetle", "to": c(1, 0, -1)})
        state = apply_action(state, "white", {"type": "place", "pieceType": "beetle", "to": c(0, 1, -1)})
        state = clone_state(state, current_player="white")
        moves = get_legal_moves(state, "white")
        ant_id = top_piece(state.board, c(0, 0, 0))["id"]
        ant_moves = [m for m in moves if m["type"] == "move" and m["pieceId"] == ant_id]
        self.assertGreater(len(ant_moves), 0)

    def test_placement_blocked_adjacent_enemy(self):
        state = create_game()
        state = apply_action(state, "white", {"type": "place", "pieceType": "queen", "to": c(0, 0, 0)})
        state = apply_action(state, "black", {"type": "place", "pieceType": "queen", "to": c(1, -1, 0)})
        moves = [m for m in get_legal_moves(state, "white") if m["type"] == "place"]
        forbidden = any(m["to"] == c(1, 0, -1) for m in moves)
        self.assertFalse(forbidden)

    def test_queen_must_be_placed_by_fourth_turn(self):
        state = create_game()
        state = apply_action(state, "white", {"type": "place", "pieceType": "ant", "to": c(0, 0, 0)})
        state = apply_action(state, "black", {"type": "place", "pieceType": "ant", "to": c(1, -1, 0)})
        state = apply_action(state, "white", {"type": "place", "pieceType": "ant", "to": c(0, 1, -1)})
        state = apply_action(state, "black", {"type": "place", "pieceType": "ant", "to": c(2, -2, 0)})
        state = apply_action(state, "white", {"type": "place", "pieceType": "ant", "to": c(-1, 1, 0)})
        state = clone_state(state, current_player="white")
        moves = get_legal_moves(state, "white")
        non_queen = any(m["type"] == "place" and m["pieceType"] != "queen" for m in moves)
        queen_moves = [m for m in moves if m["type"] == "place" and m["pieceType"] == "queen"]
        self.assertFalse(non_queen)
        self.assertGreater(len(queen_moves), 0)


if __name__ == "__main__":
    unittest.main()
