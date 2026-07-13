// Particle simulation in background

const particleConfig = {
  enable: true,
  chars: [".", ".", "#", "~", ":", "'", "*"],
  mobileBreakpoint: 760,
  count: { desktop: 128, mobile: 42 },
  opacity: [0.22, 0.55],
  driftX: [-0.22, 0.22],
  driftY: [-0.55, -0.15], // -ve = upwards
  speed: [0.02, 0.06],
  pointerInfluenceRadius: 130,
};

function isMobileParticleViewport() {
  return window.matchMedia(
    `(max-width: ${particleConfig.mobileBreakpoint}px), (pointer: coarse)`
  ).matches;
}

function isLowPowerDevice() {
  const cores = navigator.hardwareConcurrency || 8;
  const memory = navigator.deviceMemory || 8;
  return cores <= 4 || memory <= 4;
}

function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function resetParticle(p, anywhere) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  p.x = randomBetween(0, w);
  p.y = anywhere ? randomBetween(0, h) : h + randomBetween(4, 24);
  p.driftX = randomBetween(...particleConfig.driftX);
  p.driftY = randomBetween(...particleConfig.driftY);
  p.opacity = randomBetween(...particleConfig.opacity);
  p.phase = randomBetween(0, Math.PI * 2);
  p.speed = randomBetween(...particleConfig.speed);
  p.el.textContent = sample(particleConfig.chars);
}

function createParticle(layer) {
  const el = document.createElement('span');
  layer.appendChild(el);
  const p = { el, x: 0, y: 0, driftX: 0, driftY: 0, opacity: 0, phase: 0, speed: 0 };
  resetParticle(p, true);
  return p;
}

function stepParticle(p, pointer, motionStep) {
  p.x += p.driftX * motionStep;
  p.y += p.driftY * motionStep;

  if (Number.isFinite(pointer.x)) {
    const dx = p.x - pointer.x;
    const dy = p.y - pointer.y;
    const dist = Math.hypot(dx, dy);
    const radius = particleConfig.pointerInfluenceRadius;
    if (dist < radius && dist > 0) {
      const force = (1 - dist / radius) ** 2;
      p.x += (dx / dist) * force * 1.8;
      p.y += (dy / dist) * force * 1.2;
    }
  }

  p.phase += p.speed * motionStep;
  const flicker = 0.72 + Math.sin(Date.now() * 0.0017 + p.phase) * 0.28;
  p.el.style.opacity = (p.opacity * flicker).toFixed(3);
  p.el.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0)`;

  if (p.y < -24 || p.y > window.innerHeight + 24 || p.x < -24 || p.x > window.innerWidth + 24) {
    resetParticle(p, false);
  }
}

function installAmbientParticles() {
  if (!particleConfig.enable) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.ascii-particles')) return;

  const layer = document.createElement('div');
  layer.className = 'ascii-particles';
  layer.setAttribute('aria-hidden', 'true');
  document.body.prepend(layer);

  const lowPower = isLowPowerDevice();
  const countScale = lowPower ? 0.6 : 1;
  const baseCount = isMobileParticleViewport() ? particleConfig.count.mobile : particleConfig.count.desktop;
  const count = Math.max(6, Math.round(baseCount * countScale));

  const particles = Array.from({ length: count }, () => createParticle(layer));

  const pointer = { x: NaN, y: NaN };
  const pointerEnabled = !isMobileParticleViewport() && !lowPower;

  if (pointerEnabled) {
    window.addEventListener('pointermove', e => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }, { passive: true });
    window.addEventListener('pointerleave', () => {
      pointer.x = NaN;
      pointer.y = NaN;
    }, { passive: true });
  }

  window.addEventListener('resize', () => {
    particles.forEach(p => resetParticle(p, true));
  }, { passive: true });

  let running = true;
  let rafId = 0;
  let lastTime = 0;

  function frame(time) {
    rafId = 0;
    if (!running) return;
    const elapsed = lastTime === 0 ? 16 : Math.min(96, Math.max(1, time - lastTime));
    lastTime = time;
    const motionStep = elapsed / 16;
    particles.forEach(p => stepParticle(p, pointer, motionStep));
    rafId = window.requestAnimationFrame(frame);
  }

  function start() {
    if (rafId === 0) {
      running = true;
      lastTime = 0;
      rafId = window.requestAnimationFrame(frame);
    }
  }

  function stop() {
    running = false;
    if (rafId !== 0) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  start();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') start();
    else stop();
  });
}

installAmbientParticles();