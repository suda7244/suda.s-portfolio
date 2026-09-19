let memories = [];
let hoveredIndex = -1;
let windOffset = 0;
let paperTexture;
let photoInputEl; 

//------------------------------------------------------
// SETUP
//------------------------------------------------------
function setup() {
  createCanvas(windowWidth, windowHeight);

  // 手写字体
  textFont("Caveat Brush");

  generatePaperTexture();

const input = document.getElementById("memoryInput");
const btn = document.getElementById("addBtn");
photoInputEl = document.getElementById("photoInput");

if (btn) {
  btn.onclick = () => {
    const text = input.value.trim();
    if (text.length === 0) return;

    const file = photoInputEl && photoInputEl.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        addMemory(text, false, e.target.result);
        input.value = "";
        if (photoInputEl) photoInputEl.value = "";
      };
      reader.readAsDataURL(file);
    } else {
      addMemory(text, false, null);
      input.value = "";
    }
  };
}


  loadMemories();
}

function draw() {
  drawBackground();

  if (paperTexture) {
    push();
    tint(255, 160);
    image(paperTexture, 0, 0, width, height);
    pop();
  }

  windOffset += 0.01;
  hoveredIndex = -1;

  for (let i = 0; i < memories.length; i++) {
    const mem = memories[i];
    updateMemoryState(mem);

    push();
    translate(mem.x, mem.y);

    if (dist(mouseX, mouseY, mem.x, mem.y) < 60) {
      hoveredIndex = i;
      drawHoverHalo();
    }

    drawFlower(mem);
    pop();

    drawPhotoTag(mem);   // ⭐ 新增：画照片标签

    drawFragments(mem);
  }

  removeDeletedMemories();
  drawCaption();
  drawSignature(); 
}

//------------------------------------------------------
// ADD MEMORY
//------------------------------------------------------
function addMemory(text, isFromLoad = false, photoDataURL = null) {
  const analysis = analyseText(text);
  let today = new Date().toISOString().slice(0, 10);

  let fragments = analysis.keywords.map((w, i) => ({
    word: w,
    radius: 80 + i * 25,
    angleOffset: random(TWO_PI)
  }));

  let mem = {
    text,
    createdAt: today,
    timeCreated: millis(),

    analysis,
    fragments,

    x: random(width * 0.2, width * 0.8),
    y: random(height * 0.3, height * 0.7),

    bloom: 0,
    decay: 0,
    windShift: 0,
    petalShake: 0,
    grow: 0,

    isDeleting: false,
    toRemove: false,

    // ⭐ 新增：照片数据（字符串） + 已加载的图片对象
    photoData: photoDataURL || null,
    photoImg: null
  };

  // ⭐ 如果有照片 → 用 p5 的 loadImage 异步加载
  if (mem.photoData) {
    loadImage(mem.photoData, img => {
      mem.photoImg = img;
    });
  };

  memories.push(mem);
  layoutGarden();
  renderDiaryList();   // ⭐ 新增：更新日记本

  if (!isFromLoad) saveMemories();
}

//------------------------------------------------------
// SAVE & LOAD LOCALSTORAGE
//------------------------------------------------------
function saveMemories() {
  let arr = memories.map(m => ({
    text: m.text,
    createdAt: m.createdAt,
    photoData: m.photoData || null   // ⭐ 也保存照片 dataURL
  }));

  localStorage.setItem("memoryGardenTexts", JSON.stringify(arr));
}


function loadMemories() {
  let data = localStorage.getItem("memoryGardenTexts");
  if (!data) return;

  let arr = JSON.parse(data);
  memories = [];

  for (let item of arr) {
    addMemory(item.text, true, item.photoData || null);
    memories[memories.length - 1].createdAt = item.createdAt;
  }

  layoutGarden();
}

//------------------------------------------------------
// ANALYSE TEXT
//------------------------------------------------------
function analyseText(txt) {
  let strongPos = ["love", "happy", "joy", "delight", "excited", "grateful", "peaceful", "proud"];
  let weakPos   = ["warm", "nice", "smile", "bright", "soft", "calm"];

  let strongNeg = ["sad", "angry", "fear", "terrible", "hurt", "cry", "depressed"];
  let weakNeg   = ["tired", "stress", "worry", "miss", "alone", "pressure"];

  let lower = txt.toLowerCase();
  let score = 0;

  strongPos.forEach(w => { if (lower.includes(w)) score += 2; });
  weakPos.forEach(w   => { if (lower.includes(w)) score += 1; });

  strongNeg.forEach(w => { if (lower.includes(w)) score -= 2; });
  weakNeg.forEach(w   => { if (lower.includes(w)) score -= 1; });

  let emotion = constrain(score, -5, 5);

  let petals = int(map(txt.length, 5, 200, 6, 18));
  petals = constrain(petals, 5, 22);

  let words = lower.replace(/[^\w\s']/g, " ").split(/\s+/).filter(w => w.length > 3);
  let keywords = Array.from(new Set(words)).slice(0, 3);

  return {
    emotion: emotion,
    petals: petals,
    hue: map(emotion, -5, 5, 220, 40),
    intensity: constrain(emotion / 5, -1, 1),
    keywords: keywords
  };
}

//------------------------------------------------------
// LAYOUT
//------------------------------------------------------
function layoutGarden() {
  const n = memories.length;
  if (n === 0) return;

  for (let i = 0; i < n; i++) {
    const mem = memories[i];

    // 横向仍然按时间排
    mem.x = map(i, 0, max(1, n - 1), width * 0.15, width * 0.85);

    // 情绪：负在下，正向在上
    let baseY = map(mem.analysis.emotion, -5, 5, height * 0.8, height * 0.25);

    // ⭐ 轻微随机：更像花在草地里自然长出来
    let jitterY = random(-20, 20);
    let jitterX = random(-15, 15);

    mem.y = constrain(baseY + jitterY, height * 0.22, height * 0.82);
    mem.x = constrain(mem.x + jitterX, width * 0.1, width * 0.9);
  }
}

//------------------------------------------------------
// DIARY LIST – 把所有记忆显示成“日记本列表”
//------------------------------------------------------
function renderDiaryList() {
  const box = document.getElementById("diaryList");
  if (!box) return;

  box.innerHTML = "";

  // 没有花时的提示
  let visibleMemories = memories.filter(m => !m.isDeleting);
  if (visibleMemories.length === 0) {
    box.innerHTML = '<div class="diary-empty">No memories yet.</div>';
    return;
  }

  // 按时间倒序显示（最新的在最上面）
  visibleMemories
    .slice() // 复制一份
    .sort((a, b) => b.timeCreated - a.timeCreated)
    .forEach(mem => {
      const item = document.createElement("div");
      item.className = "diary-entry";

      const dateText = mem.createdAt || new Date(mem.timeCreated).toISOString().slice(0, 10);
      const full = mem.text.trim();
      const preview = full.length > 70 ? full.slice(0, 70) + "…" : full;

      item.innerHTML = `
        <div class="diary-date">${dateText}</div>
        <div class="diary-text">${preview}</div>
      `;

      // （可选）点一下日记，让 caption 显示这条
      item.addEventListener("click", () => {
        // 找到这条在 memories 里的位置
        const idx = memories.indexOf(mem);
        if (idx >= 0) {
          hoveredIndex = idx;   // 利用你现有的 hover 逻辑
        }
      });

      box.appendChild(item);
    });
}

//------------------------------------------------------
// STATE UPDATE
//------------------------------------------------------
function updateMemoryState(mem) {
  let lifeSec = (millis() - mem.timeCreated) / 1000;

  mem.bloom = constrain(map(lifeSec, 0, 3, 0, 1), 0, 1);
  mem.grow = constrain(mem.grow + 0.02, 0, 1);

  if (mem.isDeleting) {
    mem.decay = constrain(mem.decay + 0.02, 0, 1);
    if (mem.decay >= 1) mem.toRemove = true;
  } else mem.decay = 0;

  mem.windShift = sin(windOffset + mem.x * 0.005) * 8;
  mem.petalShake = noise(frameCount * 0.02 + mem.x * 0.01) * 0.25;
}

//------------------------------------------------------
// FLOWER DRAWING (with Emotion Petal Shapes)
//------------------------------------------------------
function drawFlower(mem) {
  if (mem.decay >= 1) return;

  const emo = mem.analysis.emotion;
  const petalCount = mem.analysis.petals;

  let sizeFactor = map(abs(emo), 0, 5, 0.8, 1.4) * mem.grow;
  let radius = 40 * mem.bloom * sizeFactor;
  let alpha = (1 - mem.decay) * 0.9;

  let h, s, b;
  if (emo <= -2) { h = 220; s = 55; b = 85; }
  else if (emo < 0) { h = 205; s = 40; b = 90; }
  else if (emo === 0) { h = 120; s = 35; b = 92; }
  else if (emo < 3) { h = 40; s = 70; b = 96; }
  else { h = 18; s = 75; b = 98; }

  let petalType =
    emo >= 3 ? "round" :
    emo > 0 ? "soft" :
    emo === 0 ? "neutral" :
    emo > -3 ? "sharp" :
    "split";

  rotate(mem.windShift * 0.003 * (emo < 0 ? 1.8 : 1.0));
  drawStem(mem, alpha);

  colorMode(HSB, 360, 100, 100, 1);

  for (let i = 0; i < petalCount; i++) {
    push();
    rotate((TWO_PI / petalCount) * i + mem.petalShake);
    fill(h, s, b, alpha);
    drawPetal(radius, petalType);
    pop();
  }

  fill(50, 40, 100, alpha);
  ellipse(0, 0, 24 * sizeFactor);
}

//------------------------------------------------------
// PETAL SHAPES
//------------------------------------------------------
function drawPetal(r, petalType) {
  beginShape();

  if (petalType === "round") {
    curveVertex(0, 0);
    curveVertex(r * 0.1, -r * 0.3);
    curveVertex(r * 0.8, -r * 0.6);
    curveVertex(r * 1.1, -r * 0.1);
    curveVertex(r * 0.9, r * 0.4);
    curveVertex(r * 0.2, r * 0.5);
    curveVertex(0, 0);
  } else if (petalType === "soft") {
    curveVertex(0, 0);
    curveVertex(r * 0.2, -r * 0.25);
    curveVertex(r * 0.95, -r * 0.3);
    curveVertex(r * 1.2, 0);
    curveVertex(r * 0.95, r * 0.3);
    curveVertex(r * 0.2, r * 0.25);
    curveVertex(0, 0);
  } else if (petalType === "neutral") {
    curveVertex(0, 0);
    curveVertex(r * 0.2, -r * 0.2);
    curveVertex(r * 0.9, -r * 0.1);
    curveVertex(r * 1.1, 0);
    curveVertex(r * 0.9, r * 0.1);
    curveVertex(r * 0.2, r * 0.2);
    curveVertex(0, 0);
  } else if (petalType === "sharp") {
    curveVertex(0, 0);
    curveVertex(r * 0.15, -r * 0.15);
    curveVertex(r * 1.0, -r * 0.4);
    curveVertex(r * 1.3, 0);
    curveVertex(r * 1.0, r * 0.4);
    curveVertex(r * 0.15, r * 0.15);
    curveVertex(0, 0);
  } else {
    // split
    curveVertex(0, 0);
    curveVertex(r * 0.15, -r * 0.3);
    curveVertex(r * 0.8, -r * 0.6);
    curveVertex(r * 1.2, -r * 0.2);
    curveVertex(r * 1.05, 0);
    curveVertex(r * 1.2, r * 0.25);
    curveVertex(r * 0.8, r * 0.55);
    curveVertex(r * 0.2, r * 0.3);
    curveVertex(0, 0);
  }

  endShape(CLOSE);
}

//------------------------------------------------------
// STEM
//------------------------------------------------------
function drawStem(mem, alpha) {
  // ⭐ 强制用 HSB 模式，这样 alpha 就是 0~1 了
  colorMode(HSB, 360, 100, 100, 1);

  // 茎
  stroke(120, 60, 60, alpha);
  strokeWeight(4);
  line(0, 0, 0, 80 * mem.grow);

  // 叶子
  noStroke();
  fill(120, 50, 80, alpha);

  // 左叶
  push();
  translate(0, 40 * mem.grow);
  rotate(-PI / 6);
  ellipse(-15, 0, 25 * mem.grow, 14 * mem.grow);
  pop();

  // 右叶
  push();
  translate(0, 55 * mem.grow);
  rotate(PI / 7);
  ellipse(15, 0, 28 * mem.grow, 16 * mem.grow);
  pop();
}

//------------------------------------------------------
// FLOATING KEYWORDS – 记忆碎片小标签（贴纸版）
//------------------------------------------------------
function drawFragments(mem) {
  if (mem.decay >= 1) return;
  if (!mem.fragments || mem.fragments.length === 0) return;

  textAlign(CENTER, CENTER);

  for (let f of mem.fragments) {
    let angle = frameCount * 0.01 + f.angleOffset;
    let floatY = sin(frameCount * 0.02 + f.angleOffset) * 10;

    let kx = mem.x + cos(angle) * f.radius;
    let ky = mem.y + sin(angle) * f.radius - 40 + floatY;

    let labelW = textWidth(f.word) + 22;
    let labelH = 26;

    // 背景贴纸
    push();
    rectMode(CENTER);
    noStroke();
    fill(255, 253, 250, 235); // 稍微奶白一点
    rect(kx, ky, labelW, labelH, 12);
    pop();

    // 外圈淡淡的粉色描边
    push();
    rectMode(CENTER);
    noFill();
    stroke(255, 210, 220, 190);
    strokeWeight(1);
    rect(kx, ky, labelW, labelH, 12);
    pop();

    // 文字
    fill(90, 70, 75);
    textSize(18);
    text(f.word, kx, ky);
  }
}

//------------------------------------------------------
// PHOTO TAG – 每朵花的照片小圆标签
//------------------------------------------------------
function drawPhotoTag(mem) {
  if (!mem.photoImg || mem.decay >= 1) return;

  // 小圆的半径和位置偏移
  const r = 26;
  const offsetX = 0;
  const offsetY = -90;   // 花上方一点点

  push();
  translate(mem.x + offsetX, mem.y + offsetY);

  // 用 canvas clip 做一个圆形头像
  colorMode(RGB, 255);
  drawingContext.save();

  ellipse(0, 0, r * 2, r * 2);
  drawingContext.clip();

  imageMode(CENTER);
  image(mem.photoImg, 0, 0, r * 2, r * 2);

  drawingContext.restore();

  // 白色描边圈
  noFill();
  stroke(255, 255, 255, 230);
  strokeWeight(3);
  ellipse(0, 0, r * 2 + 3, r * 2 + 3);

  pop();
}

//------------------------------------------------------
// BACKGROUND + PAPER TEXTURE
//------------------------------------------------------
function drawBackground() {
  colorMode(RGB, 255);
  noFill();
  for (let y = 0; y < height; y++) {
    let c = lerpColor(color(255, 235, 245), color(190, 210, 255), y / height);
    stroke(c);
    line(0, y, width, y);
  }
    // ---- 在底部加一层很淡的“草地雾气” ----
  noStroke();
  for (let y = int(height * 0.65); y < height; y++) {
    let t = map(y, height * 0.65, height, 0, 1);
    // 从几乎透明 → 稍微一点点淡绿
    let g = lerpColor(
      color(255, 255, 255, 0),       // 透明
      color(210, 240, 220, 120),      // 很淡的浅绿
      t
    );
    fill(g);
    rect(0, y, width, 1);
  }
}

function generatePaperTexture() {
  paperTexture = createGraphics(windowWidth, windowHeight);
  let g = paperTexture;

  g.noStroke();
  g.fill(255, 248, 240);
  g.rect(0, 0, windowWidth, windowHeight);

  g.stroke(230, 210, 210, 80);
  for (let y = 70; y < height; y += 32)
    g.line(40, y, width - 40, y);

  g.stroke(240, 220, 210, 70);
  for (let i = 0; i < 260; i++) {
    let x = random(width), y = random(height), len = random(8, 24), a = random(TWO_PI);
    g.line(x, y, x + cos(a) * len, y + sin(a) * len);
  }

  for (let i = 0; i < 2500; i++) {
    let x = random(width), y = random(height);
    g.fill(255, random(150, 220));
    g.rect(x, y, 1, 1);
  }
}

//------------------------------------------------------
// CAPTION (floating bubble)
//------------------------------------------------------
function drawCaption() {
  textAlign(CENTER, CENTER);

  // 没有花时的提示
  if (memories.length === 0) {
    textSize(24);
    fill(70, 55, 60);
    text("Write a memory to grow your first flower.", width / 2, 50);
    return;
  }

  // 选一朵要展示的记忆：优先 hover 的那朵
  let mem = null;
  let showNearFlower = false;

  if (hoveredIndex >= 0 && !memories[hoveredIndex].isDeleting) {
    mem = memories[hoveredIndex];
    showNearFlower = true;
  } else {
    for (let i = memories.length - 1; i >= 0; i--) {
      if (!memories[i].isDeleting) {
        mem = memories[i];
        break;
      }
    }
  }

  if (!mem) return;

  // 气泡位置：hover 时跟着花，否则固定在上方
  let bx = showNearFlower ? mem.x : width / 2;
  let by = showNearFlower ? mem.y - 80 : 60;

  // 计算宽度
  textSize(22);
  let w1 = textWidth(mem.text);
  textSize(14);
  let w2 = textWidth(mem.createdAt || "");
  let bubbleW = max(w1, w2) + 40;
  let bubbleH = 55;

  // 画白色小贴纸 + 粉色描边
  push();
  rectMode(CENTER);
  stroke(255, 210, 220, 220);   // 淡粉描边
  strokeWeight(1.2);
  fill(255, 255, 255, 235);     // 微微偏实的白
  rect(bx, by, bubbleW, bubbleH, 18);
  pop();

  // 文字：主文本 + 日期
  textAlign(CENTER, CENTER);

  textSize(22);
  fill(70, 55, 60);
  text(mem.text, bx, by - 6);

  if (mem.createdAt) {
    textSize(14);
    fill(140, 110, 120);
    text(mem.createdAt, bx, by + 12);
  }
}

//------------------------------------------------------
// HOVER HALO – 鼠标悬停时的发光圈
//------------------------------------------------------
function drawHoverHalo() {
  push();
  noFill();
  stroke(255, 255, 255, 220); // 白色微透明
  strokeWeight(2);
  circle(0, 0, 120);         // 以当前花心为圆心的光圈
  pop();
}

//------------------------------------------------------
// SIGNATURE
//------------------------------------------------------
function drawSignature() {
  push();
  textAlign(RIGHT, BOTTOM);
  textSize(14);

  // 颜色很淡，避免抢镜
  fill(120, 100);  // 深一点的灰棕，带透明

  const marginX = 24;
  const marginY = 18;

  text("made with ♡  by Suda", width - marginX, height - marginY);
  pop();
}

//------------------------------------------------------
// DELETE
//------------------------------------------------------
function mousePressed() {
  for (let i = memories.length - 1; i >= 0; i--) {
    if (dist(mouseX, mouseY, memories[i].x, memories[i].y) < 60) {
      memories[i].isDeleting = true;
      return;
    }
  }
}

function removeDeletedMemories() {
  let changed = false;
  for (let i = memories.length - 1; i >= 0; i--) {
    if (memories[i].toRemove) {
      memories.splice(i, 1);
      changed = true;
    }
  }
  if (changed) {
    layoutGarden();
    saveMemories();
    renderDiaryList();   // ⭐ 新增：更新日记本
  }
}

//------------------------------------------------------
// RESIZE
//------------------------------------------------------
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generatePaperTexture();
  layoutGarden();
}

// ❓ Toggle info popup
// ? Toggle info popup
const infoBtn = document.querySelector(".info-btn");
const infoPopup = document.getElementById("infoPopup");

if (infoBtn && infoPopup) {
  infoBtn.onclick = () => {
    infoPopup.style.display =
      (infoPopup.style.display === "block") ? "none" : "block";
  };
}



