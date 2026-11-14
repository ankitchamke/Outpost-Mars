/**
 * OUTPOST: MARS — Canvas Viewport Renderer
 * Handles responsive high-DPI rendering of the Martian surface and Outpost title.
 */

export interface CanvasDimensions {
  width: number;
  height: number;
  dpr: number;
}

export class MarsCanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private dimensions: CanvasDimensions = { width: 0, height: 0, dpr: 1 };
  private stars: Array<{ x: number; y: number; radius: number; alpha: number }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to acquire 2D rendering context for Canvas');
    }
    this.ctx = context;
    this.initStars();
    this.handleResize();
    this.setupResizeObserver();
  }

  /**
   * Generates a stable pseudo-random star field in the upper sky.
   */
  private initStars(): void {
    this.stars = [];
    const count = 45;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: (i * 37) % 1000 / 1000,
        y: ((i * 59) % 400) / 1000, // Upper 40% of viewport
        radius: (i % 3 === 0 ? 1.5 : 1.0),
        alpha: 0.3 + ((i % 5) * 0.12),
      });
    }
  }

  /**
   * Sets up ResizeObserver for responsive layout updates.
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
        this.render();
      });
      this.resizeObserver.observe(this.canvas.parentElement);
    } else {
      window.addEventListener('resize', this.onWindowResize);
    }
  }

  private onWindowResize = (): void => {
    this.handleResize();
    this.render();
  };

  /**
   * Resizes the canvas buffer for crisp high-DPI displays.
   */
  public handleResize(): CanvasDimensions {
    const parent = this.canvas.parentElement;
    const width = parent ? parent.clientWidth : window.innerWidth;
    const height = parent ? parent.clientHeight : window.innerHeight;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    this.dimensions = { width, height, dpr };

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // Normalize coordinates so 1 unit = 1 CSS pixel
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return this.dimensions;
  }

  public getDimensions(): CanvasDimensions {
    return { ...this.dimensions };
  }

  /**
   * Main render method: Mars sky, stars, crater rim, ground terrain, and title banner.
   */
  public render(): void {
    const { width, height } = this.dimensions;
    if (width === 0 || height === 0) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    // 1. Martian Sky Gradient
    const horizonY = height * 0.62;
    const skyGradient = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGradient.addColorStop(0, '#150d1a'); // Deep cosmic dusk
    skyGradient.addColorStop(0.5, '#2e1521'); // Atmospheric transition
    skyGradient.addColorStop(1, '#53232b'); // Jezero dust haze
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, horizonY);

    // 2. Stars in the upper atmosphere
    ctx.save();
    for (const star of this.stars) {
      ctx.fillStyle = `rgba(240, 235, 230, ${star.alpha})`;
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Jezero Crater Distant Rim (Silhouettes)
    ctx.fillStyle = '#672825';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.bezierCurveTo(
      width * 0.25, horizonY - 45,
      width * 0.45, horizonY - 25,
      width * 0.7, horizonY - 60
    );
    ctx.bezierCurveTo(
      width * 0.85, horizonY - 30,
      width * 0.95, horizonY - 40,
      width, horizonY - 20
    );
    ctx.lineTo(width, horizonY);
    ctx.closePath();
    ctx.fill();

    // 4. Jezero Crater Mid-ground ridge
    ctx.fillStyle = '#833428';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.quadraticCurveTo(width * 0.3, horizonY - 25, width * 0.6, horizonY - 10);
    ctx.quadraticCurveTo(width * 0.85, horizonY - 20, width, horizonY - 5);
    ctx.lineTo(width, horizonY);
    ctx.closePath();
    ctx.fill();

    // 5. Martian Surface Regolith Foreground
    const groundGradient = ctx.createLinearGradient(0, horizonY, 0, height);
    groundGradient.addColorStop(0, '#a5442b');
    groundGradient.addColorStop(0.3, '#8e3822');
    groundGradient.addColorStop(1, '#541f14');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, horizonY, width, height - horizonY);

    // 6. Base Foundation Landing Grid (Perspective Lines)
    ctx.strokeStyle = 'rgba(223, 138, 102, 0.18)';
    ctx.lineWidth = 1;
    const gridCols = 8;
    for (let i = 0; i <= gridCols; i++) {
      const xFactor = i / gridCols;
      const topX = width * 0.2 + xFactor * (width * 0.6);
      const bottomX = width * 0.05 + xFactor * (width * 0.9);
      ctx.beginPath();
      ctx.moveTo(topX, horizonY + 20);
      ctx.lineTo(bottomX, height);
      ctx.stroke();
    }

    const gridRows = 5;
    for (let j = 1; j <= gridRows; j++) {
      const yFactor = (j / gridRows) ** 1.6;
      const rowY = horizonY + 20 + yFactor * (height - horizonY - 20);
      ctx.beginPath();
      ctx.moveTo(width * 0.05, rowY);
      ctx.lineTo(width * 0.95, rowY);
      ctx.stroke();
    }

    // 7. Title Banner: "OUTPOST: MARS"
    this.renderTitle(width, height);
  }

  /**
   * Renders the OUTPOST: MARS title and subtitle onto the Canvas.
   */
  private renderTitle(width: number, height: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerY = height * 0.32;

    // Subtitle / Mission Tag
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.letterSpacing = '0.25em';
    ctx.fillStyle = '#df8a66';
    ctx.fillText('JEZERO CRATER • MISSION TRAINER', width / 2, centerY - 38);

    // Main Title
    const fontSize = Math.max(28, Math.min(64, Math.floor(width * 0.06)));
    ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
    ctx.letterSpacing = '0.08em';

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillText('OUTPOST: MARS', width / 2 + 2, centerY + 2);

    // Glowing title text
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('OUTPOST: MARS', width / 2, centerY);

    // Technical Subline
    ctx.font = '500 12px ui-monospace, monospace';
    ctx.letterSpacing = '0.12em';
    ctx.fillStyle = 'rgba(240, 244, 248, 0.7)';
    ctx.fillText('PHASE 01 FOUNDATION ACTIVE', width / 2, centerY + 34);

    ctx.restore();
  }

  /**
   * Starts a continuous render loop (optional, or static render on demand).
   */
  public start(): void {
    const loop = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    if (!this.animationFrameId) {
      loop();
    }
  }

  public stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public destroy(): void {
    this.stop();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onWindowResize);
    }
  }
}
