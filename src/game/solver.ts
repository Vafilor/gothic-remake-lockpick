import { pinMovements } from "./engine";
import type { Action, Direction, PuzzleDefinition } from "./types";

const DIRECTIONS: Direction[] = ["left", "right"];

export type SolveStatus =
  | "solved" // a shortest sequence of moves was found
  | "already-solved" // every pin is already aligned
  | "no-solution" // the whole reachable state space was searched, no win exists
  | "move-cap"; // hit the optional depth limit before finding a win

export interface SolveResult {
  status: SolveStatus;
  // Shortest sequence of moves from the given positions to a win (empty unless
  // status is "solved" or "already-solved").
  moves: Action[];
}

export interface SolveOptions {
  // Optional ceiling on solution length. Omit for a complete search — the state
  // space is finite (columnCount ^ plateCount), so BFS always terminates.
  maxMoves?: number;
}

function key(positions: number[]): string {
  return positions.join(",");
}

function isSolved(puzzle: PuzzleDefinition, positions: number[]): boolean {
  return positions.every(position => position === puzzle.targetColumn);
}

function step(
  puzzle: PuzzleDefinition,
  positions: number[],
  row: number,
  direction: Direction,
): number[] | null {
  const movements = pinMovements(puzzle.rules[row], direction);
  const next = positions.map(
    (position, index) => position + movements[index],
  );

  const inBounds = next.every(
    position => position >= 0 && position < puzzle.columnCount,
  );

  return inBounds ? next : null;
}

// Breadth-first search over board states. Because BFS expands states in
// move-count order, the first path to reach the target is guaranteed shortest.
export function solve(
  puzzle: PuzzleDefinition,
  positions: number[],
  options: SolveOptions = {},
): SolveResult {
  if (isSolved(puzzle, positions)) {
    return { status: "already-solved", moves: [] };
  }

  const maxMoves = options.maxMoves ?? Infinity;
  const start = key(positions);
  const rowCount = positions.length;

  // For each visited state, remember how we got there so we can rebuild the path.
  const cameFrom = new Map<string, { prev: string; action: Action }>();
  const visited = new Set<string>([start]);
  let frontier: number[][] = [positions];
  let depth = 0;

  while (frontier.length > 0) {
    if (depth >= maxMoves) {
      return { status: "move-cap", moves: [] };
    }
    depth++;

    const nextFrontier: number[][] = [];

    for (const current of frontier) {
      const currentKey = key(current);

      for (let row = 0; row < rowCount; row++) {
        for (const direction of DIRECTIONS) {
          const next = step(puzzle, current, row, direction);
          if (!next) continue;

          const nextKey = key(next);
          if (visited.has(nextKey)) continue;

          visited.add(nextKey);
          cameFrom.set(nextKey, {
            prev: currentKey,
            action: { row, direction },
          });

          if (isSolved(puzzle, next)) {
            return {
              status: "solved",
              moves: reconstruct(cameFrom, start, nextKey),
            };
          }

          nextFrontier.push(next);
        }
      }
    }

    frontier = nextFrontier;
  }

  return { status: "no-solution", moves: [] };
}

function reconstruct(
  cameFrom: Map<string, { prev: string; action: Action }>,
  start: string,
  target: string,
): Action[] {
  const moves: Action[] = [];
  let cursor = target;

  while (cursor !== start) {
    const edge = cameFrom.get(cursor);
    if (!edge) break;
    moves.push(edge.action);
    cursor = edge.prev;
  }

  moves.reverse();
  return moves;
}
