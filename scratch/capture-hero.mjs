import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE_DIR = path.resolve('./scratch/chrome-profile');
const URL = 'http://localhost:4173/';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForHttp(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {}
    await sleep(200);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.pending = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else resolve(msg.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
    this.ws.send(JSON.stringify({ id, method, params }));
    return promise;
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    return res.result?.value;
  }

  async captureScreenshot(clip) {
    const params = { format: 'png' };
    if (clip) params.clip = clip;
    const res = await this.send('Page.captureScreenshot', params);
    return Buffer.from(res.data, 'base64');
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  console.log('Launching headless Chrome...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--window-size=1920,1080',
    `--user-data-dir=${PROFILE_DIR}`,
    'about:blank'
  ]);

  try {
    const targets = await waitForHttp('http://127.0.0.1:9222/json/list');
    const target = targets.find(t => t.type === 'page') || targets[0];
    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log(`Navigating to ${URL}...`);
    await client.send('Page.navigate', { url: URL });
    await sleep(4000);

    // Dismiss tutorial if open
    await client.evaluate(`
      (function() {
        const skipBtn = document.querySelector('[data-tutorial-skip]');
        if (skipBtn) skipBtn.click();
      })()
    `);
    await sleep(2000);

    // 1. Capture Operational HUD View (1920x1080)
    console.log('1. Capturing Operational HUD Hero View (1920x1080)...');
    const hudBuffer = await client.captureScreenshot();
    writeFileSync('./scratch/hero-mars-outpost-operational-hud.png', hudBuffer);

    // 2. Hide ALL UI overlays for 100% pure cinematic view
    console.log('2. Hiding overlays and configuring 1920x1080 cinematic camera...');
    await client.evaluate(`
      (function() {
        const selectors = [
          '.app-header',
          '.app-footer',
          '#hud-container',
          '#mission-objectives-container',
          '#building-prompt-container',
          '#building-panel-container',
          '#science-console-container',
          '#mission-feedback-container',
          '#tutorial-container',
          '#toast-container',
          '#reset-choice-container'
        ];
        selectors.forEach(sel => {
          const el = document.querySelector(sel);
          if (el) el.style.display = 'none';
        });

        const game = window.__OUTPOST_GAME__ || (window.Phaser && window.Phaser.GAMES && window.Phaser.GAMES[0]);
        if (game) {
          const scene = game.scene.scenes[0];
          if (scene) {
            scene.cameras.main.stopFollow();
            scene.cameras.main.centerOn(1000, 750);
            scene.cameras.main.setZoom(0.72);
          }
        }
      })()
    `);
    await sleep(2000);

    const cinematicBuffer = await client.captureScreenshot();
    writeFileSync('./scratch/hero-mars-outpost-cinematic.png', cinematicBuffer);

    // 3. 2000x1500 Full World Boundary Map (Pure 1:1 pixel rendering)
    console.log('3. Capturing 2000x1500 Full World Map...');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 2000,
      height: 1500,
      deviceScaleFactor: 1,
      mobile: false
    });
    await client.evaluate(`
      (function() {
        const game = window.__OUTPOST_GAME__ || (window.Phaser && window.Phaser.GAMES && window.Phaser.GAMES[0]);
        if (game) {
          game.scale.resize(2000, 1500);
          const scene = game.scene.scenes[0];
          if (scene) {
            scene.cameras.main.stopFollow();
            scene.cameras.main.centerOn(1000, 750);
            scene.cameras.main.setZoom(1.0);
          }
        }
      })()
    `);
    await sleep(2000);

    const fullMapBuffer = await client.captureScreenshot();
    writeFileSync('./scratch/hero-mars-outpost-fullmap.png', fullMapBuffer);

    client.close();
    console.log('All hero screenshots captured successfully!');
  } finally {
    chrome.kill();
  }
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
