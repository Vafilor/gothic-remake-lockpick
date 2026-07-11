import {
  applyMove,
  canMove,
  createGameState,
  hasWon,
} from "../game/engine";
import { solve, type SolveResult } from "../game/solver";
import { validatePuzzle } from "../game/validation";
import { renderBoard } from "./board";
import type {
  Action,
  Direction,
  GameState,
  PuzzleDefinition,
} from "../game/types";

export interface PlayView {
  load(puzzle: PuzzleDefinition): void;
}

// A quick left/right nudge shown when an invalid move is attempted.
const SHAKE_KEYFRAMES: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-4px)" },
  { transform: "translateX(4px)" },
  { transform: "translateX(-3px)" },
  { transform: "translateX(3px)" },
  { transform: "translateX(-1px)" },
  { transform: "translateX(0)" },
];

const SHAKE_TIMING: KeyframeAnimationOptions = {
  duration: 260,
  easing: "ease-in-out",
};

const PIN_SLIDE_TIMING: KeyframeAnimationOptions = {
  duration: 300,
  easing: "ease",
};

function prefersReducedMotion(): boolean {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

// The plates a move would shift: every one with a non-zero offset in the rule.
function affectedPlates(
  puzzle: PuzzleDefinition,
  row: number,
  direction: Direction,
): number[] {
  const plates: number[] = [];
  puzzle.rules[row][direction].forEach((offset, plate) => {
    if (offset !== 0) plates.push(plate);
  });
  return plates;
}

// `root` is the <section> that is toggled with `hidden`; keyboard input is only
// handled while that section is visible.
export function createPlayView(root: HTMLElement): PlayView {
  let puzzle: PuzzleDefinition | null = null;
  let state: GameState | null = null;
  let selectedRow = 0;
  // The most recent Solve result, shown beneath the move history. Cleared
  // whenever the board changes so stale steps are never displayed.
  let solution: SolveResult | null = null;

  function load(next: PuzzleDefinition): void {
    const result = validatePuzzle(next);
    if (!result.valid) {
      puzzle = null;
      state = null;
      solution = null;
      renderInvalid(result.errors);
      return;
    }

    puzzle = next;
    state = createGameState(next);
    selectedRow = 0;
    solution = null;
    render();
  }

  function reset(): void {
    if (!puzzle) return;
    state = createGameState(puzzle);
    selectedRow = 0;
    solution = null;
    render();
  }

  function move(direction: Direction): void {
    if (!puzzle || !state || hasWon(puzzle, state)) return;
    if (!canMove(puzzle, state, selectedRow, direction)) {
      // The move would push a pin off the board — nudge every plate the move
      // would have shifted (the pressed plate plus any linked ones) to signal it.
      shakeRows(affectedPlates(puzzle, selectedRow, direction));
      return;
    }
    // FLIP: record where the pins are, apply the move (which re-renders the
    // board with the pins in their new cells), then slide each pin from its
    // old position to the new one.
    const before = capturePinPositions();
    state = applyMove(puzzle, state, selectedRow, direction);
    // The solution stays on screen so it can be followed step by step; it is
    // only dismissed via its close button, a reset, or loading a new puzzle.
    render();
    slidePins(before);
  }

  // Maps each plate to the left edge of the cell its pin currently occupies.
  function capturePinPositions(): Map<string, number> {
    const positions = new Map<string, number>();
    root.querySelectorAll<HTMLElement>(".board-cell").forEach(cell => {
      const plate = cell.dataset.plate;
      if (plate !== undefined && cell.querySelector(".pin")) {
        positions.set(plate, cell.getBoundingClientRect().left);
      }
    });
    return positions;
  }

  function slidePins(before: Map<string, number>): void {
    if (prefersReducedMotion()) return;
    root.querySelectorAll<HTMLElement>(".board-cell").forEach(cell => {
      const pin = cell.querySelector<HTMLElement>(".pin");
      const plate = cell.dataset.plate;
      if (!pin || plate === undefined || typeof pin.animate !== "function") {
        return;
      }

      const from = before.get(plate);
      if (from === undefined) return;

      const dx = from - cell.getBoundingClientRect().left;
      if (dx === 0) return;

      pin.animate(
        [
          { transform: `translateX(${dx}px)` },
          { transform: "translateX(0)" },
        ],
        PIN_SLIDE_TIMING,
      );
    });
  }

  function shakeRows(plates: number[]): void {
    if (prefersReducedMotion()) return;
    plates.forEach(plate => {
      root
        .querySelectorAll<HTMLElement>(`[data-plate="${plate}"]`)
        .forEach(cell => {
          if (typeof cell.animate === "function") {
            cell.animate(SHAKE_KEYFRAMES, SHAKE_TIMING);
          }
        });
    });
  }

  function solveFromHere(): void {
    if (!puzzle || !state) return;
    solution = solve(puzzle, state.positions);
    render();
  }

  function dismissSolution(): void {
    solution = null;
    render();
  }

  function selectRow(next: number): void {
    if (!puzzle) return;
    const plateCount = puzzle.initialPositions.length;
    selectedRow = Math.min(plateCount - 1, Math.max(0, next));
    render();
  }

  function handleKeydown(event: KeyboardEvent): void {
    // Ignore input while the view is hidden or detached from the document.
    if (root.hidden || !root.isConnected || !puzzle || !state) return;

    switch (event.key) {
      case "ArrowLeft":
        move("left");
        break;
      case "ArrowRight":
        move("right");
        break;
      case "ArrowUp":
        selectRow(selectedRow + 1);
        break;
      case "ArrowDown":
        selectRow(selectedRow - 1);
        break;
      default:
        return;
    }

    event.preventDefault();
  }

  window.addEventListener("keydown", handleKeydown);

  function render(): void {
    if (!puzzle || !state) return;

    const won = hasWon(puzzle, state);

    const children: Node[] = [
      renderHeading(),
      won ? renderWinBanner() : renderInstructions(),
      renderBoard({
        columnCount: puzzle.columnCount,
        targetColumn: puzzle.targetColumn,
        positions: state.positions,
        selectedRow,
      }),
      renderControls(),
      renderHistory(state),
    ];

    if (solution) children.push(renderSolution(solution, dismissSolution));

    root.replaceChildren(...children);
  }

  function renderControls(): HTMLElement {
    const controls = document.createElement("div");
    controls.className = "controls";

    const rowControls = document.createElement("div");
    rowControls.className = "control-group";
    rowControls.append(
      controlButton("Row ▲", () => selectRow(selectedRow + 1)),
      controlButton("Row ▼", () => selectRow(selectedRow - 1)),
    );

    const moveControls = document.createElement("div");
    moveControls.className = "control-group";
    moveControls.append(
      controlButton("◀ Left", () => move("left")),
      controlButton("Right ▶", () => move("right")),
    );

    const solveButton = controlButton("Solve", solveFromHere);

    const resetButton = controlButton("Reset", reset);
    resetButton.classList.add("reset");

    controls.append(rowControls, moveControls, solveButton, resetButton);
    return controls;
  }

  function renderInvalid(errors: string[]): void {
    const heading = renderHeading();

    const banner = document.createElement("div");
    banner.className = "banner error";
    banner.append(document.createTextNode("This puzzle can't be played:"));

    const list = document.createElement("ul");
    errors.forEach(error => {
      const item = document.createElement("li");
      item.textContent = error;
      list.append(item);
    });
    banner.append(list);

    root.replaceChildren(heading, banner);
  }

  render();

  return { load };
}

function renderHeading(): HTMLElement {
  const heading = document.createElement("h1");
  heading.textContent = "Pick the lock";
  return heading;
}

function renderInstructions(): HTMLElement {
  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent =
    "Use ← → to move the selected plate and ↑ ↓ to switch plates. " +
    "Align every pin on slot 4.";
  return hint;
}

function renderWinBanner(): HTMLElement {
  const banner = document.createElement("div");
  banner.className = "banner success";
  banner.textContent = "Unlocked! Every pin is aligned.";
  return banner;
}

function renderHistory(state: GameState): HTMLElement {
  const container = document.createElement("div");
  container.className = "panel history";

  const heading = document.createElement("h2");
  heading.textContent = `Moves (${state.moveCount})`;
  container.append(heading);

  if (state.history.length === 0) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "No moves yet.";
    container.append(empty);
    return container;
  }

  container.append(renderActionList(state.history));
  return container;
}

function renderSolution(
  solution: SolveResult,
  onClose: () => void,
): HTMLElement {
  const container = document.createElement("div");
  container.className = "panel solution";

  const header = document.createElement("div");
  header.className = "solution-header";

  const heading = document.createElement("h2");

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "close";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "Dismiss solution");
  closeButton.addEventListener("click", onClose);

  header.append(heading, closeButton);
  container.append(header);

  switch (solution.status) {
    case "already-solved":
      heading.textContent = "Solution";
      container.append(hintParagraph("Already solved — every pin is aligned."));
      break;
    case "no-solution":
      heading.textContent = "Solution";
      container.append(
        hintParagraph("No solution exists from this position."),
      );
      break;
    case "move-cap":
      heading.textContent = "Solution";
      container.append(
        hintParagraph("No solution found within the move limit."),
      );
      break;
    case "solved": {
      const plural = solution.moves.length === 1 ? "move" : "moves";
      heading.textContent = `Shortest solution (${solution.moves.length} ${plural})`;
      container.append(renderActionList(solution.moves));
      break;
    }
  }

  return container;
}

function renderActionList(actions: Action[]): HTMLElement {
  const list = document.createElement("ol");
  actions.forEach(action => {
    const item = document.createElement("li");
    const direction = action.direction === "left" ? "Left" : "Right";
    item.textContent = `Plate ${action.row + 1}: ${direction}`;
    list.append(item);
  });
  return list;
}

function hintParagraph(text: string): HTMLElement {
  const paragraph = document.createElement("p");
  paragraph.className = "hint";
  paragraph.textContent = text;
  return paragraph;
}

function controlButton(
  label: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}
