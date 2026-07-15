export interface BoardOptions {
  columnCount: number;
  targetColumn: number;
  positions: number[];
  // Highlighted plate row (play mode).
  selectedRow?: number;
  // Click handler used by the designer to place pins. Its presence also selects
  // the create-mode (static grid) rendering over the play-mode sliding board.
  onCellClick?: (plate: number, column: number) => void;
}

// The play board models each plate as a strip of holes that slides behind a
// fixed pick. The create board keeps the simpler static grid where a pin is
// dropped onto a slot. `onCellClick` (only supplied by the designer) picks
// between them.
export function renderBoard(options: BoardOptions): HTMLElement {
  return options.onCellClick
    ? renderStaticBoard(options)
    : renderSlidingBoard(options);
}

// Play mode. A fixed pick sits over the target slot; each plate slides behind
// it carrying a single pin. The pin rides the plate's target hole, so the strip
// is offset by `position - targetColumn` cells, which places the pin at screen
// slot `position`. Sliding a plate right moves the pin toward higher slots;
// the plate is solved when its pin reaches the pick (position === targetColumn).
function renderSlidingBoard(options: BoardOptions): HTMLElement {
  const { columnCount, targetColumn, positions, selectedRow } = options;

  const board = document.createElement("div");
  board.className = "board board--play";
  board.style.setProperty("--columns", String(columnCount));
  board.style.setProperty("--target", String(targetColumn));

  // Highest-numbered plate on top, plate 1 at the bottom, matching the README.
  for (let plate = positions.length - 1; plate >= 0; plate--) {
    const position = positions[plate];
    const aligned = position === targetColumn;

    const row = document.createElement("div");
    row.className = "board-row";

    const label = document.createElement("div");
    label.className = "board-label";
    label.dataset.plate = String(plate);
    if (plate === selectedRow) label.classList.add("is-selected");
    label.textContent = `Plate ${plate + 1}`;
    row.append(label);

    const track = document.createElement("div");
    track.className = "board-track";
    if (plate === selectedRow) track.classList.add("is-selected");
    track.setAttribute(
      "aria-label",
      `Plate ${plate + 1}: pin on slot ${position + 1}` +
        (aligned ? ", at the pick" : ""),
    );

    const strip = document.createElement("div");
    strip.className = "board-strip";
    strip.dataset.plate = String(plate);
    strip.style.setProperty("--offset", String(position - targetColumn));

    for (let column = 0; column < columnCount; column++) {
      const hole = document.createElement("div");
      hole.className = "board-hole";
      hole.dataset.plate = String(plate);
      hole.dataset.column = String(column);

      // The pin lives on the plate's target hole and rides along as it slides.
      if (column === targetColumn) {
        const pin = document.createElement("span");
        pin.className = "hole-pin";
        if (aligned) pin.classList.add("is-aligned");
        hole.append(pin);
      }

      strip.append(hole);
    }

    track.append(strip);

    // The pick: a fixed marker over the target slot the plate slides beneath.
    const pick = document.createElement("div");
    pick.className = "board-pick";
    if (aligned) pick.classList.add("is-aligned");
    track.append(pick);

    row.append(track);
    board.append(row);
  }

  return board;
}

// Create mode. A static grid of slots; clicking one drops that plate's pin.
function renderStaticBoard(options: BoardOptions): HTMLElement {
  const { columnCount, targetColumn, positions, selectedRow, onCellClick } =
    options;

  const board = document.createElement("div");
  board.className = "board";
  board.style.setProperty("--columns", String(columnCount));

  // Column header (slot numbers), offset by an empty label cell.
  const corner = document.createElement("div");
  corner.className = "board-label";
  board.append(corner);

  for (let column = 0; column < columnCount; column++) {
    const header = document.createElement("div");
    header.className = "board-header";
    if (column === targetColumn) header.classList.add("is-target");
    header.textContent = String(column + 1);
    board.append(header);
  }

  for (let plate = positions.length - 1; plate >= 0; plate--) {
    const label = document.createElement("div");
    label.className = "board-label";
    label.dataset.plate = String(plate);
    if (plate === selectedRow) label.classList.add("is-selected");
    label.textContent = `Plate ${plate + 1}`;
    board.append(label);

    for (let column = 0; column < columnCount; column++) {
      const cell = createCell({
        plate,
        column,
        hasPin: positions[plate] === column,
        isTarget: column === targetColumn,
        isSelectedRow: plate === selectedRow,
        onCellClick,
      });
      board.append(cell);
    }
  }

  return board;
}

interface CellOptions {
  plate: number;
  column: number;
  hasPin: boolean;
  isTarget: boolean;
  isSelectedRow: boolean;
  onCellClick?: (plate: number, column: number) => void;
}

function createCell(options: CellOptions): HTMLElement {
  const { plate, column, hasPin, isTarget, isSelectedRow, onCellClick } =
    options;

  const interactive = Boolean(onCellClick);
  const cell = document.createElement(interactive ? "button" : "div");
  cell.className = "board-cell";
  cell.dataset.plate = String(plate);
  cell.dataset.column = String(column);

  if (isTarget) cell.classList.add("is-target");
  if (isSelectedRow) cell.classList.add("is-selected");
  if (hasPin && isTarget) cell.classList.add("is-aligned");

  if (hasPin) {
    const pin = document.createElement("span");
    pin.className = "pin";
    cell.append(pin);
  }

  if (interactive && cell instanceof HTMLButtonElement) {
    cell.type = "button";
    cell.setAttribute(
      "aria-label",
      `Place pin on plate ${plate + 1}, slot ${column + 1}`,
    );
    cell.addEventListener("click", () => onCellClick?.(plate, column));
  }

  return cell;
}
