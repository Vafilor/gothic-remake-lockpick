import { describe, expect, test } from "vitest";

import {
  createEmptyMatrix,
  matrixToRules,
  resizeMatrix,
  rulesToMatrix,
  type LinkMatrix,
} from "./matrix";

describe("matrixToRules", () => {
  test("moved plate always steps in the pressed direction", () => {
    const matrix = createEmptyMatrix(2);

    const rules = matrixToRules(matrix);

    expect(rules[0].right).toEqual([1, 0]);
    expect(rules[0].left).toEqual([-1, 0]);
    expect(rules[1].right).toEqual([0, 1]);
  });

  test("encodes same and reverse links from the README example", () => {
    // 1 -> 2 same, 1 -> 3 same, 2 -> 3 reverse, 3 -> 1 same.
    const matrix: LinkMatrix = [
      ["none", "same", "same"],
      ["none", "none", "reverse"],
      ["same", "none", "none"],
    ];

    const rules = matrixToRules(matrix);

    // Moving plate 1 right moves plates 2 and 3 right too.
    expect(rules[0].right).toEqual([1, 1, 1]);
    // Moving plate 2 right moves plate 3 left (reverse).
    expect(rules[1].right).toEqual([0, 1, -1]);
    // Moving plate 3 right moves plate 1 right (same).
    expect(rules[2].right).toEqual([1, 0, 1]);
  });
});

describe("rulesToMatrix", () => {
  test("round-trips through matrixToRules", () => {
    const matrix: LinkMatrix = [
      ["none", "same", "reverse"],
      ["reverse", "none", "same"],
      ["same", "none", "none"],
    ];

    expect(rulesToMatrix(matrixToRules(matrix))).toEqual(matrix);
  });
});

describe("resizeMatrix", () => {
  test("keeps existing links when growing", () => {
    const matrix: LinkMatrix = [
      ["none", "same"],
      ["reverse", "none"],
    ];

    const grown = resizeMatrix(matrix, 3);

    expect(grown[0][1]).toBe("same");
    expect(grown[1][0]).toBe("reverse");
    expect(grown[2][2]).toBe("none");
    expect(grown.length).toBe(3);
  });

  test("drops links when shrinking", () => {
    const matrix = createEmptyMatrix(3);
    matrix[0][2] = "same";

    const shrunk = resizeMatrix(matrix, 2);

    expect(shrunk.length).toBe(2);
    expect(shrunk[0].length).toBe(2);
  });
});
