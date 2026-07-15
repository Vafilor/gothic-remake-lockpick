import type {
  Direction,
  GameState,
  MoveRule,
  PuzzleDefinition,
} from "./types";

// A plate slides opposite to its pin: pushing a plate left carries its pin to
// the right. So moving a plate in one direction applies the pin rule for the
// other direction.
const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  left: "right",
  right: "left",
};

// The pin offsets produced by sliding a plate the given direction. `direction`
// describes how the plate moves; the rule arrays describe how the pins move,
// which is the reverse.
export function pinMovements(rule: MoveRule, direction: Direction): number[] {
  return rule[OPPOSITE_DIRECTION[direction]];
}

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

  const movements = pinMovements(rule, direction);

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