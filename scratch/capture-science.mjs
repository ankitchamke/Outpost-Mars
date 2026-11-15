import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE_DIR = path.resolve('./scratch/chrome-science-temp');
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
    await sleep(1500);

    // 1. Open Science Console via top header button
    console.log('1. Opening Science Console Hub...');
    await client.evaluate(`
      (function() {
        const scienceBtn = document.getElementById('btn-science-log');
        if (scienceBtn) scienceBtn.click();
      })()
    `);
    await sleep(1500);

    const hubBuffer = await client.captureScreenshot();
    writeFileSync('./scratch/science-challenge-hub.png', hubBuffer);
    console.log('Saved scratch/science-challenge-hub.png');

    // 2. Open Radiation Detective (contains the dual NASA Data Cards)
    console.log('2. Opening Radiation Detective with NASA Data Cards...');
    await client.evaluate(`
      (function() {
        const cardBtn = document.querySelector('[data-challenge-open="radiation-detective"]');
        if (cardBtn) cardBtn.click();
        
        // Expand dataset provenance details for inspection
        const details = document.querySelectorAll('details.science-provenance');
        details.forEach(d => d.open = true);
      })()
    `);
    await sleep(1500);

    const radiationBuffer = await client.captureScreenshot();
    writeFileSync('./scratch/science-nasa-data-cards-radiation.png', radiationBuffer);
    console.log('Saved scratch/science-nasa-data-cards-radiation.png');

    // 3. Open Solar Storm Alert (NASA DONKI data card)
    console.log('3. Opening Solar Storm Alert...');
    await client.evaluate(`
      (function() {
        const backBtn = document.querySelector('[data-science-back]');
        if (backBtn) backBtn.click();
      })()
    `);
    await sleep(500);
    await client.evaluate(`
      (function() {
        const cardBtn = document.querySelector('[data-challenge-open="solar-storm-alert"]');
        if (cardBtn) cardBtn.click();
        const details = document.querySelectorAll('details.science-provenance');
        details.forEach(d => d.open = true);
      })()
    `);
    await sleep(1500);

    const solarBuffer = await client.captureScreenshot();
    writeFileSync('./scratch/science-nasa-data-card-solar.png', solarBuffer);
    console.log('Saved scratch/science-nasa-data-card-solar.png');

    client.close();
    console.log('Science screenshots captured successfully!');
  } finally {
    chrome.kill();
  }
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
