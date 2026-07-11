import { describe, expect, test } from "vitest";

import {
  applyMove,
  canMove,
  createGameState,
  hasWon,
} from "./engine";

import type { PuzzleDefinition } from "./types";

const puzzle: PuzzleDefinition = {
  columnCount: 7,
  targetColumn: 3,
  initialPositions: [1, 5, 3],

  rules: [
    {
      left: [-1, 1, 0],
      right: [1, -1, 0],
    },
    {
      left: [0, -1, -1],
      right: [0, 1, 1],
    },
    {
      left: [1, 0, -1],
      right: [-1, 0, 1],
    },
  ],
};

describe("applyMove", () => {
  test("moves all affected rows", () => {
    const state = createGameState(puzzle);

    const nextState = applyMove(
      puzzle,
      state,
      0,
      "right",
    );

    expect(nextState.positions).toEqual([2, 4, 3]);
    expect(nextState.moveCount).toBe(1);
  });

  test("does not mutate the previous state", () => {
    const state = createGameState(puzzle);

    applyMove(puzzle, state, 0, "right");

    expect(state.positions).toEqual([1, 5, 3]);
    expect(state.moveCount).toBe(0);
  });

  test("rejects moves that leave the board", () => {
    const edgePuzzle: PuzzleDefinition = {
      ...puzzle,
      initialPositions: [0, 5, 3],
    };

    const state = createGameState(edgePuzzle);

    expect(canMove(edgePuzzle, state, 0, "left")).toBe(false);
    expect(
      applyMove(edgePuzzle, state, 0, "left"),
    ).toBe(state);
  });
});

describe("hasWon", () => {
  test("returns true when every piece is on the target", () => {
    expect(
      hasWon(puzzle, {
        positions: [3, 3, 3],
        moveCount: 7,
      }),
    ).toBe(true);
  });

  test("returns false when one piece is off target", () => {
    expect(
      hasWon(puzzle, {
        positions: [3, 2, 3],
        moveCount: 7,
      }),
    ).toBe(false);
  });
});