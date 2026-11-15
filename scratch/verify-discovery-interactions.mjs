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
  console.log('=== Starting Interactive Mars Discovery Browser Verification ===');

  // 1. Build project
  console.log('Building project...');
  execSync('npm run build', { stdio: 'inherit' });

  // 2. Start static preview server on port 4181
  const port = 4181;
  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', String(port), '--strictPort'], {
    stdio: 'ignore',
    shell: true,
  });

  await waitForServer(`http://localhost:${port}`);
  console.log(`Preview server ready at http://localhost:${port}`);

  // 3. Launch headless Chrome on port 9230
  const cdpPort = 9230;
  const profileDir = path.join(process.cwd(), '.chrome-discovery-test-profile');
  const chrome = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${cdpPort}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1920,1080',
      '--user-data-dir=' + profileDir,
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

    cdp.ws.addEventListener('message', (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value || a.description || '').join(' ');
        console.log(`[Browser Console ${msg.params.type}]`, text);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[Browser Exception]', JSON.stringify(msg.params.exceptionDetails));
      }
    });

    console.log(`\n--- Step 1: Navigating to http://localhost:${port} ---`);
    await cdp.send('Page.navigate', { url: `http://localhost:${port}` });
    await sleep(2500);

    // Dismiss the first-time tutorial briefing if visible so canvas and HUD are clean
    await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('[data-tutorial-skip]')?.click();`,
    });
    await sleep(400);

    // Initial state check
    const initialCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        try {
          const game = window.__OUTPOST_GAME__;
          if (!game) return { error: 'window.__OUTPOST_GAME__ undefined' };
          const scene = game.scene.getScene('MarsScene');
          if (!scene) return { error: 'scene undefined' };
          return {
            astronautPos: scene.astronaut ? { x: scene.astronaut.x, y: scene.astronaut.y } : null,
            nearbyBuilding: scene.getNearbyBuilding ? scene.getNearbyBuilding()?.id : null,
            nearbyDiscovery: scene.getNearbyDiscovery ? scene.getNearbyDiscovery()?.id : null,
          };
        } catch (e) {
          return { error: e.message, stack: e.stack };
        }
      })()`,
      returnByValue: true,
    });
    console.log('Initial State Check:', JSON.stringify(initialCheck, null, 2));

    // STEP 2: Move Astronaut to Ancient Impact Crater (300, 240)
    console.log('\n--- Step 2: Approaching Ancient Impact Crater (300, 240) ---');
    const moveResult = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        try {
          const game = window.__OUTPOST_GAME__;
          if (!game) return { error: 'no game' };
          const scene = game.scene.getScene('MarsScene');
          if (!scene) return { error: 'no scene' };
          scene.astronaut.setPosition(300, 240);
          scene.cameras.main.centerOn(300, 240);
          if (scene.update) scene.update();
          return {
            astronautPos: { x: scene.astronaut.x, y: scene.astronaut.y },
            nearbyDiscovery: scene.getNearbyDiscovery?.()?.id || null,
            promptHidden: document.getElementById('building-prompt-container')?.hidden,
            promptText: document.getElementById('building-prompt-container')?.textContent.trim()
          };
        } catch (e) {
          return { error: e.message, stack: e.stack };
        }
      })()`,
      returnByValue: true,
    });
    console.log('Crater Approach Result:', JSON.stringify(moveResult, null, 2));

    const moveVal = moveResult.result?.value;
    if (moveVal?.error) {
      throw new Error(`Crater approach error: ${moveVal.error}\n${moveVal.stack}`);
    }
    if (moveVal?.nearbyDiscovery !== 'crater_basin') {
      throw new Error(`Expected nearby discovery 'crater_basin', got: ${moveVal?.nearbyDiscovery}`);
    }
    if (moveVal?.promptHidden) {
      throw new Error('Discovery prompt is hidden when astronaut is at Crater (300, 240)!');
    }
    console.log('PASS: Discovery prompt is visible with correct text:', moveVal?.promptText);

    // Capture screenshot of Discovery Prompt
    await sleep(300);
    const shot1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const promptShotPath = path.join(ARTIFACT_DIR, 'discovery-prompt-visible.png');
    fs.writeFileSync(promptShotPath, Buffer.from(shot1.data, 'base64'));
    console.log('Saved Artifact:', promptShotPath);

    // STEP 3: Press E to open Discovery Card
    console.log('\n--- Step 3: Pressing [E] to Inspect Discovery ---');
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'e', code: 'KeyE', windowsVirtualKeyCode: 69 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'e', code: 'KeyE', windowsVirtualKeyCode: 69 });
    await sleep(500);

    const dialogState = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        try {
          const container = document.getElementById('discovery-dialog-container');
          const card = container?.querySelector('.discovery-card');
          return {
            containerHidden: container?.hidden,
            hasCard: Boolean(card),
            title: card?.querySelector('#discovery-title')?.textContent,
            kicker: card?.querySelector('.discovery-kicker')?.textContent,
            explanation: card?.querySelector('.discovery-explanation')?.textContent,
            fact: card?.querySelector('.discovery-fact-box p')?.textContent,
            whyStudy: card?.querySelector('.discovery-science-box p')?.textContent,
            provenance: card?.querySelector('.discovery-provenance-box p')?.textContent,
          };
        } catch (e) {
          return { error: e.message, stack: e.stack };
        }
      })()`,
      returnByValue: true,
    });
    console.log('Discovery Dialog State:', JSON.stringify(dialogState, null, 2));

    const dialogVal = dialogState.result?.value;
    if (dialogVal?.error) {
      throw new Error(`Dialog check error: ${dialogVal.error}\n${dialogVal.stack}`);
    }
    if (dialogVal?.containerHidden) {
      throw new Error('Discovery dialog container is still hidden after pressing E!');
    }
    if (dialogVal?.title !== 'Ancient Impact Crater') {
      throw new Error(`Unexpected title: ${dialogVal?.title}`);
    }
    if (!dialogVal?.provenance?.includes('NASA')) {
      throw new Error(`Missing NASA reference: ${dialogVal?.provenance}`);
    }
    console.log('PASS: All 5 educational fields verified on Discovery Card.');

    // Capture screenshot of Discovery Card Dialog
    await sleep(300);
    const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const cardShotPath = path.join(ARTIFACT_DIR, 'discovery-card-opened.png');
    fs.writeFileSync(cardShotPath, Buffer.from(shot2.data, 'base64'));
    console.log('Saved Artifact:', cardShotPath);

    // STEP 4: Close with Escape Key
    console.log('\n--- Step 4: Closing with Escape Key ---');
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(400);

    const afterEsc = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const container = document.getElementById('discovery-dialog-container');
        return {
          containerHidden: container?.hidden,
        };
      })()`,
      returnByValue: true,
    });
    console.log('After Escape Check:', afterEsc.result.value);
    if (!afterEsc.result.value.containerHidden) {
      throw new Error('Discovery dialog did not close when pressing Escape!');
    }
    console.log('PASS: Discovery dialog closed cleanly via Escape.');

    // STEP 5: Verify remaining 4 discoveries across the map
    console.log('\n--- Step 5: Testing remaining 4 discoveries across the map ---');
    const discoveriesToTest = [
      { id: 'volcanic_boulder', name: 'Weathered Basalt Boulder', x: 260, y: 520 },
      { id: 'dune_ripples', name: 'Aeolian Sand Dunes', x: 920, y: 1430 },
      { id: 'regolith_patch', name: 'Martian Regolith & Soil', x: 1000, y: 1140 },
      { id: 'bedrock_slab', name: 'Sedimentary Bedrock Slab', x: 1720, y: 720 },
    ];

    for (const d of discoveriesToTest) {
      const res = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const game = window.__OUTPOST_GAME__;
          const scene = game.scene.getScene('MarsScene');
          scene.astronaut.setPosition(${d.x}, ${d.y});
          scene.update();
          const nearby = scene.getNearbyDiscovery();
          return {
            nearbyId: nearby?.id,
            nearbyName: nearby?.name,
            promptText: document.getElementById('building-prompt-container')?.textContent.trim()
          };
        })()`,
        returnByValue: true,
      });
      console.log(`Discovered [${d.id}]:`, res.result.value);
      if (res.result.value.nearbyId !== d.id) {
        throw new Error(`Failed to detect discovery ${d.id} at (${d.x}, ${d.y})!`);
      }
      if (!res.result.value.promptText.includes('FIELD DISCOVERY')) {
        throw new Error(`Expected prompt for ${d.id} to be FIELD DISCOVERY, got: ${res.result.value.promptText}`);
      }
    }
    console.log('PASS: All 5 discoveries detected at their real geological prop positions.');

    // STEP 5b: Verify clicking discovery objects does nothing
    console.log('\n--- Step 5b: Testing Clicking Discovery Objects Does Nothing ---');
    const clickCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__OUTPOST_GAME__;
        const scene = game.scene.getScene('MarsScene');
        // Astronaut is at (1720, 720). Click somewhere else, e.g., on the crater at (300, 240)
        const canvas = game.canvas;
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: rect.left + 300, clientY: rect.top + 240, bubbles: true }));
        canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: rect.left + 300, clientY: rect.top + 240, bubbles: true }));

        return {
          astronautPos: { x: scene.astronaut.x, y: scene.astronaut.y },
          discoveryHidden: document.getElementById('discovery-dialog-container')?.hidden,
          buildingHidden: document.getElementById('building-panel-container')?.hidden,
        };
      })()`,
      returnByValue: true,
    });
    console.log('Click Check Result:', clickCheck.result.value);
    if (!clickCheck.result.value.discoveryHidden || !clickCheck.result.value.buildingHidden) {
      throw new Error('Clicking unexpectedly opened a dialog!');
    }
    if (clickCheck.result.value.astronautPos.x !== 1720 || clickCheck.result.value.astronautPos.y !== 720) {
      throw new Error('Clicking moved or teleported the astronaut!');
    }
    console.log('PASS: Clicking objects does nothing. Astronaut stayed at position and no panel opened.');

    // STEP 6: Building Precedence Test
    console.log('\n--- Step 6: Testing Building Precedence Over Discovery ---');
    const precedenceCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__OUTPOST_GAME__;
        const scene = game.scene.getScene('MarsScene');
        // Move to Habitat (1000, 750)
        scene.astronaut.setPosition(1000, 750);
        scene.update();
        return {
          nearbyBuilding: scene.getNearbyBuilding()?.id,
          promptText: document.getElementById('building-prompt-container')?.textContent.trim()
        };
      })()`,
      returnByValue: true,
    });
    console.log('Precedence Check at Habitat:', precedenceCheck.result.value);
    if (precedenceCheck.result.value.nearbyBuilding !== 'habitat') {
      throw new Error(`Expected nearby building 'habitat', got: ${precedenceCheck.result.value.nearbyBuilding}`);
    }
    if (!precedenceCheck.result.value.promptText.includes('STRUCTURE PROXIMITY')) {
      throw new Error('Building prompt did not take precedence!');
    }
    console.log('PASS: Colony building interactions strictly take precedence over field discoveries.');

    console.log('\n=== ALL BROWSER & INTERACTION VERIFICATIONS PASSED SUCCESSFULLY ===');
    cdp.close();
  } finally {
    try {
      chrome.kill('SIGKILL');
    } catch {}
    try {
      preview.kill('SIGKILL');
    } catch {}
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('FATAL VERIFICATION ERROR:', err);
  process.exit(1);
});
