import type { MoveRule, PuzzleDefinition } from "./types";

// Each plate has 7 holes and the goal is to align every pin on the 4th slot.
export const COLUMN_COUNT = 7;
export const TARGET_COLUMN = 3; // 0-indexed, i.e. the 4th slot
export const MIN_PLATES = 1;
export const MAX_PLATES = 7;

// How a plate reacts when a *different* plate is moved.
export type LinkType = "none" | "same" | "reverse";

// matrix[moved][affected] describes how the "affected" plate reacts when the
// "moved" plate is pushed. The diagonal (a plate's effect on itself) is unused:
// a moved plate always steps one column in the pressed direction.
export type LinkMatrix = LinkType[][];

export function createEmptyMatrix(size: number): LinkMatrix {
  return Array.from({ length: size }, () =>
    Array.from<unknown, LinkType>({ length: size }, () => "none"),
  );
}

// Grow or shrink a matrix to `size`, keeping any overlapping links.
export function resizeMatrix(matrix: LinkMatrix, size: number): LinkMatrix {
  return Array.from({ length: size }, (_, moved) =>
    Array.from<unknown, LinkType>(
      { length: size },
      (_unused, affected) => matrix[moved]?.[affected] ?? "none",
    ),
  );
}

function linkToOffset(link: LinkType): number {
  switch (link) {
    case "same":
      return 1;
    case "reverse":
      return -1;
    case "none":
      return 0;
  }
}

// Turn the designer-facing matrix into the offset arrays the engine consumes.
export function matrixToRules(matrix: LinkMatrix): MoveRule[] {
  return matrix.map((links, moved) => {
    const right = links.map((link, affected) =>
      affected === moved ? 1 : linkToOffset(link),
    );
    const left = right.map(offset => (offset === 0 ? 0 : -offset));
    return { left, right };
  });
}

// Recover the matrix from a puzzle so a shared link can populate the designer.
export function rulesToMatrix(rules: MoveRule[]): LinkMatrix {
  return rules.map((rule, moved) =>
    rule.right.map((offset, affected) => {
      if (affected === moved) return "none";
      if (offset > 0) return "same";
      if (offset < 0) return "reverse";
      return "none";
    }),
  );
}

// A blank puzzle to open the designer with.
export function createDefaultPuzzle(plateCount: number): PuzzleDefinition {
  return {
    columnCount: COLUMN_COUNT,
    targetColumn: TARGET_COLUMN,
    initialPositions: Array.from({ length: plateCount }, () => 0),
    rules: matrixToRules(createEmptyMatrix(plateCount)),
  };
}
