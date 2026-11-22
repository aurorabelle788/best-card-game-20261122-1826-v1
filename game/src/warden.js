// Starfall Court — the Umbral Warden's decisions.
// The foe reads the table: it guards when hurt, mends when low, hunts
// lethal when it can end the duel, builds chains when the suit lines up,
// and otherwise spends its starlight on the best damage-per-starlight it
// holds. It never plays more than 3 cards a turn, so its turns stay
// readable — and counterable. It also announces its intent, so the
// player can read it and answer.

import { canPlay, MAX_LIFE } from './duel.js';
import { sumEffect } from './deck.js';

const MAX_PLAYS_PER_TURN = 3;

/** Pick the foe's plays for this turn, in order. Pure: reads the duel only. */
export function chooseFoePlays(duel) {
  const foe = duel.foe;
  const player = duel.player;
  const plays = [];
  let starlight = foe.starlight;
  let foeLife = foe.life;
  let foeShield = foe.shield;
  let playerLife = player.life;
  let playerShield = player.shield;
  let chainSuit = null;
  let chain = 0;
  const hand = [...foe.hand];

  for (let n = 0; n < MAX_PLAYS_PER_TURN; n++) {
    let best = null;
    let bestScore = 0;
    for (const card of hand) {
      if (card.cost > starlight) continue;
      const score = scoreCard(card, { foeLife, foeShield, playerLife, playerShield, starlight, chainSuit, chain });
      if (score > bestScore) {
        bestScore = score;
        best = card;
      }
    }
    if (!best) break;
    plays.push(best.uid);
    starlight -= best.cost;
    hand.splice(hand.indexOf(best), 1);
    if (chainSuit === best.suit) chain += 1;
    else { chainSuit = best.suit; chain = 0; }
    const bonus = chain;
    // Apply the card's rough outcome so the next pick reads the new table.
    for (const effect of best.effects) {
      const amount = effect.amount + (bonus > 0 ? bonus : 0);
      if (effect.type === 'damage') {
        const blocked = Math.min(playerShield, amount);
        playerShield -= blocked;
        playerLife -= amount - blocked;
      } else if (effect.type === 'pierce' || effect.type === 'leech') {
        playerLife -= amount;
        if (effect.type === 'leech') foeLife = Math.min(MAX_LIFE, foeLife + Math.floor(amount / 2));
      } else if (effect.type === 'heal') {
        foeLife = Math.min(MAX_LIFE, foeLife + amount);
      } else if (effect.type === 'shield') {
        foeShield += amount;
      }
    }
    if (playerLife <= 0) break; // lethal found: stop and take it
  }
  return plays;
}

/** A one-line read on what the foe is about to do, shown before its turn. */
export function foeIntent(duel) {
  const plays = chooseFoePlays(duel);
  if (plays.length === 0) return 'The Warden holds its cards close…';
  const foe = duel.foe;
  const cards = plays.map((uid) => foe.hand.find((c) => c.uid === uid)).filter(Boolean);
  const damage = cards.reduce((n, c) => n + sumEffect(c, 'damage') + sumEffect(c, 'pierce') + sumEffect(c, 'leech'), 0);
  const shield = cards.reduce((n, c) => n + sumEffect(c, 'shield'), 0);
  const heal = cards.reduce((n, c) => n + sumEffect(c, 'heal'), 0);
  if (duel.player.life - damage <= 0 && damage > 0) return '⚔ The Warden smells blood — a killing blow is coming!';
  if (heal >= 6) return '✦ The Warden steadies itself and mends its wounds.';
  if (shield >= 7 && damage <= 3) return '🛡 The Warden raises a wall of thorns.';
  if (damage >= 8) return '⚔ The Warden gathers a heavy strike…';
  if (cards.some((c) => sumEffect(c, 'draw') > 0)) return '☾ The Warden schemes, drawing deeper into its deck.';
  return 'The Warden weighs its hand…';
}

function scoreCard(card, table) {
  const damage = sumEffect(card, 'damage') + sumEffect(card, 'pierce') + sumEffect(card, 'leech');
  const shield = sumEffect(card, 'shield');
  const heal = sumEffect(card, 'heal');
  const draw = sumEffect(card, 'draw');
  const pierce = sumEffect(card, 'pierce');

  // Lethal: any card that ends the duel beats every other consideration.
  const blocked = Math.min(table.playerShield, damage - pierce);
  const afterShield = Math.max(0, damage - pierce - blocked);
  if (table.playerLife - afterShield - pierce <= 0 && damage > 0) return 1000;

  let score = 0;
  // Damage is worth more the closer the player is to falling.
  score += damage * (table.playerLife <= 8 ? 3 : 2);
  score += pierce * 1.5; // piercing damage cannot be blocked
  // A hurt warden guards and mends first.
  if (table.foeLife <= 12) {
    score += shield * 2.5;
    score += heal * 3;
  } else if (table.foeLife <= 20) {
    score += shield * 1.2;
    score += heal * 1.5;
  } else {
    score += shield * 0.5;
    score += heal * 0.4;
  }
  score += draw * 1.5;
  // Chaining the same suit pays: a card that continues the chain is worth more.
  if (table.chainSuit === card.suit) score += 2.5;
  // Prefer cheap cards when starlight is tight, so the turn does not stall.
  score -= card.cost * 0.4;
  return score;
}

/** Whether the foe still has a legal play (used to pace its turn). */
export function foeHasPlay(duel) {
  return duel.foe.hand.some((card) => canPlay(duel, duel.foe, card));
}
