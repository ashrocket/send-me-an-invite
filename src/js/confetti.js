/**
 * Spring confetti burst — canvas-based, compositor-friendly.
 * Respects prefers-reduced-motion.
 */

const COLORS = ['#C3B1E1', '#A8E6CF', '#FFEAA7', '#FFB7B2', '#A0D2DB'];
const COUNT  = 50;

export function launchConfetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('confetti');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: COUNT }, () => ({
    x:             Math.random() * canvas.width,
    y:             Math.random() * canvas.height * 0.5 - canvas.height * 0.5,
    w:             Math.random() * 10 + 5,
    h:             Math.random() * 6  + 3,
    color:         COLORS[Math.floor(Math.random() * COLORS.length)],
    vx:            (Math.random() - 0.5) * 3,
    vy:            Math.random() * 4 + 2,
    rotation:      Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 12,
    opacity:       1,
  }));

  let rafId;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let active = false;

    for (const p of particles) {
      if (p.opacity <= 0) continue;
      active = true;

      p.x         += p.vx;
      p.y         += p.vy;
      p.vy        += 0.12; // gravity
      p.rotation  += p.rotationSpeed;

      // Fade once past 65 % of canvas height
      if (p.y > canvas.height * 0.65) {
        p.opacity -= 0.025;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (active) {
      rafId = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  cancelAnimationFrame(rafId);
  draw();
}
