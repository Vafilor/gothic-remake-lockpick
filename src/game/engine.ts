import type {
  Direction,
  GameState,
  PuzzleDefinition,
} from "./types";

export function createGameState(puzzle: PuzzleDefinition): GameState {
  return {
    positions: [...puzzle.initialPositions],
    moveCount: 0,
    history: []
  };
}

export function calculateMove(
  puzzle: PuzzleDefinition,
  state: GameState,
  selectedRow: number,
  direction: Direction
): number[] {
  const rule = puzzle.rules[selectedRow];

  if (!rule) {
    throw new RangeError(`Unknown row: ${selectedRow}`);
  }

  const movements = rule[direction];

  if (movements.length !== state.positions.length) {
    throw new Error("Rule size does not match row count");
  }

  return state.positions.map(
    (position, rowIndex) => position + movements[rowIndex],
  );
}

export function positionsAreValid(
  puzzle: PuzzleDefinition,
  positions: number[]
): boolean {
  return positions.every(
    position =>
      position >= 0 &&
      position < puzzle.columnCount,
  );
}

export function canMove(
  puzzle: PuzzleDefinition,
  state: GameState,
  selectedRow: number,
  direction: Direction
): boolean {
  const positions = calculateMove(
    puzzle,
    state,
    selectedRow,
    direction,
  );

  return positionsAreValid(puzzle, positions);
}

export function applyMove(
  puzzle: PuzzleDefinition,
  state: GameState,
  selectedRow: number,
  direction: Direction,
): GameState {
  const positions = calculateMove(
    puzzle,
    state,
    selectedRow,
    direction,
  );

  if (!positionsAreValid(puzzle, positions)) {
    return state;
  }

  return {
    positions,
    moveCount: state.moveCount + 1,
    history: state.history.concat({
        row: selectedRow,
        direction
    })
  };
}

export function hasWon(
  puzzle: PuzzleDefinition,
  state: Pick<GameState, "positions"> & Partial<GameState>,
): boolean {
  return state.positions.every(
    position => position === puzzle.targetColumn,
  );
}