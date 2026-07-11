// @vitest-environment happy-dom
import { beforeEach, describe, expect, test } from "vitest";

import { createPlayView } from "./playView";
import type { PuzzleDefinition } from "../game/types";

// Two plates: moving plate 1 also moves plate 2 the same way (a "same" link).
// Both pins start one slot left of the target, so a single right move on plate 1
// aligns everything.
const puzzle: PuzzleDefinition = {
  columnCount: 7,
  targetColumn: 3,
  initialPositions: [2, 2],
  rules: [
    { left: [-1, -1], right: [1, 1] },
    { left: [0, -1], right: [0, 1] },
  ],
};

function pressKey(key: string): void {
  window.dispatchEvent(new window.KeyboardEvent("keydown", { key }));
}

describe("play view", () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement("section");
    document.body.replaceChildren(root);
  });

  test("solving the puzzle shows the win banner and records history", () => {
    const view = createPlayView(root);
    view.load(puzzle);

    expect(root.querySelector(".banner.success")).toBeNull();

    // Plate 1 is selected by default; move it right to align both pins.
    pressKey("ArrowRight");

    const banner = root.querySelector(".banner.success");
    expect(banner?.textContent).toContain("Unlocked");

    const historyItems = root.querySelectorAll(".history li");
    expect(historyItems.length).toBe(1);
    expect(historyItems[0].textContent).toBe("Plate 1: Right");
  });

  test("ignores keyboard input while hidden", () => {
    const view = createPlayView(root);
    view.load(puzzle);
    root.hidden = true;

    pressKey("ArrowRight");

    expect(root.querySelector(".history li")).toBeNull();
  });

  test("reset returns to the starting position", () => {
    const view = createPlayView(root);
    view.load(puzzle);

    pressKey("ArrowRight");
    expect(root.querySelector(".history li")).not.toBeNull();

    const resetButton = Array.from(
      root.querySelectorAll("button"),
    ).find(button => button.textContent === "Reset");
    resetButton?.click();

    expect(root.querySelector(".history li")).toBeNull();
    expect(root.querySelector(".banner.success")).toBeNull();
  });

  test("rejects an invalid puzzle with an explanatory banner", () => {
    const view = createPlayView(root);
    view.load({ ...puzzle, rules: [] });

    expect(root.querySelector(".banner.error")).not.toBeNull();
  });

  test("Solve lists the shortest steps in the same format as the history", () => {
    const view = createPlayView(root);
    // Start both pins two slots left of the target: two right moves solve it.
    view.load({ ...puzzle, initialPositions: [1, 1] });

    clickButton(root, "Solve");

    const solution = root.querySelector(".solution");
    expect(solution?.querySelector("h2")?.textContent).toContain(
      "2 moves",
    );

    const steps = Array.from(
      solution?.querySelectorAll("li") ?? [],
    ).map(item => item.textContent);
    expect(steps).toEqual(["Plate 1: Right", "Plate 1: Right"]);
  });

  test("keeps the solution visible while moving so it can be followed", () => {
    const view = createPlayView(root);
    view.load({ ...puzzle, initialPositions: [1, 1] });

    clickButton(root, "Solve");
    expect(root.querySelector(".solution")).not.toBeNull();

    pressKey("ArrowRight");
    expect(root.querySelector(".solution")).not.toBeNull();
  });

  test("the close button dismisses the solution", () => {
    const view = createPlayView(root);
    view.load({ ...puzzle, initialPositions: [1, 1] });

    clickButton(root, "Solve");
    root.querySelector<HTMLButtonElement>(".solution .close")?.click();

    expect(root.querySelector(".solution")).toBeNull();
  });

  test("slides the pins when a move succeeds", () => {
    const view = createPlayView(root);
    view.load({ ...puzzle, initialPositions: [2, 2] });

    // happy-dom does no layout, so fake each cell's x-position from its column.
    const originalRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function (
      this: HTMLElement,
    ): DOMRect {
      const column = Number(this.dataset.column ?? "0");
      return { left: column * 40 } as DOMRect;
    };

    let slides = 0;
    const originalAnimate = HTMLElement.prototype.animate;
    HTMLElement.prototype.animate = function (): Animation {
      slides++;
      return {} as Animation;
    } as HTMLElement["animate"];

    try {
      pressKey("ArrowRight");
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalRect;
      HTMLElement.prototype.animate = originalAnimate;
    }

    // Both linked pins moved a column, so both should have been animated.
    expect(slides).toBe(2);
  });

  // Records which plate each shake animation targeted, surviving re-renders by
  // hooking the prototype rather than individual element instances.
  function trackShakenPlates(run: () => void): Set<string> {
    const shaken = new Set<string>();
    const original = HTMLElement.prototype.animate;
    HTMLElement.prototype.animate = function (this: HTMLElement): Animation {
      if (this.dataset.plate !== undefined) shaken.add(this.dataset.plate);
      return {} as Animation;
    } as HTMLElement["animate"];

    try {
      run();
    } finally {
      HTMLElement.prototype.animate = original;
    }

    return shaken;
  }

  test("shakes every linked row when a move is invalid", () => {
    const view = createPlayView(root);
    // Both pins sit against the left edge, so a left move is impossible.
    // Plate 1's "left" rule is [-1, -1], so it drags plate 2 along.
    view.load({ ...puzzle, initialPositions: [0, 0] });

    const shaken = trackShakenPlates(() => pressKey("ArrowLeft"));

    // Both plates would have moved, so both shake; state is unchanged.
    expect(shaken).toEqual(new Set(["0", "1"]));
    expect(root.querySelector(".history li")).toBeNull();
  });

  test("shakes only the plates a move would actually shift", () => {
    const view = createPlayView(root);
    // Plate 2's "left" rule is [0, -1] — it moves alone. With plate 2 at the
    // edge, a left move on plate 2 is invalid and should shake only plate 2.
    view.load({ ...puzzle, initialPositions: [3, 0] });

    // Select plate 2 (index 1), then try to move it left.
    const shaken = trackShakenPlates(() => {
      pressKey("ArrowUp");
      pressKey("ArrowLeft");
    });

    expect(shaken).toEqual(new Set(["1"]));
  });

  test("reset dismisses a shown solution", () => {
    const view = createPlayView(root);
    view.load({ ...puzzle, initialPositions: [1, 1] });

    clickButton(root, "Solve");
    expect(root.querySelector(".solution")).not.toBeNull();

    clickButton(root, "Reset");
    expect(root.querySelector(".solution")).toBeNull();
  });
});

function clickButton(root: HTMLElement, label: string): void {
  const button = Array.from(root.querySelectorAll("button")).find(
    candidate => candidate.textContent === label,
  );
  button?.click();
}
