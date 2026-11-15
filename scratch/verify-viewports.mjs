import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE_DIR = path.resolve('./scratch/chrome-test-profile');
const URL = 'http://localhost:4173/';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForHttp(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {}
    await sleep(250);
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

  async captureScreenshot() {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    return Buffer.from(res.data, 'base64');
  }

  close() {
    this.ws.close();
  }
}

async function waitForGame(client, timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await client.evaluate(`Boolean(window.__OUTPOST_GAME__ && window.__OUTPOST_GAME__.scene && window.__OUTPOST_GAME__.scene.scenes[0])`);
    if (ready) return true;
    await sleep(250);
  }
  return false;
}

const VIEWPORTS = [
  { name: 'Desktop', width: 1366, height: 768, touch: false, mobile: false, file: 'viewport-desktop-1366x768.png' },
  { name: 'Full HD', width: 1920, height: 1080, touch: false, mobile: false, file: 'viewport-fhd-1920x1080.png' },
  { name: 'Mobile 375x812', width: 375, height: 812, touch: true, mobile: true, file: 'viewport-mobile-375x812.png' },
  { name: 'Mobile 390x844', width: 390, height: 844, touch: true, mobile: true, file: 'viewport-mobile-390x844.png' },
  { name: 'Tablet Portrait', width: 768, height: 1024, touch: true, mobile: true, file: 'viewport-tablet-768x1024.png' },
  { name: 'Tablet Landscape', width: 1024, height: 768, touch: true, mobile: true, file: 'viewport-tablet-1024x768.png' },
];

async function main() {
  if (!existsSync('./scratch')) mkdirSync('./scratch', { recursive: true });

  console.log('Starting preview server...');
  const preview = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    shell: true,
    stdio: 'ignore'
  });

  console.log('Waiting for preview server on port 4173...');
  await sleep(2500);

  console.log('Launching Chrome...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
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

    console.log(`Navigating to ${URL}...`);
    await client.send('Page.navigate', { url: URL });
    await waitForGame(client);

    const results = [];

    for (const vp of VIEWPORTS) {
      console.log(`\n========================================`);
      console.log(`Testing Viewport: ${vp.name} (${vp.width}x${vp.height}, touch: ${vp.touch})`);
      console.log(`========================================`);

      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile
      });

      if (vp.touch) {
        await client.send('Emulation.setTouchEmulationEnabled', {
          enabled: true,
          maxTouchPoints: 5
        });
        await client.send('Emulation.setEmitTouchEventsForMouse', {
          enabled: true,
          configuration: 'mobile'
        });
      } else {
        await client.send('Emulation.setTouchEmulationEnabled', {
          enabled: false
        });
        await client.send('Emulation.setEmitTouchEventsForMouse', {
          enabled: false
        });
      }

      await client.send('Page.reload');
      await waitForGame(client);
      await sleep(1500);

      // Dismiss tutorial if visible
      await client.evaluate(`
        (() => {
          const btn = document.querySelector('[data-tutorial-skip]');
          if (btn) btn.click();
        })()
      `);
      await sleep(800);

      // Verify layout state
      const checkData = await client.evaluate(`
        (() => {
          const game = window.__OUTPOST_GAME__ || (window.Phaser && window.Phaser.GAMES && window.Phaser.GAMES[0]);
          if (!game) return { error: 'No Phaser game instance' };
          const scene = game.scene.scenes[0];
          if (!scene) return { error: 'No scene found' };

          const hasJoystick = Boolean(scene.getJoystickBase?.() && scene.getJoystickBase().active);
          const joystickCenter = scene.getJoystickCenter ? scene.getJoystickCenter() : null;
          const canvas = game.canvas;
          const canvasComputed = window.getComputedStyle(canvas);
          const touchAction = canvasComputed.touchAction;

          // Check building prompt position and overlap
          const promptEl = document.querySelector('.building-prompt-overlay');
          const promptRect = promptEl ? promptEl.getBoundingClientRect() : null;
          const objectivesEl = document.querySelector('.objectives-overlay');
          const objectivesRect = objectivesEl ? objectivesEl.getBoundingClientRect() : null;

          return {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            touchAction,
            hasJoystick,
            joystickCenter: joystickCenter ? { x: joystickCenter.x, y: joystickCenter.y } : null,
            promptRect: promptRect ? { top: promptRect.top, left: promptRect.left, width: promptRect.width, height: promptRect.height } : null,
            objectivesRect: objectivesRect ? { top: objectivesRect.top, left: objectivesRect.left, width: objectivesRect.width, height: objectivesRect.height } : null,
            isTouchActive: scene.isTouchActive ? scene.isTouchActive() : false
          };
        })()
      `);

      console.log('Viewport State:', checkData);

      // Test building interaction prompt & modal interactivity before movement
      const buildingInteractionTest = await client.evaluate(`
        (() => {
          const promptBtn = document.querySelector('[data-building-interact]');
          const hasPrompt = Boolean(promptBtn);
          let modalOpened = false;
          let modalClosed = false;

          if (promptBtn) {
            promptBtn.click();
            const panel = document.getElementById('building-panel-container');
            modalOpened = Boolean(panel && !panel.hidden);
            const closeBtn = panel ? panel.querySelector('[data-building-close]') : null;
            if (closeBtn) closeBtn.click();
            modalClosed = Boolean(panel && panel.hidden);
          }

          return {
            hasPrompt,
            modalOpened,
            modalClosed
          };
        })()
      `);
      console.log('Building Proximity & Modal Test:', buildingInteractionTest);

      let movementTests = { right: false, down: false, up: false, left: false, diagonal: false, releaseStops: false };

      if (vp.touch && checkData.joystickCenter) {
        // Get absolute screen coordinates of joystick center
        const screenPos = await client.evaluate(`
          (() => {
            const game = window.__OUTPOST_GAME__;
            const canvas = game.canvas;
            const scene = game.scene.scenes[0];
            const center = scene.getJoystickCenter();
            const rect = canvas.getBoundingClientRect();
            return {
              x: rect.left + center.x,
              y: rect.top + center.y
            };
          })()
        `);

        const startX = screenPos.x;
        const startY = screenPos.y;

        // 1. Touch Start
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x: Math.round(startX), y: Math.round(startY), id: 0 }]
        });
        await sleep(100);

        // 2. Move Right
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: Math.round(startX + 28), y: Math.round(startY), id: 0 }]
        });
        await sleep(100);
        movementTests.right = await client.evaluate(`window.__OUTPOST_GAME__.scene.scenes[0].getJoystickVector().x > 0`);

        // 3. Move Down
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: Math.round(startX), y: Math.round(startY + 28), id: 0 }]
        });
        await sleep(100);
        movementTests.down = await client.evaluate(`window.__OUTPOST_GAME__.scene.scenes[0].getJoystickVector().y > 0`);

        // 4. Move Up
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: Math.round(startX), y: Math.round(startY - 28), id: 0 }]
        });
        await sleep(100);
        movementTests.up = await client.evaluate(`window.__OUTPOST_GAME__.scene.scenes[0].getJoystickVector().y < 0`);

        // 5. Move Left
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: Math.round(startX - 28), y: Math.round(startY), id: 0 }]
        });
        await sleep(100);
        movementTests.left = await client.evaluate(`window.__OUTPOST_GAME__.scene.scenes[0].getJoystickVector().x < 0`);

        // 6. Diagonal (Down-Right)
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: Math.round(startX + 24), y: Math.round(startY + 24), id: 0 }]
        });
        await sleep(100);
        movementTests.diagonal = await client.evaluate(`
          window.__OUTPOST_GAME__.scene.scenes[0].getJoystickVector().x > 0 &&
          window.__OUTPOST_GAME__.scene.scenes[0].getJoystickVector().y > 0
        `);

        // 7. Touch End
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchEnd',
          touchPoints: []
        });
        await sleep(100);
        movementTests.releaseStops = await client.evaluate(`
          window.__OUTPOST_GAME__.scene.scenes[0].getJoystickVector().x === 0 &&
          window.__OUTPOST_GAME__.scene.scenes[0].getJoystickVector().y === 0
        `);

        console.log('Touch Movement Verification:', movementTests);
      } else {
        // Desktop keyboard movement verification
        const keyboardResult = await client.evaluate(`
          (() => {
            const game = window.__OUTPOST_GAME__;
            const scene = game.scene.scenes[0];
            const body = scene.astronaut.body;

            // Test WASD right
            scene.wasdKeys.right.isDown = true;
            scene.update(0, 16);
            const kRight = body.velocity.x > 0;
            scene.wasdKeys.right.isDown = false;

            // Test WASD down
            scene.wasdKeys.down.isDown = true;
            scene.update(0, 16);
            const kDown = body.velocity.y > 0;
            scene.wasdKeys.down.isDown = false;

            // Test WASD up
            scene.wasdKeys.up.isDown = true;
            scene.update(0, 16);
            const kUp = body.velocity.y < 0;
            scene.wasdKeys.up.isDown = false;

            // Test WASD left
            scene.wasdKeys.left.isDown = true;
            scene.update(0, 16);
            const kLeft = body.velocity.x < 0;
            scene.wasdKeys.left.isDown = false;

            // Test diagonal
            scene.wasdKeys.right.isDown = true;
            scene.wasdKeys.down.isDown = true;
            scene.update(0, 16);
            const kDiag = body.velocity.x > 0 && body.velocity.y > 0;
            scene.wasdKeys.right.isDown = false;
            scene.wasdKeys.down.isDown = false;

            // Test release
            scene.update(0, 16);
            const kStopped = body.velocity.x === 0 && body.velocity.y === 0;

            return {
              right: kRight,
              down: kDown,
              up: kUp,
              left: kLeft,
              diagonal: kDiag,
              releaseStops: kStopped
            };
          })()
        `);
        movementTests = keyboardResult;
        console.log('Desktop Keyboard Movement Verification:', movementTests);
      }

      // Capture screenshot
      const shot = await client.captureScreenshot();
      writeFileSync(`./scratch/${vp.file}`, shot);
      console.log(`Saved screenshot: scratch/${vp.file}`);

      results.push({
        viewport: vp.name,
        resolution: `${vp.width}x${vp.height}`,
        touch: vp.touch,
        hasJoystick: checkData.hasJoystick,
        touchActionNone: checkData.touchAction === 'none',
        buildingInteraction: buildingInteractionTest,
        movement: movementTests
      });
    }

    console.log('\n========================================');
    console.log('FINAL VERIFICATION SUMMARY:');
    console.log(JSON.stringify(results, null, 2));

    client.close();
  } finally {
    chrome.kill();
    preview.kill();
  }
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
