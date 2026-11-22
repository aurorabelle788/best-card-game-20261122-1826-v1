// Starfall Court — duel state, turn flow and combat resolution.
// One duel: you, the Star Warden, against the Umbral Warden. Both start at
// 30 life. Starlight refills every turn and grows by 1 per turn up to 10.
// Chain: playing two cards of the same suit in a row builds a chain, and
// every link adds +1 to the next card's combat numbers. Break the chain
// by playing another suit — or cash it in with a heavy card.

import { buildDeck, resolvedEffects, HAND_LIMIT, STARTING_HAND, MULLIGAN_LIMIT } from './deck.js';

export const MAX_LIFE = 30;
export const MAX_STARLIGHT = 10;
export const FATIGUE_DAMAGE = 2;

/** A fresh duel state, before the first deal. `random` seeds the shuffle. */
export function createDuel(random = Math.random) {
  return {
    phase: 'title', // title | mulligan | playing | over
    turn: 0,
    active: 'player',
    winner: null,
    log: [],
    score: 0,
    cardsPlayed: 0,
    damageDealt: 0,
    chainsBuilt: 0,
    mulliganed: 0,
    player: newSide('Star Warden', true, random),
    foe: newSide('Umbral Warden', false, random),
  };
}

function newSide(name, isPlayer, random) {
  return {
    name,
    isPlayer,
    life: MAX_LIFE,
    shield: 0,
    starlight: 0,
    starlightMax: 0,
    deck: buildDeck(random),
    hand: [],
    discard: [],
    chainSuit: null,
    chain: 0,
    lastPlayed: null,
    mulliganMarks: [],
  };
}

/** Deal the opening hands. The player then mulligans before turn 1. */
export function dealOpeningHands(duel) {
  duel.phase = 'mulligan';
  for (let i = 0; i < STARTING_HAND; i++) {
    drawCard(duel, duel.player);
    drawCard(duel, duel.foe);
  }
  // The Warden quietly swaps its most expensive cards.
  mulliganFoe(duel);
  addLog(duel, 'The Umbral Warden shuffles its hand. Choose up to 2 cards to swap, then begin.');
  return duel;
}

function mulliganFoe(duel) {
  const foe = duel.foe;
  const swap = foe.hand
    .filter((c) => c.cost >= 4)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, MULLIGAN_LIMIT);
  for (const card of swap) {
    const idx = foe.hand.indexOf(card);
    if (idx >= 0) {
      foe.hand.splice(idx, 1);
      foe.deck.unshift(card);
      drawCard(duel, foe);
    }
  }
}

/** Mark or unmark one of the player's cards for the mulligan. */
export function toggleMulligan(duel, cardUid) {
  if (duel.phase !== 'mulligan') return false;
  const marks = duel.player.mulliganMarks;
  const at = marks.indexOf(cardUid);
  if (at >= 0) {
    marks.splice(at, 1);
    return true;
  }
  if (marks.length >= MULLIGAN_LIMIT) return false;
  marks.push(cardUid);
  return true;
}

/** Swap the marked cards and start turn 1. */
export function finishMulligan(duel) {
  if (duel.phase !== 'mulligan') return false;
  const player = duel.player;
  duel.mulliganed = player.mulliganMarks.length;
  for (const uid of player.mulliganMarks) {
    const idx = player.hand.findIndex((c) => c.uid === uid);
    if (idx >= 0) {
      const [card] = player.hand.splice(idx, 1);
      player.deck.unshift(card);
      drawCard(duel, player);
    }
  }
  player.mulliganMarks = [];
  duel.phase = 'playing';
  duel.turn = 1;
  duel.active = 'player';
  beginTurn(duel, player);
  addLog(duel, 'The duel begins. Your move, Warden.');
  return true;
}

/** Starlight for turn n: 3 on turn 1, +1 each turn, capped at 10. */
export function starlightForTurn(turn) {
  return Math.min(3 + (turn - 1), MAX_STARLIGHT);
}

function beginTurn(duel, side) {
  side.starlightMax = starlightForTurn(duel.turn);
  side.starlight = side.starlightMax;
  side.chainSuit = null;
  side.chain = 0;
  drawCard(duel, side);
}

/** Draw one card; an empty deck costs 2 life (fatigue). */
export function drawCard(duel, side) {
  if (side.hand.length >= HAND_LIMIT) return null;
  const card = side.deck.pop();
  if (!card) {
    applyDamage(duel, side, FATIGUE_DAMAGE, 'fatigue');
    addLog(duel, `${side.name} draws from an empty deck and takes ${FATIGUE_DAMAGE} fatigue.`);
    return null;
  }
  side.hand.push(card);
  return card;
}

/** Whether a side can afford a card right now. */
export function canPlay(duel, side, card) {
  return duel.phase === 'playing' && duel.active === (side.isPlayer ? 'player' : 'foe') && side.starlight >= card.cost;
}

/** Play a card from a side's hand. Returns false when the play is illegal. */
export function playCard(duel, side, cardUid) {
  const idx = side.hand.findIndex((c) => c.uid === cardUid);
  if (idx < 0) return false;
  const card = side.hand[idx];
  if (!canPlay(duel, side, card)) return false;
  const other = side.isPlayer ? duel.foe : duel.player;

  // Chain: same suit as the last card played this turn extends the chain.
  const chained = side.chainSuit === card.suit;
  if (chained) {
    side.chain += 1;
    if (side.isPlayer) duel.chainsBuilt += 1;
  } else {
    side.chainSuit = card.suit;
    side.chain = 0;
  }
  const effects = resolvedEffects(card, side.chain);
  const boosted = effects.some((e) => e.chained);

  side.starlight -= card.cost;
  side.hand.splice(idx, 1);
  side.discard.push(card);
  side.lastPlayed = card;
  duel.cardsPlayed += 1;
  if (side.isPlayer) duel.score += 5;
  for (const effect of effects) {
    applyEffect(duel, side, other, effect);
  }
  addLog(
    duel,
    `${side.name} plays ${card.name}${boosted ? ` — CHAIN x${side.chain}! +${side.chain}` : ''}.`,
  );
  checkEnd(duel);
  return true;
}

function applyEffect(duel, side, other, effect) {
  if (effect.type === 'damage') {
    applyDamage(duel, other, effect.amount, 'card');
    if (side.isPlayer) {
      duel.damageDealt += effect.amount;
      duel.score += effect.amount;
    }
  } else if (effect.type === 'pierce') {
    other.life -= effect.amount;
    addLog(duel, `${other.name} takes ${effect.amount} piercing damage.`);
    if (side.isPlayer) {
      duel.damageDealt += effect.amount;
      duel.score += effect.amount;
    }
  } else if (effect.type === 'leech') {
    applyDamage(duel, other, effect.amount, 'card');
    const drained = Math.floor(effect.amount / 2);
    side.life = Math.min(MAX_LIFE, side.life + drained);
    if (side.isPlayer) {
      duel.damageDealt += effect.amount;
      duel.score += effect.amount;
    }
  } else if (effect.type === 'shield') {
    side.shield += effect.amount;
  } else if (effect.type === 'heal') {
    side.life = Math.min(MAX_LIFE, side.life + effect.amount);
  } else if (effect.type === 'draw') {
    for (let i = 0; i < effect.amount; i++) drawCard(duel, side);
  }
}

/** Damage first eats shield, then life. */
export function applyDamage(duel, side, amount, source) {
  let left = amount;
  if (side.shield > 0) {
    const blocked = Math.min(side.shield, left);
    side.shield -= blocked;
    left -= blocked;
  }
  side.life -= left;
  if (source === 'card') addLog(duel, `${side.name} takes ${amount} damage.`);
  return left;
}

/** End the player's turn: the foe refills starlight, draws, and takes the table. */
export function endPlayerTurn(duel) {
  if (duel.phase !== 'playing' || duel.active !== 'player') return false;
  duel.active = 'foe';
  beginTurn(duel, duel.foe);
  addLog(duel, 'The Umbral Warden takes the table.');
  return true;
}

/** Start the next player turn after the foe has acted. */
export function nextTurn(duel) {
  duel.turn += 1;
  duel.active = 'player';
  beginTurn(duel, duel.player);
  addLog(duel, `Turn ${duel.turn}. Starlight refills to ${duel.player.starlightMax}.`);
  checkEnd(duel);
}

/** Whether the duel has ended, and finish it when a side hits 0 life. */
export function checkEnd(duel) {
  if (duel.phase !== 'playing') return;
  if (duel.foe.life <= 0 && duel.player.life <= 0) {
    finishDuel(duel, duel.player.life >= duel.foe.life ? 'player' : 'foe');
  } else if (duel.foe.life <= 0) {
    finishDuel(duel, 'player');
  } else if (duel.player.life <= 0) {
    finishDuel(duel, 'foe');
  }
}

function finishDuel(duel, winner) {
  duel.phase = 'over';
  duel.winner = winner;
  if (winner === 'player') {
    duel.score += 50 + Math.max(0, duel.player.life) * 2;
    addLog(duel, `Victory! The Umbral Warden falls. Score ${duel.score}.`);
  } else {
    addLog(duel, 'Defeat. The stars go out.');
  }
}

function addLog(duel, text) {
  duel.log.unshift(text);
  if (duel.log.length > 6) duel.log.length = 6;
}

/** Stats for the end screens. */
export function duelStats(duel) {
  return {
    turns: duel.turn,
    cardsPlayed: duel.cardsPlayed,
    damageDealt: duel.damageDealt,
    chainsBuilt: duel.chainsBuilt,
    score: duel.score,
    lifeLeft: Math.max(0, duel.player.life),
  };
}
