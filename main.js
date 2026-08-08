import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const DECART_SDK_URL = "https://esm.sh/@decartai/sdk@0.1.17";

// Demo mode (?demo): synthetic video + fake landmarks, for testing without a camera.
const DEMO = new URLSearchParams(location.search).has("demo");

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const MIDDLE_PIP = 10;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_PIP = 14;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_TIP = 20;

const video = document.getElementById("video");
const lucyVid = document.getElementById("lucy");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const statusText = document.getElementById("status-text");
const hintEl = document.getElementById("hint");
const toolbar = document.getElementById("toolbar");
const livePill = document.getElementById("live-pill");
const liveText = document.getElementById("live-text");
const characterInput = document.getElementById("character-file");
const insideReplacementInput = document.getElementById("inside-replacement");
const langButton = document.getElementById("lang-btn");

let currentLang = localStorage.getItem("finger-frame-lang") || "zh";
const STRINGS = {
  zh: {
    title: "手指取景框 · 实时 AI",
    loading: "正在加载手部追踪…",
    camera: "正在请求摄像头权限…",
    hint: "双手抬起，伸出拇指和食指，框出你的画面 🎬",
    live: "实时",
    connecting: "连接中…",
    offline: "AI 未连接 — ",
    connectFailed: "连接失败",
    keyTitle: "Decart API 密钥",
    keyDescription: '取景框中会显示由 <a href="https://docs.platform.decart.ai/models/realtime/lucy-2.5" target="_blank" rel="noopener">Decart Lucy 2.5</a> 通过 WebRTC 以 30fps 实时生成的 <strong>AI 画面</strong>。请前往 <a href="https://platform.decart.ai/" target="_blank" rel="noopener">platform.decart.ai</a> 获取密钥。',
    keyPlaceholder: "输入 Decart API 密钥",
    remember: "在此设备上记住密钥",
    custom: "自定义风格",
    customPlaceholder: "用于“自定义”效果。请描述希望人物或画面变成的样子。",
    save: "保存并连接",
    clear: "清除",
    note: "密钥仅保存在当前浏览器中，并只用于连接 Decart 的 WebRTC 会话。没有密钥时，将使用本地颜色滤镜作为预览。",
    inside: "框内显示替换画面",
    addKey: "🔑 添加 Decart 密钥以启用实时 AI",
    demo: "演示画面",
    denied: "摄像头权限被拒绝，请允许访问摄像头后刷新页面。",
    startFailed: "启动失败：",
    imageTooLarge: "图片超过 10MB，请选择更小的图片",
  },
  en: {
    title: "Finger Frame · Live AI",
    loading: "Loading hand tracker…",
    camera: "Requesting camera access…",
    hint: "Frame your shot 🎬 — both hands up, thumbs and index fingers out.",
    live: "LIVE",
    connecting: "CONNECTING…",
    offline: "AI OFFLINE — ",
    connectFailed: "connection failed",
    keyTitle: "Decart API key",
    keyDescription: 'The frame shows a <strong>live AI world</strong> generated at 30fps over WebRTC by <a href="https://docs.platform.decart.ai/models/realtime/lucy-2.5" target="_blank" rel="noopener">Decart Lucy 2.5</a>. Get a key at <a href="https://platform.decart.ai/" target="_blank" rel="noopener">platform.decart.ai</a>.',
    keyPlaceholder: "Enter your Decart API key",
    remember: "Remember on this device",
    custom: "Custom style",
    customPlaceholder: "Describe how you want the person or scene to look for the Custom effect.",
    save: "Save & connect",
    clear: "Clear",
    note: "Your key stays in this browser and is used only for the Decart WebRTC session. Without a key, effects use a local color filter preview.",
    inside: "Show replacement inside frame",
    addKey: "🔑 Add your Decart key for live AI",
    demo: "DEMO FEED",
    denied: "Camera permission was denied. Allow camera access and reload.",
    startFailed: "Failed to start: ",
    imageTooLarge: "The image is over 10MB. Please choose a smaller image.",
  },
};
const tr = (key) => STRINGS[currentLang][key];

// Each effect is a live style prompt for Lucy 2.5, phrased per Decart's
// prompt templates ("Change the style of the video to <description>." with
// concrete visual specifics — vague or non-template phrasing degrades output).
const EFFECTS = [
  {
    id: "movie3d",
    labelZh: "3D 动画", labelEn: "3D Movie",
    prompt:
      "Change the style of the video to a 3D animated movie: stylized CGI " +
      "animation, the person as an animated character with expressive big " +
      "eyes and smooth skin, soft cinematic lighting.",
  },
  {
    id: "anime",
    labelZh: "动漫", labelEn: "Anime",
    prompt:
      "Change the style of the video to hand-drawn anime: clean black line " +
      "art, flat cel shading, vibrant colors, large expressive eyes.",
  },
  {
    id: "cyberpunk",
    labelZh: "赛博朋克", labelEn: "Cyberpunk",
    prompt:
      "Change the style of the video to neon cyberpunk: glowing pink and " +
      "cyan neon light on the person and walls, rain-slick reflective " +
      "surfaces, holographic signs in the background.",
  },
  {
    id: "watercolor",
    labelZh: "水彩", labelEn: "Watercolor",
    prompt:
      "Change the style of the video to a watercolor painting: soft loose " +
      "brushstrokes, gentle color bleeds, visible paper texture, muted " +
      "pastel palette.",
  },
  {
    id: "lego",
    labelZh: "LEGO", labelEn: "LEGO",
    prompt:
      "Change the style of the video to a LEGO stop-motion animation: the " +
      "person is a yellow LEGO minifigure with a cylindrical head, painted " +
      "face, and claw hands, and the room is built entirely from glossy " +
      "plastic LEGO bricks with visible round studs on every surface.",
  },
  { id: "custom", labelZh: "自定义 ✨", labelEn: "Custom ✨", prompt: null },
  {
    id: "character",
    labelZh: "角色替换", labelEn: "Character",
    prompt:
      "Substitute the character in the video with the person or character in the reference image. " +
      "Preserve the original pose, motion, expression, hands, camera, background, and framing.",
  },
];
let effect = "movie3d";

let apiKey =
  localStorage.getItem("decart-key") || sessionStorage.getItem("decart-key") || "";
let customPrompt = localStorage.getItem("lucy-custom") || "";
let realtimeClient = null;
let lucyLive = false;
let cameraStream = null;
let characterImage = null;
let showReplacementInside = true;

// Gesture-mode state. Recognition is held for a few frames and latched until
// release so one gesture causes exactly one mode switch.
let toggleGestureFrames = 0;
let toggleGestureLatched = false;
let toggleGestureReleaseFrames = 0;
let splitActive = false;
let splitCandidateFrames = 0;
let splitMissingFrames = 0;
let splitX = null;

function setReplacementInside(value) {
  showReplacementInside = value;
  insideReplacementInput.checked = value;
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("finger-frame-lang", lang);
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = tr("title");
  langButton.textContent = lang === "zh" ? "EN" : "中";
  langButton.title = lang === "zh" ? "Switch to English" : "切换到中文";
  document.getElementById("key-btn").title = tr("keyTitle");
  document.getElementById("hint-text").textContent = tr("hint");
  document.getElementById("display-mode-label").textContent = tr("inside");
  document.getElementById("key-heading").textContent = tr("keyTitle");
  document.getElementById("key-description").innerHTML = tr("keyDescription");
  document.getElementById("key-input").placeholder = tr("keyPlaceholder");
  document.getElementById("remember-label").textContent = tr("remember");
  document.getElementById("custom-heading").textContent = tr("custom");
  document.getElementById("style-custom").placeholder = tr("customPlaceholder");
  document.getElementById("key-save").textContent = tr("save");
  document.getElementById("key-clear").textContent = tr("clear");
  document.getElementById("key-note").textContent = tr("note");
  toolbar.querySelectorAll("button").forEach((button) => {
    const item = EFFECTS.find((entry) => entry.id === button.dataset.id);
    const label = button.querySelector(".effect-label");
    if (item && label) label.textContent = currentLang === "zh" ? item.labelZh : item.labelEn;
  });
  if (!statusEl.classList.contains("hidden")) statusText.textContent = tr("loading");
  if (lucyLive) setPill("", tr("live"));
}

// Smoothed quad corners + presence fade (0..1).
let corners = null;
let presence = 0;
// True while a frame is being shown — relaxes the gesture gate (hysteresis).
let frameActive = false;
// Frames since the quad was last seen; short dropouts hold the last quad.
let lostFrames = 0;
// Crossing/overlapping hands often occlude each other and break detection
// for a while — hold the last quad through a moderate dropout window.
const MAX_LOST_FRAMES = 25;
// Frames in a row a far-jumped quad must persist before we accept it as a
// real reposition rather than a mis-detection during hand overlap.
const JUMP_CONFIRM_FRAMES = 2;
let jumpFrames = 0;

let landmarker = null;
let lastVideoTime = -1;
let lastResults = null;

function currentPrompt() {
  const e = EFFECTS.find((x) => x.id === effect);
  if (e?.prompt) return e.prompt;
  return (
    customPrompt.trim() ||
    "Transform the person into a 3D animated movie character."
  );
}

function buildToolbar() {
  EFFECTS.forEach((e, i) => {
    const btn = document.createElement("button");
    const label = currentLang === "zh" ? e.labelZh : e.labelEn;
    btn.innerHTML = `<span class="key">${i + 1}</span><span class="effect-label">${label}</span>` +
      (e.id === "character" ? '<img id="character-thumb-toolbar" alt="已选角色" />' : "");
    btn.dataset.id = e.id;
    if (e.id === effect) btn.classList.add("active");
    btn.addEventListener("click", () => {
      if (e.id === "character") characterInput.click();
      else setEffect(e.id);
    });
    toolbar.appendChild(btn);
  });
  window.addEventListener("keydown", (ev) => {
    const idx = parseInt(ev.key, 10) - 1;
    if (idx >= 0 && idx < EFFECTS.length) {
      const next = EFFECTS[idx];
      if (next.id === "character") characterInput.click();
      else setEffect(next.id);
    }
  });
  langButton.addEventListener("click", () => applyLanguage(currentLang === "zh" ? "en" : "zh"));
}

async function setEffect(id) {
  effect = id;
  toolbar.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("active", b.dataset.id === id);
  });
  if (id === "custom" && !customPrompt.trim()) {
    document.getElementById("key-panel").classList.remove("hidden");
  }
  pushPrompt();
}

// Send the active style to the live Lucy session (no reconnect needed).
async function pushPrompt() {
  if (!realtimeClient || !lucyLive) return;
  const text = currentPrompt();
  try {
    if (effect === "character") {
      if (!characterImage) return;
      await realtimeClient.set({ prompt: text, image: characterImage, enhance: true });
      return;
    }
    // SDK versions differ on the exact shape — try the documented forms.
    try {
      await realtimeClient.set({ prompt: text, enhance: true });
    } catch {
      await realtimeClient.set({ prompt: { text }, enhance: true });
    }
  } catch (err) {
    console.error("prompt update failed:", err);
  }
}

function setPill(state, text) {
  livePill.className = state ? `on ${state}` : "";
  if (state) livePill.classList.add("on");
  liveText.textContent = text;
}

// ---- Decart Lucy 2.5 (realtime video-to-video over WebRTC) ----
async function connectLucy() {
  if (!apiKey || !cameraStream || DEMO) return;
  try {
    setPill("connecting", tr("connecting"));
    const { createDecartClient, models } = await import(DECART_SDK_URL);
    const characterMode = effect === "character";
    const model = models.realtime("lucy-2.5");
    const client = createDecartClient({ apiKey });
    realtimeClient = await client.realtime.connect(cameraStream, {
      model,
      initialState: {
        prompt: { text: currentPrompt(), enhance: true },
        ...(characterMode && characterImage ? { image: characterImage } : {}),
      },
      onRemoteStream: (stream) => {
        lucyVid.srcObject = stream;
        lucyVid.play().catch(() => {});
        lucyLive = true;
        setPill("", tr("live"));
      },
    });
    console.log("Lucy connected", realtimeClient);
  } catch (err) {
    console.error("Lucy connect failed:", err);
    lucyLive = false;
    setPill("error", tr("offline") + (err.message || tr("connectFailed")).slice(0, 60));
  }
}

async function disconnectLucy() {
  lucyLive = false;
  setPill(null, "");
  try {
    await realtimeClient?.disconnect?.();
    realtimeClient?.close?.();
  } catch {}
  realtimeClient = null;
  lucyVid.srcObject = null;
}

function setupKeyPanel() {
  const btn = document.getElementById("key-btn");
  const panel = document.getElementById("key-panel");
  const input = document.getElementById("key-input");
  const remember = document.getElementById("key-remember");
  const custom = document.getElementById("style-custom");

  input.value = apiKey;
  remember.checked = !!localStorage.getItem("decart-key");
  custom.value = customPrompt;

  characterInput.addEventListener("change", async () => {
    const file = characterInput.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      characterInput.value = "";
      alert(tr("imageTooLarge"));
      return;
    }
    characterImage = file;
    const thumb = document.getElementById("character-thumb-toolbar");
    thumb.src = URL.createObjectURL(file);
    thumb.classList.add("visible");
    effect = "character";
    toolbar.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", b.dataset.id === "character");
    });
    if (realtimeClient && lucyLive) await pushPrompt();
    else if (apiKey) connectLucy();
    // Allow selecting the same file again when the seventh item is clicked.
    characterInput.value = "";
  });

  insideReplacementInput.addEventListener("change", () => {
    setReplacementInside(insideReplacementInput.checked);
  });

  btn.addEventListener("click", () => panel.classList.toggle("hidden"));
  document.getElementById("key-save").addEventListener("click", async () => {
    apiKey = input.value.trim();
    localStorage.removeItem("decart-key");
    sessionStorage.removeItem("decart-key");
    if (apiKey) {
      (remember.checked ? localStorage : sessionStorage).setItem("decart-key", apiKey);
    }
    customPrompt = custom.value;
    localStorage.setItem("lucy-custom", customPrompt);
    panel.classList.add("hidden");
    await disconnectLucy();
    if (apiKey) connectLucy();
    else pushPrompt();
  });
  document.getElementById("key-clear").addEventListener("click", async () => {
    apiKey = "";
    input.value = "";
    localStorage.removeItem("decart-key");
    sessionStorage.removeItem("decart-key");
    await disconnectLucy();
  });
}

async function init() {
  buildToolbar();
  setupKeyPanel();
  applyLanguage(currentLang);

  let stream;
  if (DEMO) {
    stream = makeDemoStream();
  } else {
    statusText.textContent = tr("loading");
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.3,
      minHandPresenceConfidence: 0.3,
      minTrackingConfidence: 0.3,
    });

    statusText.textContent = tr("camera");
    // Lucy 2.5 expects 1280x720 @ 30fps landscape input.
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
        facingMode: "user",
      },
      audio: false,
    });
    cameraStream = stream;
  }
  video.srcObject = stream;
  await new Promise((res) => (video.onloadedmetadata = res));
  await video.play();

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  statusEl.classList.add("hidden");
  if (apiKey && !DEMO) connectLucy();
  requestAnimationFrame(loop);
}

// Draw a (mirrored) source onto any 2d context, filling w x h.
function drawMirrored(c, w, h, src = video) {
  c.save();
  c.translate(w, 0);
  c.scale(-1, 1);
  c.drawImage(src, 0, 0, w, h);
  c.restore();
}

function toPixel(lm) {
  // Mirror x so coordinates match the mirrored canvas.
  return { x: (1 - lm.x) * canvas.width, y: lm.y * canvas.height };
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerpPt(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// Given landmark sets for exactly two hands, return the 4 frame corners in
// ANATOMICAL order: [left.index, right.index, right.thumb, left.thumb]
// ("left"/"right" = on-screen wrist position). Each corner belongs to a
// specific finger, so the edge cycle is honest geometry: two upright "L"s
// trace a rectangle, and flipping one hand's fingers makes the edges cross
// into a bowtie of two triangles — and uncrossing recovers by itself, since
// nothing about the ordering is stateful.
function computeQuad(hands) {
  const info = hands.map((lm) => ({
    index: toPixel(lm[INDEX_TIP]),
    thumb: toPixel(lm[THUMB_TIP]),
    wristX: toPixel(lm[WRIST]).x,
    // Hand size from wrist -> middle knuckle: stable regardless of which way
    // the fingers point (unlike finger-based measures, which foreshorten).
    scale: dist(toPixel(lm[WRIST]), toPixel(lm[MIDDLE_MCP])) + 1,
  }));
  // Require thumb and index spread apart (an open "L"). Hysteresis: easy to
  // keep once active, so rotating/foreshortening fingers doesn't drop it.
  const needed = frameActive ? 0.2 : 0.75;
  for (const hd of info) {
    if (dist(hd.thumb, hd.index) < hd.scale * needed) return null;
  }
  info.sort((a, b) => a.wristX - b.wristX);
  const [A, B] = info;
  // Standard gesture holds both index fingers up and thumbs down, so this
  // cycle traces a rectangle; flipping one hand crosses it into a bowtie.
  const pts = [A.index, B.index, B.thumb, A.thumb];
  // Degenerate-frame gate on the spanned extent (angle-sorted area) — the
  // traced area is near zero for a legitimate crossed (bowtie) frame.
  const cx = pts.reduce((s, p) => s + p.x, 0) / 4;
  const cy = pts.reduce((s, p) => s + p.y, 0) / 4;
  const hull = [...pts].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
  );
  const minArea = frameActive ? 0.0005 : 0.005;
  if (polygonArea(hull) < canvas.width * canvas.height * minArea) return null;
  return pts;
}

function polygonArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a / 2);
}

function quadPath(c, q) {
  c.beginPath();
  c.moveTo(q[0].x, q[0].y);
  for (let i = 1; i < 4; i++) c.lineTo(q[i].x, q[i].y);
  c.closePath();
}

function drawReplacement(c, w, h) {
  if (lucyLive && lucyVid.readyState >= 2) {
    drawMirrored(c, w, h, lucyVid);
    return;
  }
  c.save();
  c.filter = "hue-rotate(140deg) saturate(1.6) contrast(1.1)";
  drawMirrored(c, w, h);
  c.restore();
}

function applyEffect(q) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.save();
  quadPath(ctx, q);
  ctx.clip();
  ctx.globalAlpha = presence;

  if (!showReplacementInside) {
    drawMirrored(ctx, w, h);
  } else if (lucyLive && lucyVid.readyState >= 2) {
    // The live AI stream is a full-frame transform of the same camera feed —
    // draw it mirrored and screen-aligned so the finger frame is a window
    // into the AI world, staying registered as hands move.
    drawMirrored(ctx, w, h, lucyVid);
  } else {
    // Keyless fallback: local color shift so the window still does something.
    ctx.filter = "hue-rotate(140deg) saturate(1.6) contrast(1.1)";
    drawMirrored(ctx, w, h);
    ctx.filter = "none";
    if (!apiKey && !DEMO) {
      const cx = q.reduce((s, p) => s + p.x, 0) / 4;
      const cy = q.reduce((s, p) => s + p.y, 0) / 4;
      ctx.font = `600 ${Math.round(w / 55)}px -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(tr("addKey"), cx, cy);
      ctx.shadowBlur = 0;
    }
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawSplitView(x) {
  const w = canvas.width;
  const h = canvas.height;
  drawMirrored(ctx, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, 0, w - x, h);
  ctx.clip();
  drawReplacement(ctx, w, h);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,.95)";
  ctx.lineWidth = Math.max(2, w / 480);
  ctx.shadowColor = "rgba(0,0,0,.65)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, h);
  ctx.stroke();
  ctx.restore();
}

function drawFrameOutline(q) {
  const t = performance.now() / 1000;
  ctx.save();
  ctx.globalAlpha = presence;

  quadPath(ctx, q);
  ctx.setLineDash([10, 8]);
  // Marching ants: slide the dash pattern along the outline.
  ctx.lineDashOffset = -t * 40;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 6;
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  ctx.shadowBlur = 0;
  q.forEach((p, i) => {
    const r = 7 + Math.sin(t * 3 + i * 1.5) * 1.5;
    // Soft expanding halo behind each corner dot.
    const halo = (t * 0.8 + i * 0.25) % 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + halo * 14, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - halo) * presence})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  ctx.restore();
}

function fingerExtended(lm, mcpIndex, pipIndex, tipIndex) {
  const wrist = lm[WRIST];
  const mcp = lm[mcpIndex];
  const pip = lm[pipIndex];
  const tip = lm[tipIndex];
  return dist(tip, wrist) > dist(pip, wrist) * 1.12 &&
    dist(tip, mcp) > dist(pip, mcp) * 1.18;
}

function extendedFingerCount(lm) {
  return [
    fingerExtended(lm, INDEX_MCP, INDEX_PIP, INDEX_TIP),
    fingerExtended(lm, MIDDLE_MCP, MIDDLE_PIP, MIDDLE_TIP),
    fingerExtended(lm, RING_MCP, RING_PIP, RING_TIP),
    fingerExtended(lm, PINKY_MCP, PINKY_PIP, PINKY_TIP),
  ].filter(Boolean).length;
}

function isOkGesture(lm) {
  const palmScale = dist(lm[WRIST], lm[MIDDLE_MCP]) + 1e-6;
  const circleClosed = dist(lm[THUMB_TIP], lm[INDEX_TIP]) < palmScale * 0.42;
  return circleClosed &&
    fingerExtended(lm, MIDDLE_MCP, MIDDLE_PIP, MIDDLE_TIP) &&
    fingerExtended(lm, RING_MCP, RING_PIP, RING_TIP) &&
    fingerExtended(lm, PINKY_MCP, PINKY_PIP, PINKY_TIP);
}

function isThreeFingerGesture(lm) {
  return extendedFingerCount(lm) === 3 && !isOkGesture(lm);
}

function verticalPalmX(lm) {
  if (extendedFingerCount(lm) !== 4) return null;
  const wrist = lm[WRIST];
  const middleMcp = lm[MIDDLE_MCP];
  const dx = middleMcp.x - wrist.x;
  const dy = middleMcp.y - wrist.y;
  // Upright open palm: fingers above the wrist and the palm axis near vertical.
  if (dy >= -0.015 || Math.abs(dx) > Math.abs(dy) * 0.72) return null;
  const palmPoints = [WRIST, INDEX_MCP, MIDDLE_MCP, RING_MCP, PINKY_MCP];
  const x = palmPoints.reduce((sum, index) => sum + lm[index].x, 0) / palmPoints.length;
  return (1 - x) * canvas.width;
}

function resetFrameTracker() {
  corners = null;
  presence = 0;
  frameActive = false;
  lostFrames = 0;
  jumpFrames = 0;
}

function updateGestureModes(hands) {
  const palmX = hands.length === 1 ? verticalPalmX(hands[0]) : null;
  if (palmX != null) {
    splitCandidateFrames++;
    splitMissingFrames = 0;
    if (splitCandidateFrames >= 4) {
      splitActive = true;
      splitX = splitX == null ? palmX : splitX + (palmX - splitX) * 0.42;
    }
  } else {
    splitCandidateFrames = 0;
    if (splitActive && ++splitMissingFrames >= 5) {
      splitActive = false;
      splitMissingFrames = 0;
      splitX = null;
      resetFrameTracker();
    }
  }

  const wantsToggle = !splitActive && palmX == null && hands.some(
    (lm) => isOkGesture(lm) || isThreeFingerGesture(lm)
  );
  if (wantsToggle) {
    toggleGestureReleaseFrames = 0;
    if (!toggleGestureLatched && ++toggleGestureFrames >= 5) {
      setReplacementInside(!showReplacementInside);
      toggleGestureLatched = true;
    }
  } else {
    toggleGestureFrames = 0;
    if (++toggleGestureReleaseFrames >= 6) toggleGestureLatched = false;
  }
}

function loop() {
  const w = canvas.width;
  const h = canvas.height;

  // Run detection once per new video frame.
  if (DEMO) {
    lastResults = { landmarks: fakeHands(performance.now() / 1000) };
  } else if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    lastResults = landmarker.detectForVideo(video, performance.now());
  }

  const hands = lastResults?.landmarks || [];
  updateGestureModes(hands);

  // An upright open palm temporarily overrides finger-frame compositing.
  if (splitActive && splitX != null) {
    drawSplitView(splitX);
    hintEl.classList.add("hidden");
    requestAnimationFrame(loop);
    return;
  }

  // Normal frame mode: the bottom switch determines which source is outside.
  if (showReplacementInside) drawMirrored(ctx, w, h);
  else drawReplacement(ctx, w, h);

  let targetQuad = null;
  if (hands.length === 2) {
    targetQuad = computeQuad(hands);
  }

  if (targetQuad) {
    if (!corners) {
      lostFrames = 0;
      frameActive = true;
      jumpFrames = 0;
      corners = targetQuad;
      presence = Math.min(1, presence + 0.12);
    } else {
      const moved =
        targetQuad.reduce((s, p, i) => s + dist(p, corners[i]), 0) / 4;
      // Only quads that genuinely teleport (≥30% of the screen in one frame,
      // beyond any real hand motion) are treated as suspect mis-detections.
      if (moved > canvas.width * 0.3 && ++jumpFrames < JUMP_CONFIRM_FRAMES) {
        if (++lostFrames > MAX_LOST_FRAMES) {
          presence = Math.max(0, presence - 0.05);
        }
      } else {
        lostFrames = 0;
        frameActive = true;
        jumpFrames = 0;
        // Velocity-adaptive smoothing: damp pixel jitter when nearly still,
        // follow at high gain the moment the hands genuinely move.
        const alpha = Math.min(
          0.85,
          Math.max(0.35, moved / (canvas.width * 0.05))
        );
        corners = corners.map((c, i) => lerpPt(c, targetQuad[i], alpha));
        presence = Math.min(1, presence + 0.12);
      }
    }
  } else if (corners && ++lostFrames <= MAX_LOST_FRAMES) {
    // Brief tracking dropout: hold the last quad instead of fading.
    presence = Math.min(1, presence + 0.12);
  } else {
    presence = Math.max(0, presence - 0.05);
    if (presence === 0) {
      corners = null;
      frameActive = false;
      jumpFrames = 0;
    }
  }

  if (corners && presence > 0.01) {
    applyEffect(corners);
    drawFrameOutline(corners);
  }

  hintEl.classList.toggle("hidden", presence > 0.5);

  requestAnimationFrame(loop);
}

// ---- Demo mode helpers ----

function makeDemoStream() {
  const demo = document.createElement("canvas");
  demo.width = 1280;
  demo.height = 720;
  const d = demo.getContext("2d");
  function paint() {
    const t = performance.now() / 1000;
    const g = d.createLinearGradient(0, 0, demo.width, demo.height);
    g.addColorStop(0, "#1c2a4a");
    g.addColorStop(1, "#3a1c4a");
    d.fillStyle = g;
    d.fillRect(0, 0, demo.width, demo.height);
    for (let i = 0; i < 6; i++) {
      const x = demo.width * (0.15 + 0.14 * i) + Math.sin(t * 0.8 + i) * 60;
      const y = demo.height * 0.5 + Math.cos(t * 0.6 + i * 1.7) * 160;
      d.beginPath();
      d.arc(x, y, 50 + 18 * Math.sin(t + i), 0, Math.PI * 2);
      d.fillStyle = `hsl(${(i * 60 + t * 30) % 360}, 75%, 62%)`;
      d.fill();
    }
    d.fillStyle = "rgba(255,255,255,0.9)";
    d.font = "bold 56px sans-serif";
    d.textAlign = "center";
    // Draw mirrored so it reads correctly after the canvas flips it back.
    d.save();
    d.translate(demo.width, 0);
    d.scale(-1, 1);
    d.fillText(tr("demo"), demo.width / 2, demo.height / 2);
    d.restore();
    requestAnimationFrame(paint);
  }
  paint();
  return demo.captureStream(30);
}

function fakeHand(indexTip, thumbTip, indexMcp) {
  const lm = Array.from({ length: 21 }, () => ({ ...indexMcp, z: 0 }));
  lm[INDEX_TIP] = { ...indexTip, z: 0 };
  lm[THUMB_TIP] = { ...thumbTip, z: 0 };
  lm[INDEX_MCP] = { ...indexMcp, z: 0 };
  return lm;
}

function fakeHands(t) {
  const ox = Math.sin(t * 0.9) * 0.02;
  const oy = Math.cos(t * 0.7) * 0.02;
  return [
    fakeHand(
      { x: 0.74 + ox, y: 0.26 + oy },
      { x: 0.8 + ox, y: 0.56 + oy },
      { x: 0.75 + ox, y: 0.4 + oy }
    ),
    fakeHand(
      { x: 0.26 - ox, y: 0.28 - oy },
      { x: 0.2 - ox, y: 0.58 - oy },
      { x: 0.25 - ox, y: 0.44 - oy }
    ),
  ];
}

init().catch((err) => {
  console.error(err);
  statusEl.classList.remove("hidden");
  statusEl.querySelector(".spinner")?.remove();
  statusText.textContent =
    err.name === "NotAllowedError"
      ? tr("denied")
      : `${tr("startFailed")}${err.message}`;
});
