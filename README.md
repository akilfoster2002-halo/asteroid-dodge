# Asteroid Dodge — a block-coding test

Asteroids fly across space from the right. The student's **Avatar** starts with no code.
They write it in blocks so that the game:

1. **Moves**: up, down, left and right with the arrow keys.
2. **Stays on the screen**: the Avatar never goes past an edge (x = ±16, y = ±9). The
   expected approach is to check the position before moving, e.g.
   `if <(x position) < 16> then` → `if <key [right arrow] pressed?> then` → `change x by 0.3`.
   `touching [up/down/left/right edge]?` also works.
3. **Ends when hit**: `if <touching [Asteroid]?> then stop [all]`.

Then they press **▶ RUN** and try to survive. The time they last is their score.

**This is a test, so the game gives no walkthrough.** There's no checklist and no hint
messages; the paper handout describes the tasks and gives a word bank. The only feedback in
the game is the game itself: the Avatar flashes red when a rock overlaps it and the program
keeps running.

## Handing it in: ⤓ DOWNLOAD SCRIPT

Available at any time, including with the editor open and with an unfinished program. It
asks for the student's name and downloads `asteroid-dodge-<name>.pdf`, which contains:
- the name, date and best time
- the Avatar's script as text, one block per line, indented the way the blocks nest,
  with `end` closing each `if`, `forever` and `repeat`

Students upload that PDF to Google Classroom. The PDF is written by `dodge.js` itself, with
no library, so it works offline like the rest of the folder.

**The coordinates are on the map.** A faint grid runs every 2 units, with the x = 0 and
y = 0 axes a little brighter. The x values are along the bottom and the y values down the
left, and each edge is labelled at its midpoint (`x = 16 · right edge`).

## Play it online

**https://asteroid-dodge-nu.vercel.app**. The teacher answer key is at
https://asteroid-dodge-nu.vercel.app/?answer.

It's hosted on Vercel as a static site, with no build step.

## Running it

It is a plain static folder, with no build step and no install:

```bash
python3 -m http.server 8793
```

Then open http://localhost:8793. Press `C` (or **▦ BLOCKS**) to open the editor.

- **Teacher answer key:** open `http://localhost:8793/?answer`. The reference solution is
  loaded and is never saved over a student's work.
- A student's Avatar code is saved in their browser (`localStorage`). The **↺** button
  resets it.

## How it is built

It uses the block-coding framework from **MESACS 0.2a**, with the same files the full
game uses:

| file | job |
|---|---|
| `blocks.js` | the language: every block as data |
| `vm.js` | runs the blocks: threads, clones, `touching`, `stop all` |
| `coder.js` | the drag-and-drop block editor |
| `strings.js`, `app.css`, `fonts/`, `lib/three.classic.js` | text, styles, typefaces, renderer |
| **`dodge.js`** | the room: arena, Avatar and Asteroids, the Asteroids' scripts, clock, script download |
| **`boot.js`** | renderer, keyboard and frame loop (the same shim as Pong's standalone page) |

The Asteroids are ordinary block scripts that anyone can click and read. A hidden spawner
runs `forever: create a clone of myself, wait (random)`. Each clone picks a random
height, size and speed, then tumbles leftwards and deletes itself off-screen. They speed
up as the timer climbs.

**One change to `vm.js`:** `touching [name]?` now checks every object with that name,
clones included, and skips hidden ones. This is how Scratch reads it. Before, it only
checked the first object with the name, which here is the hidden spawner, so
`touching Asteroid?` could never be true.

**Four edges instead of one.** In the framework, `touching [edge]?` meant "any wall".
`vm.js` now also answers `up edge`, `down edge`, `left edge` and `right edge`, each named
the way it looks from the top-down camera. The editor's dropdown offers those four.
Plain `edge` still works, and it only appears in the dropdown on a block that already
uses it. The room sets its walls (`LEVELS.dodge`) to line up exactly with the drawn border
(x ±16, y ±9).
