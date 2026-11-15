import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE_DIR = path.resolve('./scratch/chrome-gameplay-temp');
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

    // 1. Capture Main Gameplay Screenshot (Colony Overview + Facilities + Live HUD)
    console.log('1. Capturing Main Gameplay Screenshot (Colony & Facilities)...');
    const mainGameplayBuffer = await client.captureScreenshot();
    writeFileSync('./scratch/main-gameplay-colony-facilities.png', mainGameplayBuffer);
    console.log('Saved scratch/main-gameplay-colony-facilities.png');

    // 2. Open Facility Field Guide / Inspection panel
    console.log('2. Inspecting Habitat Facility...');
    await client.evaluate(`
      (function() {
        const promptBtn = document.querySelector('[data-building-interact]');
        if (promptBtn) {
          promptBtn.click();
          return 'clicked';
        }
        return 'no-prompt';
      })()
    `);
    await sleep(1500);

    const inspectionBuffer = await client.captureScreenshot();
    writeFileSync('./scratch/gameplay-facility-inspection.png', inspectionBuffer);
    console.log('Saved scratch/gameplay-facility-inspection.png');

    // 3. Close panel and navigate along rover track toward Solar Farm
    console.log('3. Navigating Commander toward Solar Farm...');
    await client.evaluate(`
      (function() {
        // Close panel
        const closeBtn = document.querySelector('[data-building-close]');
        if (closeBtn) closeBtn.click();

        // Move astronaut to Solar Farm track junction
        const game = window.__OUTPOST_GAME__ || (window.Phaser && window.Phaser.GAMES && window.Phaser.GAMES[0]);
        if (game) {
          const scene = game.scene.scenes[0];
          if (scene && scene.astronaut) {
            scene.astronaut.setPosition(1300, 600);
            if (scene.astronaut.anims) {
              scene.astronaut.anims.play('walk_right', true);
            }
            scene.refreshNearbyBuilding();
          }
        }
      })()
    `);
    await sleep(2000);

    const roverNavBuffer = await client.captureScreenshot();
    writeFileSync('./scratch/gameplay-colony-exploration.png', roverNavBuffer);
    console.log('Saved scratch/gameplay-colony-exploration.png');

    client.close();
    console.log('Gameplay screenshots captured successfully!');
  } finally {
    chrome.kill();
  }
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
