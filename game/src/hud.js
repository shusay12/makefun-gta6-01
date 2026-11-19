// Everything drawn over the world: cash and wanted stars, health and car
// condition, the objective panel, dialogue and toasts, plus the title,
// pause, busted and wasted screens.

import { G } from './state.js';
import { respectTitle } from './config.js';
import { CAR_TYPES } from './vehicles.js';
import { currentObjective, STORY } from './missions.js';
import { drawMinimap } from './minimap.js';
import { distance } from './random.js';

function panel(ctx, x, y, w, h, alpha = 0.55) {
  ctx.fillStyle = `rgba(13,24,30,${alpha})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
}

function star(ctx, cx, cy, r, filled) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const a2 = a + Math.PI / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = '#ffc93c';
    ctx.fill();
  }
  ctx.strokeStyle = filled ? '#a87e14' : 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

export function drawHUD(ctx, W, H) {
  const p = G.player;

  // Cash and standing, top-left.
  panel(ctx, 14, 14, 208, 58);
  ctx.fillStyle = '#ffc93c';
  ctx.font = 'bold 25px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${G.cash.toLocaleString('en-US')}`, 26, 43);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '12.5px system-ui, sans-serif';
  const storyLabel = G.missionIndex >= STORY.length
    ? 'Story complete — Errand Board open'
    : `Story ${Math.min(G.missionIndex + 1, STORY.length)}/${STORY.length} · ${respectTitle(G.lifetimeCash)}`;
  ctx.fillText(storyLabel, 26, 63);

  // Wanted stars, top-right.
  const flash = G.wanted > 0 && Math.floor(G.time * 2.4) % 2 === 0;
  for (let i = 0; i < 5; i++) {
    star(ctx, W - 34 - (4 - i) * 34, 34, 13, i < G.wanted);
  }
  if (G.wanted > 0) {
    ctx.fillStyle = flash ? '#e63946' : 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('PALMARIS PD', W - 16, 62);
  }
  // Bust meter under the stars.
  if (p.bustMeter > 0.05) {
    const limit = p.car ? 2.5 : 1.5;
    const frac = Math.min(1, p.bustMeter / limit);
    ctx.fillStyle = 'rgba(13,24,30,0.6)';
    ctx.fillRect(W - 186, 70, 170, 13);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(W - 186, 70, 170 * frac, 13);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUSTED', W - 101, 80);
  }

  drawMinimap(ctx, W - 204, 92, 190, 142);

  // Objective, top-centre.
  const obj = currentObjective();
  if (obj && G.mode === 'play') {
    const dist = obj.x !== null && obj.x !== undefined
      ? Math.round(distance(p.x, p.y, obj.x, obj.y) / 4)
      : null;
    const title = obj.title || '';
    const text = obj.text + (dist !== null ? ` · ${dist} m` : '');
    ctx.font = 'bold 13px system-ui, sans-serif';
    const wTitle = ctx.measureText(title.toUpperCase()).width;
    ctx.font = '14.5px system-ui, sans-serif';
    const wText = ctx.measureText(text).width;
    const w = Math.max(wTitle, wText) + 36;
    panel(ctx, (W - w) / 2, 14, w, 52, 0.5);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffc93c';
    ctx.font = 'bold 11.5px system-ui, sans-serif';
    ctx.fillText(title.toUpperCase(), W / 2, 33);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14.5px system-ui, sans-serif';
    ctx.fillText(text, W / 2, 55);
  }

  // Toast (mission complete, payouts).
  if (G.toast && G.time < G.toast.until) {
    const remain = G.toast.until - G.time;
    ctx.save();
    ctx.globalAlpha = Math.min(1, remain / 0.8);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffc93c';
    ctx.font = 'bold 27px system-ui, sans-serif';
    ctx.fillText(G.toast.text, W / 2, 118);
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(G.toast.sub, W / 2, 142);
    ctx.restore();
  }

  // Health and vehicle state, bottom-left.
  panel(ctx, 14, H - 66, 216, 52);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 10.5px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('HEALTH', 26, H - 46);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(26, H - 40, 190, 9);
  ctx.fillStyle = p.health > 30 ? '#2ec4b6' : '#e63946';
  ctx.fillRect(26, H - 40, 190 * Math.max(0, p.health / 100), 9);
  if (p.car) {
    const def = CAR_TYPES[p.car.type];
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(def.name.toUpperCase(), 26, H - 20);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(110, H - 27, 106, 8);
    ctx.fillStyle = p.car.hp > p.car.maxHp * 0.35 ? '#ffc93c' : '#e63946';
    ctx.fillRect(110, H - 27, 106 * Math.max(0, p.car.hp / p.car.maxHp), 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(Math.abs(p.car.speed) * 0.62)} km/h`, 224, H - 20 + 0.1);
  }

  // Context prompt, bottom-centre.
  if (G.prompt && G.mode === 'play') {
    ctx.font = 'bold 15px system-ui, sans-serif';
    const w = ctx.measureText(G.prompt).width + 30;
    panel(ctx, (W - w) / 2, H - 108, w, 30, 0.6);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(G.prompt, W / 2, H - 88);
  }

  // Dialogue bar.
  if (G.dialogue && G.time < G.dialogue.until) {
    panel(ctx, W / 2 - 330, H - 62, 660, 48, 0.68);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffc93c';
    ctx.font = 'bold 12.5px system-ui, sans-serif';
    ctx.fillText(G.dialogue.speaker.toUpperCase(), W / 2 - 314, H - 42);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(G.dialogue.text, W / 2 - 314, H - 22, 628);
  }

  // Controls reminder, bottom-right, early on (never over dialogue).
  const dialogueShowing = G.dialogue && G.time < G.dialogue.until;
  if (G.playTime < 26 && G.mode === 'play' && !dialogueShowing) {
    ctx.fillStyle = 'rgba(255,255,255,0.66)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('WASD drive · E enter/exit car · SHIFT sprint · SPACE handbrake · MOUSE aim + click shoot · P pause', W - 16, H - 18);
  }

  // Crosshair when armed on foot.
  if (!p.car && G.mode === 'play') {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(G.mouse.x, G.mouse.y, 9, 0, Math.PI * 2);
    ctx.moveTo(G.mouse.x - 14, G.mouse.y);
    ctx.lineTo(G.mouse.x - 5, G.mouse.y);
    ctx.moveTo(G.mouse.x + 5, G.mouse.y);
    ctx.lineTo(G.mouse.x + 14, G.mouse.y);
    ctx.moveTo(G.mouse.x, G.mouse.y - 14);
    ctx.lineTo(G.mouse.x, G.mouse.y - 5);
    ctx.moveTo(G.mouse.x, G.mouse.y + 5);
    ctx.lineTo(G.mouse.x, G.mouse.y + 14);
    ctx.stroke();
  }

  // Fresh damage flash.
  if (G.time - p.hurtAt < 0.28) {
    ctx.fillStyle = `rgba(230,57,70,${0.22 * (1 - (G.time - p.hurtAt) / 0.28)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export function drawTitleScreen(ctx, W, H, hasSave) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#2b1055');
  grad.addColorStop(0.45, '#7597de');
  grad.addColorStop(0.72, '#ff9e5e');
  grad.addColorStop(1, '#ff5a3c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Sun low over the sea.
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(W * 0.5, H * 0.66, 74, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d2b33';
  ctx.fillRect(0, H * 0.66, W, H * 0.34);
  ctx.fillStyle = 'rgba(255,209,102,0.5)';
  for (let i = 0; i < 12; i++) {
    const y = H * 0.7 + i * H * 0.026;
    ctx.fillRect(W * 0.5 - 90 + (i % 3) * 26, y, 130 - (i % 4) * 18, 3);
  }
  // Palm silhouettes.
  ctx.strokeStyle = '#14232b';
  for (const px of [W * 0.12, W * 0.86]) {
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(px, H * 0.98);
    ctx.quadraticCurveTo(px + 16, H * 0.8, px + 30, H * 0.62);
    ctx.stroke();
    ctx.lineWidth = 5;
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (0.08 + i * 0.17);
      ctx.beginPath();
      ctx.moveTo(px + 30, H * 0.62);
      ctx.quadraticCurveTo(
        px + 30 + Math.cos(a) * 54, H * 0.62 - Math.sin(a) * 44,
        px + 30 + Math.cos(a) * 92, H * 0.62 - Math.sin(a) * 52 + 26,
      );
      ctx.stroke();
    }
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 18;
  ctx.fillText('PALMARIS HEAT', W / 2, H * 0.3);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffe9c9';
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('An open-world caper in the city of Palmaris', W / 2, H * 0.365);
  ctx.font = '16.5px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Steal cars. Run jobs for Marisol Vega. Outrun the Palmaris PD.', W / 2, H * 0.42);

  panel(ctx, W / 2 - 285, H * 0.52, 570, 128, 0.5);
  ctx.fillStyle = '#ffc93c';
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillText(hasSave ? 'ENTER — Continue      N — New game' : 'ENTER — Start', W / 2, H * 0.52 + 36);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '13.5px system-ui, sans-serif';
  ctx.fillText('WASD / arrows — move & drive  ·  E — enter / exit car', W / 2, H * 0.52 + 66);
  ctx.fillText('SHIFT — sprint  ·  SPACE — handbrake  ·  MOUSE — aim, click to shoot', W / 2, H * 0.52 + 90);
  ctx.fillText('P — pause  ·  M — mute  ·  Progress saves automatically', W / 2, H * 0.52 + 114);
}

export function drawPauseOverlay(ctx, W, H) {
  ctx.fillStyle = 'rgba(10,16,20,0.62)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText('PAUSED', W / 2, H * 0.44);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('P or ESC — resume', W / 2, H * 0.52);
  const s = G.stats;
  ctx.font = '14.5px system-ui, sans-serif';
  ctx.fillText(
    `Cars stolen ${s.stolen} · Shots ${s.shots} · Top speed ${Math.round(s.topSpeed * 0.62)} km/h · Distance ${(s.distance / 400).toFixed(1)} km`,
    W / 2, H * 0.6,
  );
}

export function drawEndOverlay(ctx, W, H, kind) {
  ctx.fillStyle = kind === 'busted' ? 'rgba(20,26,60,0.66)' : 'rgba(60,14,14,0.66)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = kind === 'busted' ? '#9db8ff' : '#ff9d9d';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText(kind === 'busted' ? 'BUSTED' : 'WASTED', W / 2, H * 0.42);
  ctx.fillStyle = '#ffffff';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText(
    kind === 'busted'
      ? 'The PPD took 15% of your cash and dropped you at the station.'
      : 'Palmaris General patched you up for 10% of your cash.',
    W / 2, H * 0.52,
  );
  ctx.fillStyle = '#ffc93c';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('ENTER — Back on the street', W / 2, H * 0.6);
}
