/** Registers every built-in effect. */
import { registerEffect } from './registry.js';
import { blob, dot, ring } from './shape.js';
import { trail } from './trail.js';
import { particles } from './particles.js';
import { ripple } from './ripple.js';
import { spotlight } from './spotlight.js';
import { glow } from './glow.js';
import { snake } from './snake.js';
import { orbit } from './orbit.js';
import { crosshair } from './crosshair.js';
import { image } from './image.js';

const BUILT_IN = { dot, ring, blob, trail, particles, ripple, spotlight, glow, snake, orbit, crosshair, image };

for (const [name, definition] of Object.entries(BUILT_IN)) registerEffect(name, definition);

export { registerEffect, getEffect, listEffects } from './registry.js';
