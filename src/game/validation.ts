import type { PuzzleDefinition } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePuzzle(
  puzzle: PuzzleDefinition,
): ValidationResult {
  const errors: string[] = [];
  const rowCount = puzzle.initialPositions.length;

  if (rowCount === 0) {
    errors.push("The puzzle must contain at least one row.");
  }

  if (puzzle.columnCount < 2) {
    errors.push("The puzzle must contain at least two columns.");
  }

  if (
    puzzle.targetColumn < 0 ||
    puzzle.targetColumn >= puzzle.columnCount
  ) {
    errors.push("The target column is outside the board.");
  }

  if (puzzle.rules.length !== rowCount) {
    errors.push("There must be one rule for every row.");
  }

  puzzle.initialPositions.forEach((position, rowIndex) => {
    if (
      position < 0 ||
      position >= puzzle.columnCount
    ) {
      errors.push(
        `Row ${rowIndex + 1} has an invalid starting position.`,
      );
    }
  });

  puzzle.rules.forEach((rule, rowIndex) => {
    if (
      rule.left.length !== rowCount ||
      rule.right.length !== rowCount
    ) {
      errors.push(
        `The rules for row ${rowIndex + 1} have the wrong size.`,
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}