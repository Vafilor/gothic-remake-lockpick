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

  // rules[rowIndex] describes what happens when that
  // row's left or right button is pressed.
  rules: MoveRule[];
}

export interface GameState {
  positions: number[];
  moveCount: number;
  history: Action[];
}