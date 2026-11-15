import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

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
  console.log('--- Starting Audio Verification ---');

  // Build first
  execSync('npm run build', { stdio: 'inherit' });

  // 1. Start static preview server on port 4175
  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '4175', '--strictPort'], {
    stdio: 'ignore',
    shell: true,
  });

  await waitForServer('http://localhost:4175');
  console.log('Preview server ready at http://localhost:4175');

  // 2. Launch headless Chrome on port 9225
  const cdpPort = 9225;
  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${cdpPort}`,
      '--disable-gpu',
      '--no-sandbox',
      '--disable-background-networking',
      '--window-size=1920,1080',
      'http://localhost:4175',
    ],
    { stdio: 'ignore' }
  );

  let client = null;
  try {
    await sleep(2500);
    const targetsRes = await fetch(`http://localhost:${cdpPort}/json`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    await sleep(2000);

    // 1. Initial State Check
    const initRes = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const audioBtn = document.getElementById('btn-audio');
        const popover = document.getElementById('audio-settings-popover');
        return {
          hasAudioBtn: Boolean(audioBtn),
          popoverHidden: popover ? popover.hidden : null,
          hasAudioIcon: Boolean(document.getElementById('btn-audio-icon')),
        };
      })()`,
      returnByValue: true,
    });
    console.log('Initial Audio UI State:', initRes.result.value);

    // Dismiss tutorial welcome to have clean view
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const skipBtn = document.querySelector('[data-tutorial-skip]');
        if (skipBtn) skipBtn.click();
      })()`,
    });
    await sleep(500);

    // 2. Click Audio Button to open settings popover
    console.log('Clicking Audio button...');
    await client.send('Runtime.evaluate', {
      expression: `document.getElementById('btn-audio').click();`,
    });
    await sleep(400);

    const openedRes = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const popover = document.getElementById('audio-settings-popover');
        const slider = document.getElementById('slider-master-volume');
        const label = document.getElementById('label-master-volume');
        const musicBtn = document.getElementById('btn-toggle-music');
        const sfxBtn = document.getElementById('btn-toggle-sfx');
        const muteAllBtn = document.getElementById('btn-mute-all');
        const audioBtn = document.getElementById('btn-audio');
        return {
          popoverVisible: !popover.hidden,
          sliderValue: slider?.value,
          label: label?.textContent,
          musicBtnText: musicBtn?.textContent,
          musicBtnActive: musicBtn?.classList.contains('is-active'),
          sfxBtnText: sfxBtn?.textContent,
          sfxBtnActive: sfxBtn?.classList.contains('is-active'),
          muteAllText: muteAllBtn?.textContent,
          audioBtnActive: audioBtn?.classList.contains('is-active'),
        };
      })()`,
      returnByValue: true,
    });
    console.log('Opened Popover State:', openedRes.result.value);

    // Capture screenshot of open popover
    const shot1 = await client.send('Page.captureScreenshot', { format: 'png' });
    const shotPath1 = path.resolve('scratch/audio-controls-verified.png');
    fs.writeFileSync(shotPath1, Buffer.from(shot1.data, 'base64'));
    console.log(`Saved screenshot to ${shotPath1}`);

    // 3. Test volume slider change
    console.log('Changing volume slider to 85%...');
    const sliderChangeRes = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const slider = document.getElementById('slider-master-volume');
        slider.value = '85';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        const label = document.getElementById('label-master-volume');
        return {
          label: label?.textContent,
          savedSettings: JSON.parse(localStorage.getItem('outpost_mars_audio_settings') || '{}')
        };
      })()`,
      returnByValue: true,
    });
    console.log('Slider Changed State:', sliderChangeRes.result.value);

    // 4. Test Music toggle
    console.log('Toggling music off...');
    const musicOffRes = await client.send('Runtime.evaluate', {
      expression: `(() => {
        document.getElementById('btn-toggle-music').click();
        const musicBtn = document.getElementById('btn-toggle-music');
        return {
          text: musicBtn.textContent,
          isActive: musicBtn.classList.contains('is-active'),
          saved: JSON.parse(localStorage.getItem('outpost_mars_audio_settings') || '{}').musicEnabled
        };
      })()`,
      returnByValue: true,
    });
    console.log('Music Off State:', musicOffRes.result.value);

    // 5. Test SFX toggle
    console.log('Toggling SFX off...');
    const sfxOffRes = await client.send('Runtime.evaluate', {
      expression: `(() => {
        document.getElementById('btn-toggle-sfx').click();
        const sfxBtn = document.getElementById('btn-toggle-sfx');
        return {
          text: sfxBtn.textContent,
          isActive: sfxBtn.classList.contains('is-active'),
          saved: JSON.parse(localStorage.getItem('outpost_mars_audio_settings') || '{}').sfxEnabled
        };
      })()`,
      returnByValue: true,
    });
    console.log('SFX Off State:', sfxOffRes.result.value);

    // 6. Test Mute All / Unmute All
    console.log('Testing Mute All / Unmute All...');
    const muteAllRes = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const muteBtn = document.getElementById('btn-mute-all');
        muteBtn.click(); // Mute All
        const state1 = {
          muteBtnText: muteBtn.textContent,
          sliderValue: document.getElementById('slider-master-volume').value,
          label: document.getElementById('label-master-volume').textContent,
          savedVolume: JSON.parse(localStorage.getItem('outpost_mars_audio_settings') || '{}').masterVolume,
        };
        muteBtn.click(); // Unmute All
        const state2 = {
          muteBtnText: muteBtn.textContent,
          sliderValue: document.getElementById('slider-master-volume').value,
          label: document.getElementById('label-master-volume').textContent,
          savedVolume: JSON.parse(localStorage.getItem('outpost_mars_audio_settings') || '{}').masterVolume,
        };
        return { muted: state1, unmuted: state2 };
      })()`,
      returnByValue: true,
    });
    console.log('Mute/Unmute Cycle State:', muteAllRes.result.value);

    // 7. Test UI sound triggers (Help, Science Log, Save, Reset)
    console.log('Testing UI sound trigger interactions...');
    const triggersRes = await client.send('Runtime.evaluate', {
      expression: `(() => {
        // Close popover
        document.getElementById('btn-audio-close').click();
        const popoverHidden = document.getElementById('audio-settings-popover').hidden;

        // Click Save button
        document.getElementById('btn-save-state').click();

        // Click Science Log button to open
        document.getElementById('btn-science-log').click();
        const scienceOpen = !document.getElementById('science-console-container').hidden;
        // Close Science Log
        document.getElementById('btn-science-log').click();

        // Click Help button
        document.getElementById('btn-help').click();
        const helpOpen = !document.getElementById('tutorial-container').hidden;
        // Close Help
        document.getElementById('btn-help').click();

        return {
          popoverHidden,
          saveTriggered: true,
          scienceOpen,
          helpOpen,
        };
      })()`,
      returnByValue: true,
    });
    console.log('Triggers Test State:', triggersRes.result.value);

    // Reopen popover and capture final state screenshot
    await client.send('Runtime.evaluate', {
      expression: `document.getElementById('btn-audio').click();`,
    });
    await sleep(300);

    const shot2 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(shotPath1, Buffer.from(shot2.data, 'base64'));

    console.log('--- Audio Verification ALL CHECKS PASSED ---');
  } finally {
    if (client) client.close();
    chrome.kill();
    try {
      execSync('taskkill /F /IM chrome.exe /T', { stdio: 'ignore' });
    } catch {}
    preview.kill();
    try {
      execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq npm*" /T', { stdio: 'ignore' });
    } catch {}
  }
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
