import { Particle } from './types';

export class ParticleSystem {
  private particles: Particle[] = [];
  private readonly maxParticles = 300;

  public update(dtFactor: number = 1.0) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtFactor;
      p.y += p.vy * dtFactor;
      p.vy += 0.2 * dtFactor; // slight gravity
      p.life += dtFactor;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife || p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'spark') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'square') {
        ctx.fillRect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  public emitRunDust(x: number, y: number, color: string = 'rgba(255, 255, 255, 0.4)') {
    if (this.particles.length >= this.maxParticles) return;
    this.particles.push({
      x: x + (Math.random() * 8 - 4),
      y: y + (Math.random() * 4 - 2),
      vx: -(Math.random() * 2 + 1),
      vy: -(Math.random() * 1 + 0.5),
      radius: Math.random() * 3 + 2,
      color,
      alpha: 0.6,
      life: 0,
      maxLife: 20 + Math.random() * 10,
      shape: 'circle',
    });
  }

  public emitJumpBurst(x: number, y: number, color: string) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = Math.random() * 4 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        radius: Math.random() * 3 + 2,
        color,
        alpha: 0.8,
        life: 0,
        maxLife: 25 + Math.random() * 15,
        shape: 'spark',
      });
    }
  }

  public emitLandPuff(x: number, y: number, width: number) {
    for (let i = 0; i < 14; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      this.particles.push({
        x: x + (dir * width * 0.3) + (Math.random() * 10 - 5),
        y: y,
        vx: dir * (Math.random() * 3.5 + 1.5),
        vy: -(Math.random() * 1.5 + 0.5),
        radius: Math.random() * 3.5 + 2,
        color: 'rgba(255, 255, 255, 0.45)',
        alpha: 0.7,
        life: 0,
        maxLife: 22 + Math.random() * 10,
        shape: 'circle',
      });
    }
  }

  public emitCoinSparkles(x: number, y: number) {
    const colors = ['#fbbf24', '#f59e0b', '#fef08a', '#ffffff'];
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 0,
        maxLife: 30 + Math.random() * 15,
        shape: 'spark',
      });
    }
  }

  public emitDeathExplosion(x: number, y: number, primaryColor: string) {
    const colors = [primaryColor, '#ef4444', '#f97316', '#fbbf24', '#ffffff'];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 5 + 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 0,
        maxLife: 40 + Math.random() * 20,
        shape: Math.random() > 0.5 ? 'square' : 'spark',
      });
    }
  }

  public clear() {
    this.particles = [];
  }
}
