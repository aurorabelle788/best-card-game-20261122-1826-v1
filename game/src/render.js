// Starfall Court — the title, the table and the end screens.
// Everything on screen is plain DOM: readable cards, life bars, the
// chain meter, the duel log, and the Warden's announced intent.

import { SUITS } from './deck.js';
import { duelStats, MAX_LIFE } from './duel.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function suitStyle(card) {
  const suit = SUITS[card.suit];
  return {
    '--suit-color': suit.color,
    '--suit-dark': suit.dark,
    '--suit-glow': suit.glow,
  };
}

/** One playable card face in the player's hand. */
export function cardElement(card, index, { playable, marked, onPlay, onMark }) {
  const button = el('button', 'play-card');
  const suit = SUITS[card.suit];
  for (const [key, value] of Object.entries(suitStyle(card))) {
    button.style.setProperty(key, value);
  }
  if (marked) button.classList.add('marked');
  button.disabled = !playable && !marked;
  button.setAttribute('aria-label', `${card.name}, ${suit.name}, cost ${card.cost}. ${card.text}`);

  const top = el('div', 'card-top');
  top.append(el('span', null, suit.name));
  const cost = el('span', 'cost-badge', String(card.cost));
  cost.title = 'Starlight cost';
  top.append(cost);
  button.append(top);
  button.append(el('div', 'card-glyph', suit.glyph));
  button.append(el('div', 'card-name', card.name));
  button.append(el('div', 'card-text', card.text));
  button.append(el('span', 'card-key', String(index + 1)));

  button.addEventListener('click', () => {
    if (onMark) onMark(card);
    else if (onPlay) onPlay(card);
  });
  return button;
}

/** A small read-only card face for the "last played" strip. */
function miniCard(card) {
  const box = el('div', 'mini-card');
  const suit = SUITS[card.suit];
  box.style.borderColor = suit.color;
  box.append(el('div', 'mini-name', `${suit.glyph} ${card.name}`));
  box.append(el('div', 'mini-text', card.text));
  return box;
}

function lifeBar(side) {
  const bar = el('div', 'life-bar');
  const fill = el('div', 'life-fill');
  fill.style.width = `${Math.max(0, Math.min(100, (side.life / MAX_LIFE) * 100))}%`;
  bar.append(fill);
  bar.append(el('div', 'life-text', `❤ ${Math.max(0, side.life)} / ${MAX_LIFE}`));
  return bar;
}

function wardenCard(side, sub) {
  const card = el('div', 'warden-card');
  card.append(el('div', 'warden-name', side.name));
  card.append(el('div', 'warden-sub', sub));
  card.append(lifeBar(side));
  const vitals = el('div', 'vitals');
  vitals.append(el('span', 'shield', `🛡 Shield ${side.shield}`));
  vitals.append(el('span', 'starlight', `✦ Starlight ${side.starlight}/${side.starlightMax}`));
  vitals.append(el('span', 'deck-count', `🂠 Deck ${side.deck.length}`));
  card.append(vitals);
  return card;
}

/** The title screen: the game, its rules and its four suits. */
export function renderTitle(root, onBegin) {
  root.innerHTML = '';
  const screen = el('div', 'title-screen');
  screen.append(el('div', 'title-kicker', 'A duel of falling stars'));
  screen.append(el('h1', null, 'STARFALL COURT'));
  screen.append(el('h2', null, 'Outwit the Umbral Warden — chain your suits, spend your starlight, take the court.'));

  const rules = el('div', 'title-rules');
  rules.innerHTML =
    '<b>How to play:</b> You and the Warden start at <b>30 life</b>. Each turn your starlight refills and grows. ' +
    'Click a card — or press <b>1–8</b> — to play it, <b>Space</b> ends your turn. ' +
    'Play two cards of the same suit in a row to build a <b>chain</b>: every link adds +1 to the next card. ' +
    'Before the first turn, swap up to <b>2 cards</b> from your opening hand. ' +
    'An empty deck costs 2 life a draw. First to 0 life loses.';
  screen.append(rules);

  const legend = el('div', 'suit-legend');
  for (const suit of Object.values(SUITS)) {
    const item = el('span');
    item.innerHTML = `<span class="glyph" style="color:${suit.color}">${suit.glyph}</span> ${suit.name}`;
    legend.append(item);
  }
  screen.append(legend);

  const play = el('button', 'hud-button', '▶  Begin the Duel');
  play.addEventListener('click', onBegin);
  screen.append(play);
  screen.append(el('div', 'title-hint', 'Enter begins · Mouse and keyboard · No account, no network — the game runs from its own files'));
  root.append(screen);
}

/** The mulligan banner above the player's hand, before turn 1. */
function mulliganBanner(duel, onBegin) {
  const banner = el('div', 'mulligan-banner');
  const left = 2 - duel.player.mulliganMarks.length;
  banner.textContent = left > 0
    ? `Opening hand — click up to ${left} more card${left === 1 ? '' : 's'} to swap ${left === 1 ? 'it' : 'them'}, then begin.`
    : 'Opening hand — 2 cards marked to swap. Begin when ready.';
  const begin = el('button', 'hud-button', 'Begin the Duel');
  begin.style.marginLeft = '16px';
  begin.addEventListener('click', onBegin);
  banner.append(begin);
  return banner;
}

/** The table: the Warden above, the log and chain in the middle, your hand below. */
export function renderTable(root, duel, handlers) {
  root.innerHTML = '';
  const screen = el('div', 'table-screen');

  // Top bar: title, turn, score.
  const top = el('div', 'top-bar');
  top.append(el('div', 'game-title', '✦ STARFALL COURT'));
  top.append(el('div', 'turn-pill', duel.phase === 'mulligan' ? 'Opening hand' : `Turn ${duel.turn} — ${duel.active === 'player' ? 'Your move' : 'The Warden plays…'}`));
  const score = el('div', 'score-pill');
  score.innerHTML = `Score <b>${duel.score}</b>`;
  top.append(score);
  screen.append(top);

  // Foe row: the Warden's card, its face-down hand, its announced intent.
  const foeRow = el('div', 'foe-row');
  foeRow.append(wardenCard(duel.foe, 'The Umbral Warden · your rival'));
  const foeHand = el('div', 'foe-hand');
  for (let i = 0; i < duel.foe.hand.length; i++) foeHand.append(el('div', 'card-back'));
  foeRow.append(foeHand);
  if (duel.phase === 'playing' && handlers.intent) {
    foeRow.append(el('div', 'intent-banner', handlers.intent));
  }
  screen.append(foeRow);

  // Last played strip.
  const played = el('div', 'last-played');
  played.append(el('div', 'played-label', 'Last played'));
  if (duel.player.lastPlayed) played.append(miniCard(duel.player.lastPlayed));
  if (duel.foe.lastPlayed) played.append(miniCard(duel.foe.lastPlayed));
  if (!duel.player.lastPlayed && !duel.foe.lastPlayed) {
    played.append(el('div', 'mini-card', 'No cards played yet — the court awaits.'));
  }
  const chain = el('div', 'chain-meter');
  const links = duel.player.chain > 0 ? '⛓'.repeat(Math.min(duel.player.chain, 5)) : '—';
  chain.innerHTML = `<div class="chain-links">${links}</div><div class="chain-note">Chain x${duel.player.chain} — same suit in a row adds +${duel.player.chain} next</div>`;
  played.append(chain);
  screen.append(played);

  // Middle row: the log and the end-turn button.
  const middle = el('div', 'middle-row');
  const log = el('div', 'duel-log');
  for (const line of duel.log) log.append(el('div', null, line));
  middle.append(log);
  const endWrap = el('div', 'end-turn-wrap');
  const endTurn = el('button', 'hud-button', 'End Turn ⏎');
  endTurn.disabled = duel.phase !== 'playing' || duel.active !== 'player';
  endTurn.addEventListener('click', handlers.onEndTurn);
  endWrap.append(endTurn);
  endWrap.append(el('div', 'keys-hint', '1–8 play · Space ends turn · Esc quits'));
  middle.append(endWrap);
  screen.append(middle);

  // Player row: your card and your hand.
  const playerRow = el('div', 'player-row');
  playerRow.append(wardenCard(duel.player, 'You · the Star Warden'));
  const hand = el('div', 'player-hand');
  duel.player.hand.forEach((card, index) => {
    const affordable = duel.phase === 'playing' && duel.active === 'player' && duel.player.starlight >= card.cost;
    const marked = duel.player.mulliganMarks.includes(card.uid);
    hand.append(cardElement(card, index, {
      playable: affordable,
      marked,
      onPlay: duel.phase === 'mulligan' ? undefined : handlers.onPlayCard,
      onMark: duel.phase === 'mulligan' ? handlers.onMarkCard : undefined,
    }));
  });
  if (duel.player.hand.length === 0) {
    hand.append(el('div', 'mini-card', 'Your hand is empty — end the turn to draw.'));
  }
  playerRow.append(hand);
  screen.append(playerRow);

  if (duel.phase === 'mulligan') {
    screen.append(mulliganBanner(duel, handlers.onBeginDuel));
  }

  root.append(screen);
}

/** The win and loss screens, with the duel's stats. */
export function renderEnd(root, duel, onRestart) {
  root.innerHTML = '';
  const won = duel.winner === 'player';
  const screen = el('div', won ? 'end-screen win' : 'end-screen loss');
  screen.append(el('h1', null, won ? '★ VICTORY ★' : '✦ DEFEAT ✦'));
  screen.append(el('h2', null, won
    ? 'The Umbral Warden falls. The court is yours, Star Warden.'
    : 'The stars go out. The Warden keeps the court — this time.'));

  const stats = duelStats(duel);
  const statBox = el('div', 'end-stats');
  const statItems = [
    ['Score', stats.score],
    ['Turns', stats.turns],
    ['Cards played', stats.cardsPlayed],
    ['Damage dealt', stats.damageDealt],
    ['Chains built', stats.chainsBuilt],
    ['Life left', stats.lifeLeft],
  ];
  for (const [label, value] of statItems) {
    const stat = el('div', 'stat');
    stat.append(el('div', 'stat-value', String(value)));
    stat.append(el('div', 'stat-label', label));
    statBox.append(stat);
  }
  screen.append(statBox);

  const again = el('button', 'hud-button', '↻  Play Again');
  again.addEventListener('click', onRestart);
  screen.append(again);
  screen.append(el('div', 'title-hint', 'Enter plays again · Esc returns to the title'));
  root.append(screen);
}

/** Floating combat text over the table. */
export function floatText(root, text, kind) {
  const node = el('div', `float-text ${kind}`, text);
  node.style.left = `${38 + Math.random() * 24}%`;
  node.style.top = '34%';
  root.append(node);
  window.setTimeout(() => node.remove(), 1150);
}

/** A short shake of the table on a heavy hit. */
export function shakeTable(root) {
  const table = root.querySelector('.table-screen');
  if (!table) return;
  table.classList.remove('shake');
  void table.offsetWidth;
  table.classList.add('shake');
}
