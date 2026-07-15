export type Direction = "left" | "right";

export interface MoveRule {
  left: number[];
  right: number[];
}

export interface Action {
    row: number;
    direction: Direction;
}

export interface PuzzleDefinition {
  columnCount: number;
  targetColumn: number; // In the game this is 4, but we can change it if we want.
  initialPositions: number[];

  // rules[rowIndex].left / .right are the pin offsets for that row when its pin
  // slides left / right. Controls move the *plate*, which carries the pin the
  // opposite way, so the engine flips direction before applying a rule (see
  // pinMovements in engine.ts).
  rules: MoveRule[];
}

export interface GameState {
  positions: number[];
  moveCount: number;
  history: Action[];
}