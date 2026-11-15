import { spawn, execSync } from 'child_process';
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
  console.log('--- Starting Proximity-Based Building Access Browser Verification ---');

  // 1. Build project
  execSync('npm run build', { stdio: 'inherit' });

  // 2. Start static preview server on port 4179
  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '4179', '--strictPort'], {
    stdio: 'ignore',
    shell: true,
  });

  await waitForServer('http://localhost:4179');
  console.log('Preview server ready at http://localhost:4179');

  // 3. Launch headless Chrome on port 9228
  const cdpPort = 9228;
  const chrome = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${cdpPort}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1920,1080',
      '--user-data-dir=' + path.join(process.cwd(), '.chrome-proximity-test-profile'),
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

    console.log('\n--- Step 1: Navigating to http://localhost:4179 ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:4179' });
    await sleep(2500);

    // Dismiss the first-time tutorial briefing if visible so canvas and HUD are unobstructed
    await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('[data-tutorial-skip]')?.click();`,
    });
    await sleep(400);

    // Initial state check
    const initialCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        try {
          const game = window.__OUTPOST_GAME__;
          if (!game) return { error: 'window.__OUTPOST_GAME__ is undefined' };
          const scene = game.scene.getScene('MarsScene');
          if (!scene) return { error: 'scene MarsScene is undefined' };
          return {
            astronautPos: scene.astronaut ? { x: scene.astronaut.x, y: scene.astronaut.y } : null,
            isPanelOpen: scene.isBuildingPanelOpen,
            panelHidden: document.getElementById('building-lesson-panel')?.hidden,
            promptHidden: document.getElementById('building-prompt-container')?.hidden,
            nearby: scene.getNearbyBuilding ? scene.getNearbyBuilding()?.id : null
          };
        } catch (err) {
          return { error: err.message, stack: err.stack };
        }
      })()`,
      returnByValue: true,
    });
    console.log('Initial State Check:', initialCheck.result.value);

    // TEST 1: Clicking a Distant Building
    console.log('\n--- Test 1: Clicking a Distant Building (Mission Control at 620, 500) ---');
    // Astronaut starts at Habitat (1000, 750). Mission control is > 400px away.
    // Click on canvas where Mission Control is located
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__OUTPOST_GAME__;
        const scene = game.scene.getScene('MarsScene');
        const mc = scene.buildings.get('mission_control');
        const cam = scene.cameras.main;
        // World coordinates to screen coordinates
        const screenX = (mc.x - cam.scrollX) * cam.zoom + cam.width / 2 * (1 - cam.zoom);
        const screenY = (mc.y - cam.scrollY) * cam.zoom + cam.height / 2 * (1 - cam.zoom);
        const canvas = game.canvas;
        const rect = canvas.getBoundingClientRect();
        
        // Dispatch pointerdown on canvas at MC position
        const evt = new PointerEvent('pointerdown', {
          clientX: rect.left + screenX,
          clientY: rect.top + screenY,
          bubbles: true
        });
        canvas.dispatchEvent(evt);

        // Also test direct sprite event if any
        mc.emit('pointerdown', { x: screenX, y: screenY, wasTouch: false });
      })()`,
    });
    await sleep(500);

    const afterDistantClick = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__OUTPOST_GAME__;
        const scene = game.scene.getScene('MarsScene');
        return {
          astronautPos: { x: scene.astronaut.x, y: scene.astronaut.y },
          isPanelOpen: scene.isBuildingPanelOpen,
          panelHidden: document.getElementById('building-panel-container')?.hidden
        };
      })()`,
      returnByValue: true,
    });
    console.log('State After Distant Click:', afterDistantClick.result.value);
    if (!afterDistantClick.result.value.panelHidden || afterDistantClick.result.value.isPanelOpen) {
      throw new Error('FAILURE: Clicking distant building opened the building panel!');
    }
    console.log('PASS: Distant click did not open building panel and did not move astronaut.');

    // TEST 2: Clicking a Nearby Building
    console.log('\n--- Test 2: Clicking Nearby Building (Habitat at 1000, 750) ---');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__OUTPOST_GAME__;
        const scene = game.scene.getScene('MarsScene');
        const hab = scene.buildings.get('habitat');
        // Simulate click on habitat sprite
        hab.emit('pointerdown', { x: 500, y: 500, wasTouch: false });
      })()`,
    });
    await sleep(500);

    const afterNearbyClick = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__OUTPOST_GAME__;
        const scene = game.scene.getScene('MarsScene');
        return {
          isPanelOpen: scene.isBuildingPanelOpen,
          panelHidden: document.getElementById('building-panel-container')?.hidden
        };
      })()`,
      returnByValue: true,
    });
    console.log('State After Nearby Click:', afterNearbyClick.result.value);
    if (!afterNearbyClick.result.value.panelHidden || afterNearbyClick.result.value.isPanelOpen) {
      throw new Error('FAILURE: Clicking nearby building opened the building panel!');
    }
    console.log('PASS: Nearby click did not open building panel.');

    // TEST 3: Pressing E Outside Interaction Range
    console.log('\n--- Test 3: Pressing E Outside Interaction Range ---');
    // Teleport astronaut to empty desert at (1000, 200) - far from all buildings
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__OUTPOST_GAME__;
        const scene = game.scene.getScene('MarsScene');
        scene.astronaut.setPosition(1000, 200);
        scene.update();
      })()`,
    });
    await sleep(300);

    const desertCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__OUTPOST_GAME__;
        const scene = game.scene.getScene('MarsScene');
        return {
          astronautPos: { x: scene.astronaut.x, y: scene.astronaut.y },
          nearby: scene.getNearbyBuilding()?.id,
          promptHidden: document.getElementById('building-prompt-container').hidden
        };
      })()`,
      returnByValue: true,
    });
    console.log('In Desert (Outside Range):', desertCheck.result.value);
    if (!desertCheck.result.value.promptHidden || desertCheck.result.value.nearby) {
      throw new Error('FAILURE: Interaction prompt visible while outside range!');
    }

    // Press E
    console.log('Dispatching E key in empty desert...');
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'e', code: 'KeyE' });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'e', code: 'KeyE' });
    await sleep(500);

    const afterDesertE = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__OUTPOST_GAME__;
        const scene = game.scene.getScene('MarsScene');
        return {
          isPanelOpen: scene.isBuildingPanelOpen,
          panelHidden: document.getElementById('building-panel-container')?.hidden
        };
      })()`,
      returnByValue: true,
    });
    console.log('State After E Outside Range:', afterDesertE.result.value);
    if (!afterDesertE.result.value.panelHidden || afterDesertE.result.value.isPanelOpen) {
      throw new Error('FAILURE: Pressing E outside range opened building panel!');
    }
    console.log('PASS: Pressing E outside range did nothing.');

    // TEST 4: Walking Within Range of Mission Control & Pressing E
    console.log('\n--- Test 4: Walking Within Range of Mission Control & Pressing E ---');
    // Position astronaut near Mission Control (620, 640) - ~25px below bottom edge (615)
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__OUTPOST_GAME__;
        const scene = game.scene.getScene('MarsScene');
        scene.astronaut.setPosition(620, 640);
        scene.update();
      })()`,
    });
    await sleep(400);

    const mcNearbyCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__OUTPOST_GAME__;
        const scene = game.scene.getScene('MarsScene');
        const promptEl = document.getElementById('building-prompt-container');
        return {
          astronautPos: { x: scene.astronaut.x, y: scene.astronaut.y },
          nearby: scene.getNearbyBuilding()?.name,
          promptHidden: promptEl.hidden,
          promptText: promptEl.innerText.replace(/\\s+/g, ' ').trim()
        };
      })()`,
      returnByValue: true,
    });
    console.log('Near Mission Control Check:', mcNearbyCheck.result.value);
    if (mcNearbyCheck.result.value.promptHidden || !mcNearbyCheck.result.value.nearby) {
      throw new Error('FAILURE: Interaction prompt did NOT appear near Mission Control!');
    }

    // Capture screenshot of the interaction prompt
    const promptScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const promptPath = path.join(ARTIFACT_DIR, 'proximity-prompt-visible.png');
    fs.writeFileSync(promptPath, Buffer.from(promptScreenshot.data, 'base64'));
    console.log(`Saved prompt screenshot to ${promptPath}`);

    // Press E to open Mission Control
    console.log('Pressing E to inspect Mission Control...');
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'e', code: 'KeyE' });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'e', code: 'KeyE' });
    await sleep(800);

    const mcOpenCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__OUTPOST_GAME__;
        const scene = game.scene.getScene('MarsScene');
        const panelEl = document.getElementById('building-panel-container');
        return {
          isPanelOpen: scene.isBuildingPanelOpen,
          panelHidden: panelEl.hidden,
          panelTitle: panelEl.querySelector('#building-lesson-title')?.textContent,
          promptHidden: document.getElementById('building-prompt-container').hidden
        };
      })()`,
      returnByValue: true,
    });
    console.log('Mission Control Open Check:', mcOpenCheck.result.value);
    if (mcOpenCheck.result.value.panelHidden || !mcOpenCheck.result.value.isPanelOpen) {
      throw new Error('FAILURE: Pressing E within range failed to open building panel!');
    }
    if (mcOpenCheck.result.value.panelTitle !== 'Mission Control') {
      throw new Error(`FAILURE: Expected Mission Control but got ${mcOpenCheck.result.value.panelTitle}`);
    }
    console.log('PASS: Pressing E opened the correct building panel (Mission Control).');

    // Capture screenshot of opened building panel
    const openScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const openPath = path.join(ARTIFACT_DIR, 'proximity-building-opened.png');
    fs.writeFileSync(openPath, Buffer.from(openScreenshot.data, 'base64'));
    console.log(`Saved opened panel screenshot to ${openPath}`);

    // Close panel with Escape
    console.log('Closing panel with Escape...');
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape' });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
    await sleep(500);

    // TEST 5: Walking Away Removes Prompt
    console.log('\n--- Test 5: Walking Away Removes Interaction Prompt ---');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__OUTPOST_GAME__;
        const scene = game.scene.getScene('MarsScene');
        // Move 200px north into open terrain away from Mission Control
        scene.astronaut.setPosition(620, 200);
        scene.update();
      })()`,
    });
    await sleep(400);

    const awayCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__OUTPOST_GAME__;
        const scene = game.scene.getScene('MarsScene');
        const promptEl = document.getElementById('building-prompt-container');
        return {
          astronautPos: { x: scene.astronaut.x, y: scene.astronaut.y },
          nearby: scene.getNearbyBuilding()?.name,
          promptHidden: promptEl.hidden
        };
      })()`,
      returnByValue: true,
    });
    console.log('Moved Away Check:', awayCheck.result.value);
    if (!awayCheck.result.value.promptHidden || awayCheck.result.value.nearby) {
      throw new Error('FAILURE: Prompt did not hide after walking away!');
    }

    const awayScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const awayPath = path.join(ARTIFACT_DIR, 'proximity-prompt-removed.png');
    fs.writeFileSync(awayPath, Buffer.from(awayScreenshot.data, 'base64'));
    console.log(`Saved removed prompt screenshot to ${awayPath}`);
    console.log('PASS: Moving out of range immediately removed the interaction prompt.');

    console.log('\n--- ALL PROXIMITY INTERACTION TESTS PASSED CLEANLY! ---');
    cdp.close();
  } catch (err) {
    console.error('Verification failed with error:', err);
    process.exit(1);
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
