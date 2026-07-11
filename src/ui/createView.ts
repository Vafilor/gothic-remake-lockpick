import {
  COLUMN_COUNT,
  MAX_PLATES,
  MIN_PLATES,
  TARGET_COLUMN,
  createEmptyMatrix,
  matrixToRules,
  resizeMatrix,
  rulesToMatrix,
  type LinkMatrix,
  type LinkType,
} from "../game/matrix";
import { validatePuzzle } from "../game/validation";
import { buildShareUrl } from "../game/share";
import { renderBoard } from "./board";
import type { PuzzleDefinition } from "../game/types";

export interface CreateView {
  getPuzzle(): PuzzleDefinition;
  setPuzzle(puzzle: PuzzleDefinition): void;
}

interface CreateViewOptions {
  // Called when the designer asks to try the puzzle in Play mode.
  onPlay: (puzzle: PuzzleDefinition) => void;
}

const LINK_LABELS: Record<LinkType, string> = {
  none: "—",
  same: "Same",
  reverse: "Reverse",
};

export function createCreateView(
  root: HTMLElement,
  options: CreateViewOptions,
): CreateView {
  let plateCount = 3;
  let positions = Array.from({ length: plateCount }, () => 0);
  let matrix: LinkMatrix = createEmptyMatrix(plateCount);

  function getPuzzle(): PuzzleDefinition {
    return {
      columnCount: COLUMN_COUNT,
      targetColumn: TARGET_COLUMN,
      initialPositions: [...positions],
      rules: matrixToRules(matrix),
    };
  }

  function setPlateCount(next: number): void {
    plateCount = Math.min(MAX_PLATES, Math.max(MIN_PLATES, next));
    positions = Array.from(
      { length: plateCount },
      (_unused, plate) => positions[plate] ?? 0,
    );
    matrix = resizeMatrix(matrix, plateCount);
    render();
  }

  function setPuzzle(puzzle: PuzzleDefinition): void {
    plateCount = puzzle.initialPositions.length;
    positions = [...puzzle.initialPositions];
    matrix = rulesToMatrix(puzzle.rules);
    render();
  }

  function render(): void {
    root.replaceChildren(
      renderHeading(),
      renderPlateCountControl(plateCount, setPlateCount),
      renderPositionsSection(),
      renderRulesSection(),
      renderActions(),
    );
  }

  function renderPositionsSection(): HTMLElement {
    const section = document.createElement("section");
    section.className = "panel";
    section.append(
      panelHeading(
        "Starting positions",
        "Click a slot to place each plate's pin. Slot 4 is the goal.",
      ),
    );
    section.append(
      renderBoard({
        columnCount: COLUMN_COUNT,
        targetColumn: TARGET_COLUMN,
        positions,
        onCellClick: (plate, column) => {
          positions[plate] = column;
          render();
        },
      }),
    );
    return section;
  }

  function renderRulesSection(): HTMLElement {
    const section = document.createElement("section");
    section.className = "panel";
    section.append(
      panelHeading(
        "Links",
        "Choose how each plate reacts when another plate is moved.",
      ),
    );

    if (plateCount < 2) {
      const hint = document.createElement("p");
      hint.className = "hint";
      hint.textContent = "Add a second plate to create links.";
      section.append(hint);
      return section;
    }

    section.append(renderMatrix());
    return section;
  }

  function renderMatrix(): HTMLElement {
    const table = document.createElement("table");
    table.className = "matrix";

    const head = document.createElement("tr");
    head.append(matrixCorner());
    for (let affected = 0; affected < plateCount; affected++) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = String(affected + 1);
      head.append(th);
    }
    table.append(head);

    for (let moved = 0; moved < plateCount; moved++) {
      const row = document.createElement("tr");
      const rowHead = document.createElement("th");
      rowHead.scope = "row";
      rowHead.textContent = `Move ${moved + 1}`;
      row.append(rowHead);

      for (let affected = 0; affected < plateCount; affected++) {
        row.append(renderMatrixCell(moved, affected));
      }
      table.append(row);
    }

    return table;
  }

  function renderMatrixCell(moved: number, affected: number): HTMLElement {
    const cell = document.createElement("td");

    if (moved === affected) {
      cell.className = "matrix-self";
      cell.textContent = "×";
      cell.title = "A plate always steps one slot in the pressed direction.";
      return cell;
    }

    const select = document.createElement("select");
    select.setAttribute(
      "aria-label",
      `Effect on plate ${affected + 1} when plate ${moved + 1} moves`,
    );

    (Object.keys(LINK_LABELS) as LinkType[]).forEach(link => {
      const option = document.createElement("option");
      option.value = link;
      option.textContent = LINK_LABELS[link];
      option.selected = matrix[moved][affected] === link;
      select.append(option);
    });

    select.addEventListener("change", () => {
      matrix[moved][affected] = select.value as LinkType;
    });

    cell.append(select);
    return cell;
  }

  function renderActions(): HTMLElement {
    const actions = document.createElement("div");
    actions.className = "actions";

    const message = document.createElement("p");
    message.className = "message";
    message.setAttribute("role", "status");

    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.className = "primary";
    playButton.textContent = "Play this puzzle";
    playButton.addEventListener("click", () => {
      const puzzle = getPuzzle();
      const result = validatePuzzle(puzzle);
      if (!result.valid) {
        showMessage(message, result.errors.join(" "), "error");
        return;
      }
      options.onPlay(puzzle);
    });

    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.textContent = "Share";
    shareButton.addEventListener("click", () => {
      void share(message);
    });

    actions.append(playButton, shareButton, message);
    return actions;
  }

  async function share(message: HTMLElement): Promise<void> {
    const puzzle = getPuzzle();
    const result = validatePuzzle(puzzle);
    if (!result.valid) {
      showMessage(message, result.errors.join(" "), "error");
      return;
    }

    const url = buildShareUrl(puzzle);
    try {
      await navigator.clipboard.writeText(url);
      showMessage(message, "Share link copied to clipboard!", "success");
    } catch {
      // Clipboard can be unavailable (e.g. insecure context); show the link.
      showMessage(message, url, "success");
    }
  }

  render();

  return { getPuzzle, setPuzzle };
}

function showMessage(
  element: HTMLElement,
  text: string,
  kind: "error" | "success",
): void {
  element.textContent = text;
  element.dataset.kind = kind;
}

function renderHeading(): HTMLElement {
  const heading = document.createElement("h1");
  heading.textContent = "Design a lock";
  return heading;
}

function renderPlateCountControl(
  value: number,
  onChange: (next: number) => void,
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "panel plate-count";

  const label = document.createElement("label");
  label.textContent = "Plates";
  label.htmlFor = "plate-count";

  const input = document.createElement("input");
  input.id = "plate-count";
  input.type = "number";
  input.min = String(MIN_PLATES);
  input.max = String(MAX_PLATES);
  input.value = String(value);
  input.addEventListener("change", () => {
    const next = Number.parseInt(input.value, 10);
    if (Number.isFinite(next)) onChange(next);
  });

  wrapper.append(label, input);
  return wrapper;
}

function panelHeading(title: string, description: string): HTMLElement {
  const container = document.createElement("div");
  container.className = "panel-heading";

  const heading = document.createElement("h2");
  heading.textContent = title;

  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = description;

  container.append(heading, hint);
  return container;
}

function matrixCorner(): HTMLElement {
  const corner = document.createElement("th");
  corner.className = "matrix-corner";
  corner.textContent = "↓ move / affect →";
  return corner;
}
