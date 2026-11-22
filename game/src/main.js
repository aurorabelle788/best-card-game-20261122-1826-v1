// Starfall Court — boot, input wiring and screen flow.
// The game runs from this file: title → mulligan → table → win/loss.
// Mouse and keyboard both play it. A ?shot=title|play|win|loss address
// opens the game already in that state, so its maker can photograph each
// screen; the screens are the same ones real play reaches.

import { createDuel, dealOpeningHands, toggleMulligan, finishMulligan, playCard, endPlayerTurn, nextTurn } from './duel.js';
import { chooseFoePlays, foeIntent } from './warden.js';
import { renderTitle, renderTable, renderEnd, floatText, shakeTable } from './render.js';
import { stageShot } from './shots.js';
import { unlockAudio, playClick, playCardSound, playChainSound, playDamageSound, playHealSound, playTurnSound, playWinSound, playLoseSound } from './sound.js';

const root = document.getElementById('app');
let duel = createDuel();
let intent = '';

/** Re-render the screen the duel is on. */
function show() {
  if (duel.phase === 'mulligan') {
    renderTable(root, duel, { onMarkCard, onBeginDuel, onPlayCard, onEndTurn, intent });
  } else if (duel.phase === 'playing') {
    renderTable(root, duel, { onMarkCard, onBeginDuel, onPlayCard, onEndTurn, intent });
  } else if (duel.phase === 'over') {
    renderEnd(root, duel, restart);
    if (duel.winner === 'player') playWinSound();
    else playLoseSound();
  } else {
    renderTitle(root, beginDuel);
  }
}

function beginDuel() {
  unlockAudio();
  playClick();
  duel = createDuel();
  dealOpeningHands(duel);
  intent = '';
  show();
}

function restart() {
  unlockAudio();
  playClick();
  duel = createDuel();
  show();
}

function onBeginDuel() {
  unlockAudio();
  playClick();
  finishMulligan(duel);
  intent = foeIntent(duel);
  show();
}

function onMarkCard(card) {
  unlockAudio();
  toggleMulligan(duel, card.uid);
  playClick();
  show();
}

/** A click on one of your cards. */
function onPlayCard(card) {
  if (duel.phase !== 'playing' || duel.active !== 'player') return;
  unlockAudio();
  const foeLifeBefore = duel.foe.life;
  const foeShieldBefore = duel.foe.shield;
  const chainBefore = duel.player.chain;
  const played = playCard(duel, duel.player, card.uid);
  if (!played) return;
  if (duel.player.chain > chainBefore) playChainSound();
  else playCardSound();
  if (duel.foe.life < foeLifeBefore || duel.foe.shield < foeShieldBefore) {
    const dealt = (foeLifeBefore + foeShieldBefore) - (duel.foe.life + duel.foe.shield);
    floatText(root, `-${Math.max(1, dealt)}`, 'damage');
    playDamageSound();
    if (dealt >= 7) shakeTable(root);
  }
  show();
}

/** End your turn: the Warden plays its cards one by one, then you draw. */
function onEndTurn() {
  if (!endPlayerTurn(duel)) return;
  unlockAudio();
  playTurnSound();
  intent = foeIntent(duel);
  show();
  const plays = chooseFoePlays(duel);
  let step = 0;
  const stepDelay = 700;
  const playNext = () => {
    if (duel.phase !== 'playing') {
      show();
      return;
    }
    if (step < plays.length) {
      const uid = plays[step];
      const card = duel.foe.hand.find((c) => c.uid === uid);
      const lifeBefore = duel.player.life;
      const shieldBefore = duel.player.shield;
      if (card) playCard(duel, duel.foe, uid);
      if (duel.player.life < lifeBefore || duel.player.shield < shieldBefore) {
        const dealt = (lifeBefore + shieldBefore) - (duel.player.life + duel.player.shield);
        floatText(root, `-${Math.max(1, dealt)}`, 'damage');
        playDamageSound();
        if (dealt >= 7) shakeTable(root);
      } else if (card) {
        playHealSound();
      }
      step += 1;
      show();
      window.setTimeout(playNext, stepDelay);
    } else {
      nextTurn(duel);
      intent = foeIntent(duel);
      playTurnSound();
      show();
    }
  };
  window.setTimeout(playNext, stepDelay);
}

/** Keyboard: 1–8 play a card, Space/Enter ends the turn, Esc goes to title. */
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    duel = createDuel();
    show();
    return;
  }
  if (duel.phase === 'mulligan') {
    if (event.key >= '1' && event.key <= '8') {
      const card = duel.player.hand[Number(event.key) - 1];
      if (card) onMarkCard(card);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onBeginDuel();
    }
    return;
  }
  if (duel.phase === 'playing') {
    if (event.key >= '1' && event.key <= '8') {
      const card = duel.player.hand[Number(event.key) - 1];
      if (card) onPlayCard(card);
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onEndTurn();
    }
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    if (duel.phase === 'over') restart();
    else beginDuel();
  }
});

// The ?shot= address opens one screen directly, for screenshots.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') ?? 7) || 7;
if (shot === 'play' || shot === 'win' || shot === 'loss') {
  duel = stageShot(shot, seed);
  if (duel.phase === 'playing') intent = foeIntent(duel);
} else if (shot === 'title') {
  duel = stageShot('title', seed);
}
show();

// A handle for the maker's browser automation and for curious players.
window.StarfallCourt = { get duel() { return duel; }, beginDuel, restart, onPlayCard, onEndTurn };
