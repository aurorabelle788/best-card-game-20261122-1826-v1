[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/aurorabelle788/best-card-game-20261122-1826-v1/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/aurorabelle788/best-card-game-20261122-1826-v1/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

# Starfall Court — best-card-game-20261122-1826

An original card duel for [make.fun/bounty/best-card-game-20261122-1826](https://make.fun/bounty/best-card-game-20261122-1826). You are the Star Warden, duelling the Umbral Warden: both start at 30 life, starlight refills every turn and grows by 1, and sixteen cards across four suits (Sun, Moon, Tide, Thorn) deal damage, pierce shield, drain life, raise shield, heal and draw. Play two cards of the same suit in a row and the chain grows — every link adds +1 to the next card. Before the first turn, swap up to 2 cards from your opening hand. The Warden reads the table — it guards when hurt, mends when low, hunts lethal when it sees it — and announces its intent each turn, so you can read it and answer.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Click a card to play it (keys 1–8 work too), Space ends your turn, Esc returns to the title. A `?shot=title|play|win|loss` address opens the game already in that state, for screenshots.

## Layout

- `game/index.html` — the page
- `game/src/deck.js` — the four suits, the sixteen cards, the deck, the seeded shuffle
- `game/src/duel.js` — duel state, turns, combat, chains, mulligan, fatigue
- `game/src/warden.js` — the Umbral Warden's decisions and its announced intent
- `game/src/sound.js` — synthesised WebAudio sounds, no audio files
- `game/src/render.js` — the title, the table, the end screens, card faces
- `game/src/shots.js` — the screenshot scenes, played through the real rules
- `game/src/main.js` — boot, input, screen flow
- `game/src/style.css` — the felt table and the cards
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `screenshots/` — four renders of the game itself: title, table, win, loss

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
