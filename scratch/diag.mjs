const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const target = targets.find(t => t.type === 'page') || targets[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 1;
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const curId = id++;
  const handler = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id === curId) {
      ws.removeEventListener('message', handler);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };
  ws.addEventListener('message', handler);
  ws.send(JSON.stringify({ id: curId, method, params }));
});

const res = await send('Runtime.evaluate', {
  expression: `(() => {
    const game = window.__OUTPOST_GAME__;
    if (!game) return { error: 'no game' };
    const scene = game.scene.scenes[0];
    const canvas = game.canvas;
    const center = scene.getJoystickCenter();
    const rect = canvas.getBoundingClientRect();

    let logs = [];
    const origDown = scene.handleJoystickPointerDown.bind(scene);
    scene.handleJoystickPointerDown = function(p) {
      logs.push({ event: 'down', pId: p.id, px: p.x, py: p.y, cx: center.x, cy: center.y, dist: Phaser.Math.Distance.Between(p.x, p.y, center.x, center.y) });
      origDown(p);
    };

    const startX = rect.left + center.x;
    const startY = rect.top + center.y;

    const downEv = new PointerEvent('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: startX, clientY: startY, bubbles: true, cancelable: true });
    canvas.dispatchEvent(downEv);

    const moveEv = new PointerEvent('pointermove', { pointerId: 2, pointerType: 'touch', clientX: startX + 30, clientY: startY, bubbles: true, cancelable: true });
    canvas.dispatchEvent(moveEv);

    return { logs, vector: { x: scene.getJoystickVector().x, y: scene.getJoystickVector().y }, pointerId: scene.getJoystickPointerId() };
  })()`,
  returnByValue: true
});
console.log('Diagnostic result:', JSON.stringify(res.result.value, null, 2));
ws.close();
