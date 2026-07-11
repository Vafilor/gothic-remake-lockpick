export interface BoardOptions {
  columnCount: number;
  targetColumn: number;
  positions: number[];
  // Highlighted plate row (play mode).
  selectedRow?: number;
  // Click handler used by the designer to place pins.
  onCellClick?: (plate: number, column: number) => void;
}

// Renders a grid of plates (rows) by holes (columns). Plates are drawn with the
// highest-numbered plate on top and plate 1 at the bottom, matching the README.
export function renderBoard(options: BoardOptions): HTMLElement {
  const {
    columnCount,
    targetColumn,
    positions,
    selectedRow,
    onCellClick,
  } = options;

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
