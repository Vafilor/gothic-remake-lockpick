// @vitest-environment happy-dom
import { beforeEach, describe, expect, test } from "vitest";

import { createPlayView } from "./playView";
import type { PuzzleDefinition } from "../game/types";

// Two plates: moving plate 1 also moves plate 2 the same way (a "same" link).
// Both pins start one slot left of the target, so a single left move on plate 1
// (which slides its pin right) aligns everything.
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

    // Plate 1 is selected by default; slide it left to carry both pins right.
    pressKey("ArrowLeft");

    const banner = root.querySelector(".banner.success");
    expect(banner?.textContent).toContain("Unlocked");

    const historyItems = root.querySelectorAll(".history li");
    expect(historyItems.length).toBe(1);
    expect(historyItems[0].textContent).toBe("Plate 1: Left");
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
    // Start both pins two slots left of the target: two left moves (each
    // sliding the pins right) solve it.
    view.load({ ...puzzle, initialPositions: [1, 1] });

    clickButton(root, "Solve");

    const solution = root.querySelector(".solution");
    expect(solution?.querySelector("h2")?.textContent).toContain(
      "2 moves",
    );

    const steps = Array.from(
      solution?.querySelectorAll("li") ?? [],
    ).map(item => item.textContent);
    expect(steps).toEqual(["Plate 1: Left", "Plate 1: Left"]);
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

  test("slides both linked rows when a move succeeds", () => {
    const view = createPlayView(root);
    // Both pins start on slot 3 (offset position - targetColumn = -1); a left
    // move slides them to slot 4 (offset 0), under the pick.
    view.load({ ...puzzle, initialPositions: [2, 2] });

    const offsets = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(".board-strip"),
      ).map(strip => strip.style.getPropertyValue("--offset"));

    expect(offsets()).toEqual(["-1", "-1"]);

    pressKey("ArrowLeft");

    // Both linked strips slid one slot, bringing their pin under the pick.
    expect(offsets()).toEqual(["0", "0"]);
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
    // Both pins sit against the left edge. Sliding plate 1 right pushes its pin
    // further left, which is impossible; it drags plate 2 along ([-1, -1]).
    view.load({ ...puzzle, initialPositions: [0, 0] });

    const shaken = trackShakenPlates(() => pressKey("ArrowRight"));

    // Both plates would have moved, so both shake; state is unchanged.
    expect(shaken).toEqual(new Set(["0", "1"]));
    expect(root.querySelector(".history li")).toBeNull();
  });

  test("shakes only the plates a move would actually shift", () => {
    const view = createPlayView(root);
    // Plate 2's pin moves alone ([0, -1]). With plate 2 at the left edge,
    // sliding it right pushes its pin off the board and should shake only it.
    view.load({ ...puzzle, initialPositions: [3, 0] });

    // Select plate 2 (index 1), then try to slide it right.
    const shaken = trackShakenPlates(() => {
      pressKey("ArrowUp");
      pressKey("ArrowRight");
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
