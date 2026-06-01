from data import build_graph

def print_graph(graph):
    print("Graph topology:")
    for cid, node in graph.items():
        neighbors = sorted(node.neighbors) if node.neighbors else []
        print(f"  Concept {cid} → {neighbors if neighbors else '(terminal)'}")

def check_branching(graph):
    """At least one concept must connect to more than one neighbor."""
    branching = [cid for cid, node in graph.items() if len(node.neighbors) > 1]
    assert branching, "FAIL: No concept connects to more than one neighbor — graph is linear"
    print(f"\n✓ Branching confirmed at concepts: {branching}")

def check_all_concepts_reachable(graph):
    """Every concept must be reachable from concept 1 via BFS."""
    visited = set()
    queue = [1]
    while queue:
        current = queue.pop(0)
        if current in visited:
            continue
        visited.add(current)
        for neighbor in graph[current].neighbors:
            if neighbor not in visited:
                queue.append(neighbor)
    all_ids = set(graph.keys())
    unreachable = all_ids - visited
    assert not unreachable, f"FAIL: Concepts not reachable from node 1: {unreachable}"
    print(f"✓ All {len(all_ids)} concepts reachable from concept 1")

def check_no_self_loops(graph):
    """No concept should list itself as a neighbor."""
    for cid, node in graph.items():
        assert cid not in node.neighbors, \
            f"FAIL: Concept {cid} has a self-loop"
    print("✓ No self-loops found")

def check_terminal_node_exists(graph):
    """At least one concept should have no outgoing neighbors (terminal node)."""
    terminals = [cid for cid, node in graph.items() if not node.neighbors]
    assert terminals, "FAIL: No terminal node found — graph has no endpoint"
    print(f"✓ Terminal node(s) confirmed: {terminals}")

if __name__ == "__main__":
    graph = build_graph()
    print_graph(graph)
    print("\n--- Graph Structure Checks ---")
    check_branching(graph)
    check_all_concepts_reachable(graph)
    check_no_self_loops(graph)
    check_terminal_node_exists(graph)
    print("\nAll graph checks passed.")