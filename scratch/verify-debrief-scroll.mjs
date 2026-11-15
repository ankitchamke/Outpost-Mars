import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\ankit\\.gemini\\antigravity\\brain\\a6c5ac8e-8ff4-4bbd-8d8e-207938f798de';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  close() {
    this.ws.close();
  }
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function main() {
  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '4178', '--strictPort'], {
    stdio: 'ignore',
    shell: true,
  });

  await waitForServer('http://localhost:4178');

  const cdpPort = 9227;
  const chrome = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${cdpPort}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1920,1080',
      '--user-data-dir=' + path.join(process.cwd(), '.chrome-debrief-scroll-test-profile'),
    ],
    { stdio: 'ignore' }
  );

  try {
    await sleep(1500);
    const versionRes = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
    const versionData = await versionRes.json();
    const listRes = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
    const targets = await listRes.json();
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];

    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    await cdp.send('Page.navigate', { url: 'http://localhost:4178' });
    await sleep(2000);

    const sol5State = {
      sol: 5,
      missionObjectivesCompleted: [
        'sol-1-habitat',
        'sol-2-solar-farm',
        'sol-3-greenhouse',
        'sol-4-storm-shelter',
        'sol-5-mission-control',
      ],
      missionComplete: true,
      resources: {
        power: { current: 36, max: 50, criticalLow: 10, unit: 'kW' },
        lifeSupport: { current: 27, max: 30, criticalLow: 5, unit: 'days' },
        stormShield: { current: 85, max: 100, criticalLow: 25, unit: '%' },
      },
      crewSafety: 'nominal',
      spaceWeatherDecision: 'shelter',
      spaceWeatherEventTriggered: true,
      exploredBuildings: ['habitat', 'solar_farm', 'greenhouse', 'storm_shelter', 'mission_control'],
      completedScienceChallenges: ['flare-energy', 'curiosity-dose', 'delay-calc'],
      lastSavedAt: Date.now(),
    };

    await cdp.send('Runtime.evaluate', {
      expression: `localStorage.setItem('outpost_mars_saved_state_v1', JSON.stringify(${JSON.stringify(sol5State)}));`,
    });

    await cdp.send('Page.navigate', { url: 'http://localhost:4178' });
    await sleep(2500);

    // Open Mission Control
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__OUTPOST_GAME__;
        game.events.emit('outpost:building-panel-open', {
          id: 'mission_control',
          name: 'Mission Control',
          type: 'mission_control',
          x: 1040,
          y: 360,
          bounds: { x: 1040, y: 360, width: 220, height: 160 }
        });
      })()`,
    });
    await sleep(1000);

    // Scroll the building panel down to show categories & provenance
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.querySelector('.building-lesson-card');
        if (card) card.scrollTop = card.scrollHeight;
      })()`,
    });
    await sleep(500);

    const debriefScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const debriefPath = path.join(ARTIFACT_DIR, 'mission-debrief-scrolled.png');
    fs.writeFileSync(debriefPath, Buffer.from(debriefScreenshot.data, 'base64'));
    console.log(`Saved scrolled screenshot to ${debriefPath}`);

    cdp.close();
  } finally {
    try {
      chrome.kill();
    } catch {}
    try {
      preview.kill();
    } catch {}
  }
}

main().catch(console.error);
