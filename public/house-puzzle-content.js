/** Immutable content identity for saved picture-table rounds. New art needs a new version. */
/** @typedef {'ivy-bell' | 'crescent-arch' | 'paper-star' | 'bird-string' | 'shelf-leaves' | 'honey-cap' | 'fern-rain' | 'rain-roof' | 'star-curtain' | 'book-spines' | 'red-teapot' | 'lamp-shade' | 'teal-cup' | 'cat-tail' | 'cat-book' | 'notebook' | 'biscuits' | 'lamp-base' | 'rug-leaf' | 'chair-leg' | 'desk-leg' | 'slippers' | 'yarn-coil' | 'woven-basket'} PuzzlePieceId */
/** @typedef {{id: PuzzlePieceId, description: string, destination: number}} PuzzlePiece */
/** @typedef {{id: 'rainy-nook', version: 1, digest: string, title: string, url: string, columns: 6, rows: 4, reference: string, pieces: readonly PuzzlePiece[]}} PuzzleIllustration */
/** @type {readonly PuzzlePiece[]} */
export const PUZZLE_PIECES = Object.freeze([
  {
    "id": "ivy-bell",
    "description": "Ivy leaves beside a little brass bell",
    "destination": 0
  },
  {
    "id": "crescent-arch",
    "description": "Gold crescent in the window arch",
    "destination": 1
  },
  {
    "id": "paper-star",
    "description": "Paper star with the window curve",
    "destination": 2
  },
  {
    "id": "bird-string",
    "description": "Red bird hanging from a string",
    "destination": 3
  },
  {
    "id": "shelf-leaves",
    "description": "Trailing leaves above the small shelf",
    "destination": 4
  },
  {
    "id": "honey-cap",
    "description": "Honey lamp cap with wall stitches",
    "destination": 5
  },
  {
    "id": "fern-rain",
    "description": "Fern fronds beside the rainy glass",
    "destination": 6
  },
  {
    "id": "rain-roof",
    "description": "Rain streaks over a tiny blue roof",
    "destination": 7
  },
  {
    "id": "star-curtain",
    "description": "Rainy glass beside the folded curtain",
    "destination": 8
  },
  {
    "id": "book-spines",
    "description": "Sage and ochre book spines on a shelf",
    "destination": 9
  },
  {
    "id": "red-teapot",
    "description": "Round red teapot and its curved spout",
    "destination": 10
  },
  {
    "id": "lamp-shade",
    "description": "Amber lampshade with a scalloped edge",
    "destination": 11
  },
  {
    "id": "teal-cup",
    "description": "Teal cup and saucer on the desk",
    "destination": 12
  },
  {
    "id": "cat-tail",
    "description": "Striped cat tail curling over the desk",
    "destination": 13
  },
  {
    "id": "cat-book",
    "description": "Sleeping cat face against a blue book",
    "destination": 14
  },
  {
    "id": "notebook",
    "description": "Green notebook with a red pencil",
    "destination": 15
  },
  {
    "id": "biscuits",
    "description": "Three biscuits on a cream plate",
    "destination": 16
  },
  {
    "id": "lamp-base",
    "description": "Brass lamp base at the desk end",
    "destination": 17
  },
  {
    "id": "rug-leaf",
    "description": "Pale leaf on the indigo rug border",
    "destination": 18
  },
  {
    "id": "chair-leg",
    "description": "Angled chair leg across the woven rug",
    "destination": 19
  },
  {
    "id": "desk-leg",
    "description": "Wooden desk leg with a gold rug stripe",
    "destination": 20
  },
  {
    "id": "slippers",
    "description": "Pair of red slippers below the desk",
    "destination": 21
  },
  {
    "id": "yarn-coil",
    "description": "Ochre yarn coil and its loose thread",
    "destination": 22
  },
  {
    "id": "woven-basket",
    "description": "Woven basket beside the rug corner",
    "destination": 23
  }
].map(piece => Object.freeze(piece)));
/** @type {readonly PuzzleIllustration[]} */
export const PUZZLE_ILLUSTRATIONS = Object.freeze([Object.freeze({
  id: 'rainy-nook', version: 1,
  digest: "08af5570490c5c32b1b684a33e14a5b78f65274239b8156774394da50ab9bca6",
  title: 'Rain at the study nook', url: '/assets/pictures/rainy-nook-v1.svg',
  columns: 6, rows: 4,
  reference: 'The rainy arched window and ivy are on the left, with a crescent and hanging star above. A red bird hangs between the window and the shelf. Trailing leaves and books sit above a red teapot. The honey lamp stands at the right end of a long wooden desk. A teal cup, sleeping cat, open book, green notebook and biscuits sit across the desk. Below are an indigo rug, chair and desk legs, red slippers, a coil of yarn and a woven basket.',
  pieces: PUZZLE_PIECES,
})]);
/** @param {unknown} id @param {unknown} version */
export function getPuzzleIllustration(id, version) {
  return PUZZLE_ILLUSTRATIONS.find(item => item.id === id && item.version === version);
}
