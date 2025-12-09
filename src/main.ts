
// Drag state
let isDragging = false;
let dragEnd: {x: number, y: number} | null = null;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = '';
const canvas = document.createElement('canvas');
canvas.id = 'game-canvas';
canvas.style.display = 'block';
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100vw';
canvas.style.height = '100vh';
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
app.appendChild(canvas);

// Add event listeners only after canvas is initialized

function getPointerPosition(e: MouseEvent | TouchEvent): {x: number, y: number} {
  const rect = canvas.getBoundingClientRect();
  if (e instanceof MouseEvent) {
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  } else if (e instanceof TouchEvent) {
    const touch = e.touches[0] || e.changedTouches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }
  return {x: 0, y: 0};
}

function handleDragStart(e: MouseEvent | TouchEvent) {
  isDragging = true;
  dragEnd = getPointerPosition(e);
}

function handleDragMove(e: MouseEvent | TouchEvent) {
  if (!isDragging) return;
  dragEnd = getPointerPosition(e);
}

function handleDragEnd(e?: MouseEvent | TouchEvent) {
  if (isDragging && dragEnd) {
    // Set velocity in the direction of the dashed line (opposite drag direction)
    const dx = x - dragEnd.x;
    const dy = y - dragEnd.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      // Tune this multiplier for feel
      const speedMultiplier = 9.0;
      vx = (dx / len) * len * speedMultiplier;
      vy = (dy / len) * len * speedMultiplier;
      launched = true;
    }
  }
  isDragging = false;
  dragEnd = null;
}


let launched = false;
// Mouse events
canvas.addEventListener('mousedown', handleDragStart);
canvas.addEventListener('mousemove', handleDragMove);
canvas.addEventListener('mouseup', handleDragEnd);

// Touch events
canvas.addEventListener('touchstart', handleDragStart);
canvas.addEventListener('touchmove', handleDragMove);
canvas.addEventListener('touchend', handleDragEnd);

// Physics constants
const GRAVITY = 980; // px/s^2
const RESTITUTION = 0.75; // bounciness


// Ball and wall color state
let ballColor = '#fff';
let wallColor = '#fff';

// Ball state
let radius = Math.min(canvas.width, canvas.height) * 0.05;
let x = canvas.width / 2;
let y = canvas.height / 2;
let vx = 0; // horizontal velocity (px/s)
let vy = 0; // vertical velocity (px/s)

function randomBrightColor() {
  // HSL with high saturation and lightness
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h}, 90%, 60%)`;
}


// Wall state (4 walls around the center)
const wallDistance = Math.min(canvas.width, canvas.height) * 0.25;
const wallThickness = 20;
let wallLeft = x - wallDistance;
let wallRight = x + wallDistance;
let wallTop = y - wallDistance;
let wallBottom = y + wallDistance;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  radius = Math.min(canvas.width, canvas.height) * 0.05;
  x = canvas.width / 2;
  y = canvas.height / 2;
  // Update wall positions
  const wallDist = Math.min(canvas.width, canvas.height) * 0.25;
  wallLeft = x - wallDist;
  wallRight = x + wallDist;
  wallTop = y - wallDist;
  wallBottom = y + wallDist;
}

window.addEventListener('resize', resize);

let lastTime = performance.now();

function update(dt: number) {
  if (launched && !isDragging) {
    vy += GRAVITY * dt;
    x += vx * dt;
    y += vy * dt;
    // (Removed obsolete groundY collision and friction logic)
    // Collision with 4 walls
    if (x - radius < wallLeft) {
      x = wallLeft + radius;
      vx = -vx * RESTITUTION;
      ballColor = randomBrightColor();
      wallColor = randomBrightColor();
    } else if (x + radius > wallRight) {
      x = wallRight - radius;
      vx = -vx * RESTITUTION;
      ballColor = randomBrightColor();
      wallColor = randomBrightColor();
    }
    if (y - radius < wallTop) {
      y = wallTop + radius;
      vy = -vy * RESTITUTION;
      ballColor = randomBrightColor();
      wallColor = randomBrightColor();
    } else if (y + radius > wallBottom) {
      // If moving downward and close to the bottom, only snap if not bouncing
      if (vy > 0 && (y + radius - wallBottom) > 0 && Math.abs(vy) < 30) {
        y = wallBottom - radius;
        vy = 0;
        ballColor = randomBrightColor();
        wallColor = randomBrightColor();
      } else {
        y = wallBottom - radius;
        vy = -vy * RESTITUTION;
        ballColor = randomBrightColor();
        wallColor = randomBrightColor();
      }
    }
    // Apply friction to vx when ball is rolling on the bottom wall (after all collisions)
    const EPS = 2.5;
    // Only apply friction if the ball is resting on the bottom wall (not bouncing)
    const onBottomWall = Math.abs((y + radius) - wallBottom) < EPS && Math.abs(vy) < 5;
    if (onBottomWall) {
      const FRICTION = 150; // px/s^2
      const frictionThisFrame = FRICTION * dt * Math.sign(vx);
      if (Math.abs(vx) < 2) {
        vx = 0;
      } else {
        vx -= frictionThisFrame;
      }
    }
  }


}

function draw() {
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#444';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw dashed line in the opposite direction while dragging
  if (isDragging && dragEnd) {
    drawDashedLineOpposite(ctx, x, y, dragEnd.x, dragEnd.y, ballColor);
  }

  // Draw drag arrow if dragging
  if (isDragging && dragEnd) {
    drawArrow(ctx, x, y, dragEnd.x, dragEnd.y, ballColor);
  }

  // Draw ball
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = ballColor;
  ctx.fill();

  // Draw 4 walls
  ctx.fillStyle = wallColor;
  // Left wall
  ctx.fillRect(wallLeft - wallThickness, wallTop - wallThickness, wallThickness, wallBottom - wallTop + 2 * wallThickness);
  // Right wall
  ctx.fillRect(wallRight, wallTop - wallThickness, wallThickness, wallBottom - wallTop + 2 * wallThickness);
  // Top wall
  ctx.fillRect(wallLeft, wallTop - wallThickness, wallRight - wallLeft, wallThickness);
  // Bottom wall
  ctx.fillRect(wallLeft, wallBottom, wallRight - wallLeft, wallThickness);
}

// Draw a dashed line from (x, y) in the opposite direction of (toX, toY), extending until it leaves the canvas
function drawDashedLineOpposite(ctx: CanvasRenderingContext2D, x: number, y: number, toX: number, toY: number, color: string) {
  const dx = x - toX;
  const dy = y - toY;
  // Normalize direction
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  let dirX = dx / len;
  let dirY = dy / len;
  let px = x;
  let py = y;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, py);
  let bounces = 0;
  const maxBounces = 2;
  while (bounces < maxBounces) {
    // Find intersection with each wall
    let tLeft = dirX < 0 ? (wallLeft - px) / dirX : Infinity;
    let tRight = dirX > 0 ? (wallRight - px) / dirX : Infinity;
    let tTop = dirY < 0 ? (wallTop - py) / dirY : Infinity;
    let tBottom = dirY > 0 ? (wallBottom - py) / dirY : Infinity;

    // Find the nearest wall hit
    let tMin = Math.min(tLeft, tRight, tTop, tBottom);
    if (!isFinite(tMin) || tMin <= 0) break;
    let nx = px + dirX * tMin;
    let ny = py + dirY * tMin;
    ctx.lineTo(nx, ny);

    // Stop after the 4th collision (3 bounces)
    if (++bounces >= maxBounces) break;

    // Reflect direction based on which wall was hit
    if (tMin === tLeft || tMin === tRight) {
      dirX = -dirX;
    }
    if (tMin === tTop || tMin === tBottom) {
      dirY = -dirY;
    }
    px = nx;
    py = ny;
    ctx.moveTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// Draw a solid arrow from (x1, y1) to (x2, y2)
function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  // Arrowhead
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headlen = 18;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 7), y2 - headlen * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 7), y2 - headlen * Math.sin(angle + Math.PI / 7));
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 7), y2 - headlen * Math.sin(angle - Math.PI / 7));
  ctx.fill();
  ctx.restore();
}

function loop(now: number) {
  const dt = Math.min((now - lastTime) / 1000, 0.033); // cap at ~30fps
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}


resize();
loop(lastTime);