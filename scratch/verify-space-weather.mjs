import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

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
  console.log('--- Starting Space Weather & Mission Debrief Verification ---');

  // 1. Start static preview server on port 4178
  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '4178', '--strictPort'], {
    stdio: 'ignore',
    shell: true,
  });

  await waitForServer('http://localhost:4178');
  console.log('Preview server ready at http://localhost:4178');

  // 2. Launch headless Chrome on port 9226
  const cdpPort = 9226;
  const chrome = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${cdpPort}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1920,1080',
      '--user-data-dir=' + path.join(process.cwd(), '.chrome-space-weather-test-profile'),
    ],
    { stdio: 'ignore' }
  );

  try {
    await sleep(1500);

    const versionRes = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
    const versionData = await versionRes.json();
    console.log('Connected to Chrome:', versionData.Browser);

    const listRes = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
    const targets = await listRes.json();
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];

    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    console.log('\n--- Step 1: Navigating to page and injecting Sol 4 State ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:4178' });
    await sleep(2000);

    // Inject Sol 4 state (pending decision)
    const sol4State = {
      sol: 4,
      missionObjectivesCompleted: ['sol-1-habitat', 'sol-2-solar-farm', 'sol-3-greenhouse'],
      missionComplete: false,
      resources: {
        power: { current: 38, max: 50, criticalLow: 10, unit: 'kW' },
        lifeSupport: { current: 28, max: 30, criticalLow: 5, unit: 'days' },
        stormShield: { current: 65, max: 100, criticalLow: 25, unit: '%' },
      },
      crewSafety: 'nominal',
      exploredBuildings: ['habitat', 'solar_farm', 'greenhouse', 'storm_shelter'],
      completedScienceChallenges: ['flare-energy', 'curiosity-dose'],
      lastSavedAt: Date.now(),
    };

    await cdp.send('Runtime.evaluate', {
      expression: `localStorage.setItem('outpost_mars_saved_state_v1', JSON.stringify(${JSON.stringify(sol4State)}));`,
    });

    // Reload so game loads the injected Sol 4 state
    console.log('Reloading with Sol 4 state...');
    await cdp.send('Page.navigate', { url: 'http://localhost:4178' });
    await sleep(2500);

    // Verify Space Weather dialog opens automatically
    let dialogVisible = await cdp.send('Runtime.evaluate', {
      expression: `!document.getElementById('space-weather-container').hidden`,
      returnByValue: true,
    });

    console.log('Is Space Weather Dialog automatically open?', dialogVisible.result.value);

    // Inspect dialog contents
    const dialogInspection = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.getElementById('space-weather-container');
        if (!el || el.hidden) return null;
        return {
          title: el.querySelector('#space-weather-title')?.textContent,
          kicker: el.querySelector('.space-weather-kicker')?.textContent,
          provenanceTag: el.querySelector('.provenance-tag')?.textContent,
          provenanceHeadline: el.querySelector('.provenance-headline')?.textContent,
          metaGrid: el.querySelector('.provenance-meta-grid')?.innerText,
          disclaimer: el.querySelector('.provenance-disclaimer')?.textContent,
          simNotice: el.querySelector('.space-weather-sim-notice')?.innerText,
          choiceCount: el.querySelectorAll('.space-weather-choice-btn').length,
          choiceTitles: Array.from(el.querySelectorAll('.space-weather-choice-btn strong')).map(e => e.textContent),
          confirmBtnDisabled: el.querySelector('[data-weather-confirm]')?.disabled
        };
      })()`,
      returnByValue: true,
    });

    console.log('Dialog Inspection Data:', JSON.stringify(dialogInspection.result.value, null, 2));

    // Capture screenshot of Space Weather Dialog
    const swScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const swPath = path.join(ARTIFACT_DIR, 'space-weather-dialog.png');
    fs.writeFileSync(swPath, Buffer.from(swScreenshot.data, 'base64'));
    console.log(`Saved screenshot to ${swPath}`);

    // Select the "shelter" choice card
    console.log('\n--- Step 2: Selecting "Fortify Storm Shelter" and confirming ---');
    await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('[data-weather-choice="shelter"]').click();`,
    });
    await sleep(400);

    const isConfirmEnabled = await cdp.send('Runtime.evaluate', {
      expression: `!document.querySelector('[data-weather-confirm]').disabled`,
      returnByValue: true,
    });
    console.log('Is Confirm button enabled after selecting shelter?', isConfirmEnabled.result.value);

    // Click confirm
    await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('[data-weather-confirm]').click();`,
    });
    await sleep(800);

    // Verify outcome panel is shown inside dialog
    const outcomeInspection = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const panel = document.querySelector('.space-weather-outcome-panel');
        if (!panel) return null;
        return {
          title: panel.querySelector('.outcome-title')?.textContent,
          desc: panel.querySelector('.outcome-desc')?.textContent,
          changes: Array.from(panel.querySelectorAll('.space-weather-changes li')).map(li => li.innerText)
        };
      })()`,
      returnByValue: true,
    });
    console.log('Outcome Panel Data:', outcomeInspection.result.value);

    // Click "Continue Sol 4 Mission"
    await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('[data-weather-done]').click();`,
    });
    await sleep(500);

    // Check game state after decision
    const stateAfterDecision = await cdp.send('Runtime.evaluate', {
      expression: `JSON.parse(localStorage.getItem('outpost_mars_saved_state_v1'))`,
      returnByValue: true,
    });
    console.log('State after decision in localStorage:', {
      spaceWeatherDecision: stateAfterDecision.result.value?.spaceWeatherDecision,
      spaceWeatherEventTriggered: stateAfterDecision.result.value?.spaceWeatherEventTriggered,
      power: stateAfterDecision.result.value?.resources?.power,
      stormShield: stateAfterDecision.result.value?.resources?.stormShield,
    });

    // Open Storm Shelter panel to verify decision callout
    console.log('\n--- Step 3: Verifying Storm Shelter Inspection Panel with Decision Logged ---');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__OUTPOST_GAME__;
        game.events.emit('outpost:building-panel-open', {
          id: 'storm_shelter',
          name: 'Storm Shelter',
          type: 'storm_shelter',
          x: 480,
          y: 720,
          bounds: { x: 480, y: 720, width: 220, height: 160 }
        });
      })()`,
    });
    await sleep(800);

    const shelterCalloutText = await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('.space-weather-shelter-callout')?.innerText`,
      returnByValue: true,
    });
    console.log('Storm Shelter Callout Text:\n', shelterCalloutText.result.value);

    // Capture screenshot of Storm Shelter panel
    const shelterScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const shelterPath = path.join(ARTIFACT_DIR, 'storm-shelter-callout.png');
    fs.writeFileSync(shelterPath, Buffer.from(shelterScreenshot.data, 'base64'));
    console.log(`Saved screenshot to ${shelterPath}`);

    // Close building panel
    await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('[data-building-close]')?.click();`,
    });
    await sleep(500);

    // Step 4: Advance to Sol 5 (Mission Complete) and verify Mission Debrief
    console.log('\n--- Step 4: Advancing to Sol 5 Mission Debrief ---');
    const sol5State = {
      ...stateAfterDecision.result.value,
      sol: 5,
      missionObjectivesCompleted: [
        'sol-1-habitat',
        'sol-2-solar-farm',
        'sol-3-greenhouse',
        'sol-4-storm-shelter',
        'sol-5-mission-control',
      ],
      missionComplete: true,
      exploredBuildings: ['habitat', 'solar_farm', 'greenhouse', 'storm_shelter', 'mission_control'],
      completedScienceChallenges: ['flare-energy', 'curiosity-dose', 'delay-calc'],
    };

    await cdp.send('Runtime.evaluate', {
      expression: `localStorage.setItem('outpost_mars_saved_state_v1', JSON.stringify(${JSON.stringify(sol5State)}));`,
    });

    // Reload page to populate Sol 5 complete state
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

    // Inspect Debrief
    const debriefInspection = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.querySelector('.mission-debrief-card');
        if (!el) return null;
        return {
          rankTitle: el.querySelector('.debrief-rank-title')?.textContent,
          scoreBadge: el.querySelector('.debrief-score-badge')?.textContent,
          categories: Array.from(el.querySelectorAll('.debrief-category-card')).map(card => ({
            name: card.querySelector('.category-name')?.textContent,
            score: card.querySelector('.category-score-val')?.textContent,
            tier: card.querySelector('.category-tier-pill')?.textContent,
            summary: card.querySelector('.category-summary-text')?.textContent,
            evidencePoints: Array.from(card.querySelectorAll('.evidence-breakdown li')).map(li => li.textContent)
          })),
          provenanceNote: el.querySelector('.debrief-provenance-note')?.textContent
        };
      })()`,
      returnByValue: true,
    });

    console.log('Debrief Inspection Data:\n', JSON.stringify(debriefInspection.result.value, null, 2));

    // Capture screenshot of Mission Debrief
    const debriefScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const debriefPath = path.join(ARTIFACT_DIR, 'mission-debrief-sol5.png');
    fs.writeFileSync(debriefPath, Buffer.from(debriefScreenshot.data, 'base64'));
    console.log(`Saved screenshot to ${debriefPath}`);

    console.log('\n--- Space Weather & Mission Debrief Verification Succeeded! ---');
    cdp.close();
  } catch (err) {
    console.error('Verification failed with error:', err);
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
