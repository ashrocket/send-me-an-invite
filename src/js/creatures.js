/**
 * Spring Scheduling Microsite — Lottie Creature Initialization
 * Loads Lottie animations for spring-themed ambient creatures.
 * Respects prefers-reduced-motion.
 */
import lottie from 'lottie-web/build/player/lottie_light.min.js';

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (!prefersReducedMotion) {
  // Butterfly — crosses the screen on a gentle path
  const butterflyEl = document.getElementById('creature-butterfly');
  if (butterflyEl) {
    lottie.loadAnimation({
      container: butterflyEl,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/assets/lottie/butterfly.json',
    });
  }

  // Leaves and flowers containers exist in HTML for future Lottie data.
  // For now they serve as CSS-animated placeholders. When Lottie JSON
  // files are added for leaves/flowers, uncomment the blocks below.

  // const leavesEl = document.getElementById('creature-leaves');
  // if (leavesEl) {
  //   lottie.loadAnimation({
  //     container: leavesEl,
  //     renderer: 'svg',
  //     loop: true,
  //     autoplay: true,
  //     path: '/assets/lottie/leaves.json',
  //   });
  // }

  // const flowersEl = document.getElementById('creature-flowers');
  // if (flowersEl) {
  //   lottie.loadAnimation({
  //     container: flowersEl,
  //     renderer: 'svg',
  //     loop: true,
  //     autoplay: true,
  //     path: '/assets/lottie/flowers.json',
  //   });
  // }
}
