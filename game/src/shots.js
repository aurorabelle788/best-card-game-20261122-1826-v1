// Starfall Court — screenshot scenes behind ?shot=title|play|win|loss.
// Each scene plays the real rules forward from a fresh duel with a fixed
// seed, steered by a simple autopilot (play every affordable card, then
// end the turn), so the frame is what a short game really looks like and
// the same seed always gives the same frame.

import { mulberry32 } from './deck.js';
import { createDuel, dealOpeningHands, finishMulligan, playCard, endPlayerTurn, nextTurn, applyDamage, checkEnd } from './duel.js';
import { chooseFoePlays } from './warden.js';

/** The autopilot's turn: play affordable cards, best first, then end it.
    It prefers the suit already chaining, so the scenes show the chain
    mechanic working the way a real player would use it. */
function autopilotTurn(duel, side, maxPlays = 3) {
  for (let n = 0; n < maxPlays; n++) {
    const affordable = side.hand.filter((c) => c.cost <= side.starlight);
    if (affordable.length === 0) break;
    affordable.sort((a, b) => {
      const aChain = side.chainSuit === a.suit ? 1 : 0;
      const bChain = side.chainSuit === b.suit ? 1 : 0;
      if (aChain !== bChain) return bChain - aChain;
      return (b.effects[0]?.amount ?? 0) - (a.effects[0]?.amount ?? 0);
    });
    if (!playCard(duel, side, affordable[0].uid)) break;
    if (duel.phase !== 'playing') return;
  }
}

/** Run `turns` full rounds (player turn + foe turn) through the real engine. */
function playRounds(duel, turns) {
  for (let t = 0; t < turns; t++) {
    if (duel.phase !== 'playing') return;
    autopilotTurn(duel, duel.player);
    if (duel.phase !== 'playing') return;
    endPlayerTurn(duel);
    const plays = chooseFoePlays(duel);
    for (const uid of plays) {
      playCard(duel, duel.foe, uid);
      if (duel.phase !== 'playing') return;
    }
    nextTurn(duel);
  }
}

/**
 * Build the duel for the named scene and return it. `seed` fixes the
 * shuffle, so the same address always photographs the same table.
 */
export function stageShot(name, seed = 7) {
  const random = mulberry32(seed);
  const duel = createDuel(random);
  if (name === 'title') return duel;

  dealOpeningHands(duel);
  finishMulligan(duel);

  if (name === 'win' || name === 'loss') {
    playRounds(duel, 4);
    if (duel.phase === 'playing') {
      if (name === 'win') {
        applyDamage(duel, duel.foe, 99, 'card');
        checkEnd(duel);
      } else {
        applyDamage(duel, duel.player, 99, 'card');
        checkEnd(duel);
      }
    }
    return duel;
  }

  // The play scene: a mid-duel table, several turns in, both sides bloodied.
  // The player opens the turn with two chained cards, then the frame is
  // taken with starlight full so the hand reads as playable.
  playRounds(duel, 3);
  if (duel.phase === 'playing') {
    autopilotTurn(duel, duel.player, 2);
    duel.player.starlight = duel.player.starlightMax;
  }
  return duel;
}
