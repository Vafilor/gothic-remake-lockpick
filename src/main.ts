import "./style.css";
import { createCreateView } from "./ui/createView";
import { createPlayView } from "./ui/playView";
import { readPuzzleFromUrl } from "./game/share";
import type { PuzzleDefinition } from "./game/types";

type ViewName = "create" | "play";

const createSection = document.querySelector<HTMLElement>("#create-view")!;
const playSection = document.querySelector<HTMLElement>("#play-view")!;
const createTab = document.querySelector<HTMLButtonElement>("#create-tab")!;
const playTab = document.querySelector<HTMLButtonElement>("#play-tab")!;

const playView = createPlayView(playSection);
const createView = createCreateView(createSection, {
  onPlay: puzzle => loadIntoPlay(puzzle),
});

// Whether the play view holds a puzzle the player may be mid-solve on. Prevents
// a stray Play-tab click from wiping progress; the "Play this puzzle" button
// always reloads instead.
let playLoaded = false;

function loadIntoPlay(puzzle: PuzzleDefinition): void {
  playView.load(puzzle);
  playLoaded = true;
  showView("play");
}

function showView(view: ViewName): void {
  if (view === "play" && !playLoaded) {
    loadIntoPlay(createView.getPuzzle());
    return;
  }

  createSection.hidden = view !== "create";
  playSection.hidden = view !== "play";

  createTab.setAttribute("aria-selected", String(view === "create"));
  playTab.setAttribute("aria-selected", String(view === "play"));

  window.location.hash = view;
}

createTab.addEventListener("click", () => showView("create"));
playTab.addEventListener("click", () => showView("play"));

const sharedPuzzle = readPuzzleFromUrl();

if (sharedPuzzle) {
  createView.setPuzzle(sharedPuzzle);
  loadIntoPlay(sharedPuzzle);
} else {
  showView(window.location.hash === "#play" ? "play" : "create");
}
