import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE_DIR = path.resolve('./scratch/chrome-attr-temp');
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
    await sleep(1000);

    // 1. Open Science Log & expand the NASA Research Library
    console.log('1. Opening Science Log with NASA Research Library expanded...');
    await client.evaluate(`
      (function() {
        document.getElementById('btn-science-log')?.click();
        const details = document.querySelector('details.science-library');
        if (details) details.open = true;
      })()
    `);
    await sleep(1200);

    const hubLibraryBuffer = await client.captureScreenshot();
    writeFileSync('./scratch/science-log-attribution-hub.png', hubLibraryBuffer);
    console.log('Saved scratch/science-log-attribution-hub.png');

    // 2. Open Radiation Detective & expand Curiosity RAD + RadLab Provenance
    console.log('2. Opening Radiation Detective with Provenance expanded...');
    await client.evaluate(`
      (function() {
        document.querySelector('[data-challenge-open="radiation-detective"]')?.click();
        const provs = document.querySelectorAll('details.science-provenance');
        provs.forEach(p => p.open = true);
      })()
    `);
    await sleep(1200);

    const radProvenanceBuffer = await client.captureScreenshot();
    writeFileSync('./scratch/science-provenance-attribution-cards.png', radProvenanceBuffer);
    console.log('Saved scratch/science-provenance-attribution-cards.png');

    // 3. Open Solar Storm Alert & expand DONKI Provenance
    console.log('3. Opening Solar Storm Alert with Provenance expanded...');
    await client.evaluate(`
      (function() {
        document.querySelector('[data-science-back]')?.click();
      })()
    `);
    await sleep(500);
    await client.evaluate(`
      (function() {
        document.querySelector('[data-challenge-open="solar-storm-alert"]')?.click();
        const provs = document.querySelectorAll('details.science-provenance');
        provs.forEach(p => p.open = true);
      })()
    `);
    await sleep(1200);

    const solarProvenanceBuffer = await client.captureScreenshot();
    writeFileSync('./scratch/science-solar-provenance-attribution.png', solarProvenanceBuffer);
    console.log('Saved scratch/science-solar-provenance-attribution.png');

    client.close();
    console.log('Attribution screenshots captured successfully!');
  } finally {
    chrome.kill();
  }
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
