// Starfall Court — suits, cards and decks.
// Four suits, told apart by colour AND glyph, never by text alone.
// Sun strikes, Moon draws and outwits, Tide mends, Thorn guards and bites.

export const SUITS = {
  sun: { name: 'Sun', glyph: '☀', color: '#f2b705', dark: '#6b4d05', glow: 'rgba(242,183,5,0.55)' },
  moon: { name: 'Moon', glyph: '☾', color: '#9b7ede', dark: '#3d2a6b', glow: 'rgba(155,126,222,0.55)' },
  tide: { name: 'Tide', glyph: '💧', color: '#3e9bff', dark: '#123a6b', glow: 'rgba(62,155,255,0.55)' },
  thorn: { name: 'Thorn', glyph: '🌿', color: '#46a758', dark: '#1d4d2a', glow: 'rgba(70,167,88,0.55)' },
};

// Effect types:
//   damage — hurt the other side (shield absorbs it first)
//   pierce — damage that ignores shield entirely
//   shield — block incoming damage
//   heal   — restore life, never above the maximum
//   draw   — pull cards from the deck
//   leech  — damage, then heal yourself for half of it (rounded down)
export const CARD_DEFS = [
  {
    id: 'sunflare', name: 'Sunflare', suit: 'sun', cost: 2,
    effects: [{ type: 'damage', amount: 4 }],
    text: 'Deal 4 damage.',
  },
  {
    id: 'solar-lance', name: 'Solar Lance', suit: 'sun', cost: 3,
    effects: [{ type: 'pierce', amount: 3 }],
    text: 'Deal 3 damage, ignoring shield.',
  },
  {
    id: 'dawn-chorus', name: 'Dawn Chorus', suit: 'sun', cost: 4,
    effects: [{ type: 'damage', amount: 5 }, { type: 'draw', amount: 1 }],
    text: 'Deal 5 damage. Draw a card.',
  },
  {
    id: 'eclipse', name: 'Eclipse', suit: 'sun', cost: 5,
    effects: [{ type: 'damage', amount: 8 }, { type: 'leech', amount: 4 }],
    text: 'Deal 8 damage. Drain 4 life.',
  },
  {
    id: 'moonlit-scheme', name: 'Moonlit Scheme', suit: 'moon', cost: 1,
    effects: [{ type: 'draw', amount: 2 }],
    text: 'Draw 2 cards.',
  },
  {
    id: 'lunatic-gambit', name: 'Lunatic Gambit', suit: 'moon', cost: 2,
    effects: [{ type: 'damage', amount: 2 }, { type: 'draw', amount: 1 }],
    text: 'Deal 2 damage. Draw a card.',
  },
  {
    id: 'silver-mirror', name: 'Silver Mirror', suit: 'moon', cost: 3,
    effects: [{ type: 'shield', amount: 5 }, { type: 'draw', amount: 1 }],
    text: 'Gain 5 shield. Draw a card.',
  },
  {
    id: 'night-tithe', name: 'Night Tithe', suit: 'moon', cost: 4,
    effects: [{ type: 'leech', amount: 6 }],
    text: 'Drain 6 life.',
  },
  {
    id: 'tide-mend', name: 'Tide Mend', suit: 'tide', cost: 2,
    effects: [{ type: 'heal', amount: 6 }],
    text: 'Restore 6 life.',
  },
  {
    id: 'deep-current', name: 'Deep Current', suit: 'tide', cost: 2,
    effects: [{ type: 'draw', amount: 1 }, { type: 'heal', amount: 3 }],
    text: 'Draw a card. Restore 3 life.',
  },
  {
    id: 'undertow', name: 'Undertow', suit: 'tide', cost: 3,
    effects: [{ type: 'damage', amount: 3 }, { type: 'shield', amount: 4 }],
    text: 'Deal 3 damage. Gain 4 shield.',
  },
  {
    id: 'spring-surge', name: 'Spring Surge', suit: 'tide', cost: 4,
    effects: [{ type: 'heal', amount: 9 }, { type: 'shield', amount: 3 }],
    text: 'Restore 9 life. Gain 3 shield.',
  },
  {
    id: 'thornwall', name: 'Thornwall', suit: 'thorn', cost: 2,
    effects: [{ type: 'shield', amount: 7 }],
    text: 'Gain 7 shield.',
  },
  {
    id: 'bramble-snare', name: 'Bramble Snare', suit: 'thorn', cost: 3,
    effects: [{ type: 'damage', amount: 3 }, { type: 'shield', amount: 4 }],
    text: 'Deal 3 damage. Gain 4 shield.',
  },
  {
    id: 'root-drink', name: 'Root Drink', suit: 'thorn', cost: 3,
    effects: [{ type: 'leech', amount: 4 }],
    text: 'Drain 4 life.',
  },
  {
    id: 'ironwood-maul', name: 'Ironwood Maul', suit: 'thorn', cost: 5,
    effects: [{ type: 'damage', amount: 9 }],
    text: 'Deal 9 damage.',
  },
];

export const DECK_SIZE = 32;
export const HAND_LIMIT = 8;
export const STARTING_HAND = 5;
export const MULLIGAN_LIMIT = 2;

/** Deterministic RNG (mulberry32) so a ?seed= address always deals the same game. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh shuffled deck: two copies of every card, Fisher-Yates shuffled. */
export function buildDeck(random = Math.random) {
  const deck = [];
  for (const def of CARD_DEFS) {
    deck.push({ ...def, uid: `${def.id}-a` });
    deck.push({ ...def, uid: `${def.id}-b` });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** The chain bonus: +1 to a card's combat numbers for each link already in the chain. */
export function chainBonus(chain) {
  return chain;
}

/** A card's effects with the chain bonus folded into its combat numbers. */
export function resolvedEffects(card, chain) {
  const bonus = chainBonus(chain);
  return card.effects.map((e) => {
    if (bonus > 0 && (e.type === 'damage' || e.type === 'pierce' || e.type === 'heal' || e.type === 'shield' || e.type === 'leech')) {
      return { ...e, amount: e.amount + bonus, chained: true };
    }
    return { ...e, chained: false };
  });
}

/** Sum of one effect type on a card, for the AI's arithmetic. */
export function sumEffect(card, type) {
  return card.effects.filter((e) => e.type === type).reduce((n, e) => n + e.amount, 0);
}
