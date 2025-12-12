piece_definitions = {
    "queen": {
        "id": "queen",
        "displayName": "Queen Bee",
        "movement": {"type": "step", "maxSteps": 1, "requiresSliding": True},
        "attributes": {"canStack": False, "onTopCountsForSurround": True},
    },
    "beetle": {
        "id": "beetle",
        "displayName": "Beetle",
        "movement": {"type": "step", "maxSteps": 1, "allowsClimb": True},
        "attributes": {"canStack": True, "onTopCountsForSurround": True},
    },
    "spider": {
        "id": "spider",
        "displayName": "Spider",
        "movement": {"type": "exact_crawl", "steps": 3, "requiresSliding": True},
        "attributes": {"canStack": False, "onTopCountsForSurround": True},
    },
    "grasshopper": {
        "id": "grasshopper",
        "displayName": "Grasshopper",
        "movement": {"type": "jump_line"},
        "attributes": {"canStack": False, "onTopCountsForSurround": True},
    },
    "ant": {
        "id": "ant",
        "displayName": "Soldier Ant",
        "movement": {"type": "crawl_any_distance", "requiresSliding": True},
        "attributes": {"canStack": False, "onTopCountsForSurround": True},
    },
}

default_reserve = {
    "queen": 1,
    "beetle": 2,
    "spider": 2,
    "grasshopper": 3,
    "ant": 3,
}
