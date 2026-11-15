import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const VIEWPORTS = [
  { name: 'desktop-1366x768', width: 1366, height: 768, zoom: 0.85 },
  { name: 'fhd-1920x1080', width: 1920, height: 1080, zoom: 1.0 },
];

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

async function run() {
  console.log('--- Starting Desktop Interaction Verification ---');

  // 1. Start static preview server on port 4173
  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '4173', '--strictPort'], {
    stdio: 'ignore',
    shell: true,
  });

  await sleep(2500);

  // 2. Launch Chrome headless with remote debugging
  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-background-networking',
      '--window-size=1920,1080',
      'http://localhost:4173',
    ],
    { stdio: 'ignore' }
  );

  await sleep(2500);

  const targetsRes = await fetch('http://localhost:9222/json');
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === 'page');
  if (!pageTarget) throw new Error('No page target found');

  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('DOM.enable');

  const results = {};

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})`);

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await client.send('Page.navigate', { url: 'http://localhost:4173' });
    await sleep(2500);

    // Dismiss tutorial if visible to test clean gameplay
    await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const skipBtn = document.querySelector('[data-tutorial-skip]');
          if (skipBtn) skipBtn.click();
        })()
      `,
    });
    await sleep(500);

    // Verify desktop notice in tutorial markup or Help
    const noticeCheck = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const btnHelp = document.getElementById('btn-help');
          if (btnHelp) btnHelp.click();
          const notice = document.querySelector('.tutorial-desktop-notice');
          const noticeText = notice ? notice.textContent : '';
          const skipBtn = document.querySelector('[data-tutorial-skip]');
          if (skipBtn) skipBtn.click();
          return {
            hasNotice: !!notice,
            text: noticeText
          };
        })()
      `,
      returnByValue: true,
    });

    console.log('Desktop notice check:', noticeCheck.result.value);

    // Get Building World & Screen Coordinates
    const coordsRes = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const game = window.__OUTPOST_GAME__;
          const scene = game.scene.getScene('MarsScene');
          const camera = scene.cameras.main;
          const canvas = game.canvas;
          const canvasRect = canvas.getBoundingClientRect();
          const result = {};
          for (const [id, sprite] of scene.buildings) {
            // Screen point within canvas
            const screenX = canvasRect.left + (sprite.x - camera.worldView.x) * camera.zoom;
            const screenY = canvasRect.top + (sprite.y - camera.worldView.y) * camera.zoom;
            result[id] = {
              worldX: sprite.x,
              worldY: sprite.y,
              screenX,
              screenY,
              displayWidth: sprite.displayWidth,
              displayHeight: sprite.displayHeight
            };
          }
          return {
            zoom: camera.zoom,
            worldView: { x: camera.worldView.x, y: camera.worldView.y, width: camera.worldView.width, height: camera.worldView.height },
            canvasRect: { left: canvasRect.left, top: canvasRect.top, width: canvasRect.width, height: canvasRect.height },
            buildings: result,
            astronaut: { x: scene.astronaut.x, y: scene.astronaut.y }
          };
        })()
      `,
      returnByValue: true,
    });

    const info = coordsRes.result.value;
    console.log('Camera info:', { zoom: info.zoom, worldView: info.worldView, canvasRect: info.canvasRect });
    console.log(`Astronaut start: (${info.astronaut.x}, ${info.astronaut.y})`);

    const vpResults = {
      notice: noticeCheck.result.value,
      directClicks: {},
      edgesIgnored: false,
      terrainIgnored: false,
      farAwayIgnored: false,
      keyboardProximity: false,
    };

    // Helper to click at screen coordinates
    async function clickScreen(x, y) {
      await client.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x,
        y,
        button: 'left',
        clickCount: 1,
      });
      await sleep(50);
      await client.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x,
        y,
        button: 'left',
        clickCount: 1,
      });
      await sleep(350);
    }

    // Helper to check which panel is currently open
    async function getOpenPanelBuilding() {
      const res = await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            const panel = document.getElementById('building-panel-container');
            if (!panel || panel.hidden) return null;
            const title = panel.querySelector('.building-lesson-title, .building-lesson-title-block, h2, h3')?.textContent?.trim() || 'Open';
            return title;
          })()
        `,
        returnByValue: true,
      });
      return res.result.value;
    }

    // Helper to close open panel
    async function closePanel() {
      await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            const closeBtn = document.querySelector('[data-building-close]');
            if (closeBtn) closeBtn.click();
          })()
        `,
      });
      await sleep(250);
    }

    // 1. Direct click on all 5 buildings
    for (const [id, b] of Object.entries(info.buildings)) {
      await closePanel();
      // Click at the building's screen center
      await clickScreen(b.screenX, b.screenY);
      const openTitle = await getOpenPanelBuilding();
      console.log(`Clicking ${id} at screen (${Math.round(b.screenX)}, ${Math.round(b.screenY)}) -> opened: "${openTitle}"`);
      vpResults.directClicks[id] = {
        success: openTitle !== null,
        title: openTitle,
      };
      await closePanel();
    }

    // 2. Click around Habitat edges (top-left transparent corner of Habitat bounding box)
    const hab = info.buildings.habitat;
    // Habitat displayWidth ~362, displayHeight ~235
    // Top-left corner of the bounding box at (screenX - w/2 + 15, screenY - h/2 + 15) is in transparent padding
    const habCornerX = hab.screenX - (hab.displayWidth / 2) * info.zoom + 15;
    const habCornerY = hab.screenY - (hab.displayHeight / 2) * info.zoom + 15;
    await clickScreen(habCornerX, habCornerY);
    const cornerOpen = await getOpenPanelBuilding();
    console.log(`Clicking Habitat edge/corner (${Math.round(habCornerX)}, ${Math.round(habCornerY)}) -> opened: "${cornerOpen}"`);
    vpResults.edgesIgnored = cornerOpen === null;
    await closePanel();

    // 3. Click on nearby empty terrain between Mission Control and Habitat
    const corridorScreenRes = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const game = window.__OUTPOST_GAME__;
          const scene = game.scene.getScene('MarsScene');
          const camera = scene.cameras.main;
          const canvasRect = game.canvas.getBoundingClientRect();
          const screenX = canvasRect.left + (805 - camera.worldView.x) * camera.zoom;
          const screenY = canvasRect.top + (600 - camera.worldView.y) * camera.zoom;
          return { x: screenX, y: screenY };
        })()
      `,
      returnByValue: true,
    });
    const corridorScreen = corridorScreenRes.result.value;
    await clickScreen(corridorScreen.x, corridorScreen.y);
    const corridorOpen = await getOpenPanelBuilding();
    console.log(`Clicking corridor/terrain at (${Math.round(corridorScreen.x)}, ${Math.round(corridorScreen.y)}) -> opened: "${corridorOpen}"`);
    vpResults.terrainIgnored = corridorOpen === null;
    await closePanel();

    // 4. Click far away on southern crater terrain (world 1000, 1300)
    const southScreenRes = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const game = window.__OUTPOST_GAME__;
          const scene = game.scene.getScene('MarsScene');
          const camera = scene.cameras.main;
          const canvasRect = game.canvas.getBoundingClientRect();
          const screenX = canvasRect.left + (1000 - camera.worldView.x) * camera.zoom;
          const screenY = canvasRect.top + (1300 - camera.worldView.y) * camera.zoom;
          return { x: screenX, y: screenY };
        })()
      `,
      returnByValue: true,
    });
    const southScreen = southScreenRes.result.value;
    await clickScreen(southScreen.x, southScreen.y);
    const southOpen = await getOpenPanelBuilding();
    console.log(`Clicking distant south crater at (${Math.round(southScreen.x)}, ${Math.round(southScreen.y)}) -> opened: "${southOpen}"`);
    vpResults.farAwayIgnored = southOpen === null;
    await closePanel();

    // 5. Verify keyboard E interaction proximity
    // At start, astronaut is at Habitat: pressing E opens Habitat!
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'e', code: 'KeyE' });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'e', code: 'KeyE' });
    await sleep(400);
    const keyHabOpen = await getOpenPanelBuilding();
    console.log(`Keyboard E near Habitat -> opened: "${keyHabOpen}"`);
    await closePanel();

    // Now walk astronaut away from Habitat into empty terrain
    await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const game = window.__OUTPOST_GAME__;
          const scene = game.scene.getScene('MarsScene');
          scene.astronaut.setPosition(1000, 1300); // Teleport to empty dunes
          scene.refreshNearbyBuilding();
        })()
      `,
    });
    await sleep(200);

    // Check that prompt is hidden when far away
    const promptCheck = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const prompt = document.getElementById('building-prompt-container');
          return prompt ? prompt.hidden : true;
        })()
      `,
      returnByValue: true,
    });
    console.log(`Prompt hidden in dunes: ${promptCheck.result.value}`);

    // Press E while far away in dunes
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'e', code: 'KeyE' });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'e', code: 'KeyE' });
    await sleep(400);
    const dunesKeyOpen = await getOpenPanelBuilding();
    console.log(`Keyboard E in dunes (distant) -> opened: "${dunesKeyOpen}" (expected null)`);
    vpResults.keyboardProximity = keyHabOpen !== null && dunesKeyOpen === null && promptCheck.result.value;

    // Reset astronaut to start
    await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const game = window.__OUTPOST_GAME__;
          const scene = game.scene.getScene('MarsScene');
          scene.astronaut.setPosition(1000, 905);
          scene.refreshNearbyBuilding();
        })()
      `,
    });
    await sleep(300);

    // Capture screenshot
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png' });
    const screenshotPath = `scratch/desktop-verified-${vp.name}.png`;
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    console.log(`Saved screenshot: ${screenshotPath}`);

    results[vp.name] = vpResults;
  }

  // Teardown
  client.close();
  chrome.kill();
  preview.kill();

  console.log('\n--- Final Verification Summary ---');
  console.log(JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
