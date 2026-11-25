/* global Path2D */

// Shared bean-head face grammar. Draw period hair and accessories over it.
const FACE = "M137 205 C139 127 198 100 281 104 C369 102 415 156 414 235 C415 316 372 381 301 392 C211 405 141 352 132 277 Q127 233 137 205Z";
const BROW = "M-19 -4 Q-6 -10 18 -5 L19 1 Q0 1 -18 4Z";
const INK = "#151124";

const EXPRESSIONS = {
  calm: {width: 12, height: 16, brow: .05, mouth: "M251 322 Q275 327 299 321", solidEyes: true, lineMouth: true},
  surprise: {width: 21, height: 27, brow: .22, mouth: "M240 312 Q269 296 310 306 Q310 344 285 350 Q253 350 240 312Z", color: "#481933", solidEyes: false, lineMouth: false},
  focus: {width: 12, height: 11, brow: -.25, mouth: "M249 322 Q275 325 301 318", solidEyes: true, lineMouth: true},
  stern: {width: 12, height: 14, brow: -.25, mouth: "M251 323 Q276 315 303 322", solidEyes: true, lineMouth: true},
};

function shape(ctx, outline, fill, width) {
  const path = new Path2D(outline);
  ctx.fillStyle = fill;
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.fill(path);
  ctx.stroke(path);
}

function oval(ctx, x, y, width, height, fill, strokeWidth = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, width, height, 0, 0, 2 * Math.PI);
  ctx.fillStyle = fill;
  ctx.fill();
  if (strokeWidth > 0) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

/**
 * Draw a face in local actor coordinates on a 600-wide design canvas.
 * Base bounds x=132..415, y=104..392. Eyes around (275,262).
 * Position the actor, shadow, costume and attachments in the scene separately.
 * gaze is a signed pupil offset, blink is lid closure [0,1], accent is [0,1],
 * and yaw [-0.45,0.45] rad shifts facial features for 2.5D head turns.
 */
export function paintBeanFace(ctx, {expression = "calm", gaze = 0, blink = 0, accent = 0, yaw = 0, solidEyes} = {}) {
  const look = EXPRESSIONS[expression];
  if (!look) throw new Error("Unknown bean-face expression: " + expression);
  const useSolidEyes = solidEyes ?? look.solidEyes;
  const shift = Math.max(-0.45, Math.min(0.45, yaw)) * 60;

  ctx.save();
  ctx.lineJoin = ctx.lineCap = "round";
  shape(ctx, FACE, "#fffefe", 10);
  for (const [baseX, side] of [[236, -1], [314, 1]]) {
    const x = baseX + shift;
    const y = 252 + (expression === "focus" && side === 1 ? -7 : 0);
    ctx.save();
    ctx.translate(x, y - 25 - accent * 8);
    ctx.rotate(side * (look.brow + accent * .13));
    shape(ctx, BROW, INK, 2);
    ctx.restore();

    if (blink >= .85) {
      shape(ctx, `M${x - 13} ${y + 6} q13 -10 27 0 q-15 -3 -27 0Z`, INK, 3);
      continue;
    }
    const height = Math.max(2, look.height * (1 - blink));
    if (useSolidEyes) {
      const gazeShift = Math.max(-4, Math.min(4, gaze * 0.4));
      oval(ctx, x + gazeShift, y + 8, look.width, height, INK);
    } else {
      const pupilOffset = Math.min(look.width - 10, Math.max(10 - look.width, gaze));
      oval(ctx, x, y + 8, look.width, height, "#ffffff", 5);
      oval(ctx, x + pupilOffset, y + 8, 9, height * .68, INK);
    }
  }
  ctx.save();
  ctx.translate(shift, 0);
  if (look.lineMouth) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.stroke(new Path2D(look.mouth));
  } else {
    shape(ctx, look.mouth, look.color ?? INK, 5);
  }
  if (expression === "surprise") {
    shape(ctx, "M247 311 Q274 301 303 309 L299 317 Q269 311 250 317Z", "#ffffff", 2);
    oval(ctx, 281, 337, 14, 6, "#ff5570");
  }
  ctx.restore();
  ctx.restore();
}
