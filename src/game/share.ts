import type { MoveRule, PuzzleDefinition } from "./types";

const PUZZLE_PARAM = "puzzle";

// btoa only accepts latin1, so percent-encode first to survive Unicode safely.
function encodeBase64(json: string): string {
  return btoa(encodeURIComponent(json));
}

function decodeBase64(encoded: string): string {
  return decodeURIComponent(atob(encoded));
}

export function encodePuzzle(puzzle: PuzzleDefinition): string {
  return encodeBase64(JSON.stringify(puzzle));
}

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) && value.every(item => typeof item === "number")
  );
}

function isMoveRule(value: unknown): value is MoveRule {
  const rule = value as MoveRule;
  return (
    typeof value === "object" &&
    value !== null &&
    isNumberArray(rule.left) &&
    isNumberArray(rule.right)
  );
}

// Parse untrusted, URL-supplied data defensively; return null on anything odd.
export function decodePuzzle(encoded: string): PuzzleDefinition | null {
  try {
    const parsed = JSON.parse(decodeBase64(encoded)) as PuzzleDefinition;

    if (
      typeof parsed?.columnCount !== "number" ||
      typeof parsed?.targetColumn !== "number" ||
      !isNumberArray(parsed?.initialPositions) ||
      !Array.isArray(parsed?.rules) ||
      !parsed.rules.every(isMoveRule)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

// Read a shared puzzle out of the current URL, if present.
export function readPuzzleFromUrl(): PuzzleDefinition | null {
  const encoded = new URLSearchParams(window.location.search).get(
    PUZZLE_PARAM,
  );

  return encoded ? decodePuzzle(encoded) : null;
}

export function buildShareUrl(puzzle: PuzzleDefinition): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set(PUZZLE_PARAM, encodePuzzle(puzzle));
  url.hash = "play";
  return url.toString();
}
