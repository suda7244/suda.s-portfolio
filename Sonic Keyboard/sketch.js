let actors = [];
let state = {
  total: 0,
  fatigue: 0,          // 0..1
  muted: false,
  archives: [],
  maxArchives: 80,
  outcomeTriggered: false
};

function getArchiveLabel() {
  // 先用 keyCode 处理功能键，避免空格被当成空输入
  if (keyCode === 32) return "SPACE";
  if (keyCode === 8)  return "BACKSPACE";
  if (keyCode === 16) return "SHIFT";
  if (keyCode === 91 || keyCode === 93) return "META";

  const k = (key || "").toUpperCase();

  // 只记录 A-Z（你想记录更多键再加）
  if (k.length === 1 && k >= "A" && k <= "Z") return k;

  return null; // 其他都不记录
}

let ui = {};

function setup(){
  const c = createCanvas(windowWidth - 360, windowHeight - document.querySelector(".topbar").offsetHeight);
  c.position(0, document.querySelector(".topbar").offsetHeight);
  c.style("display","block");

  ui.total = document.getElementById("total");
  ui.fatigue = document.getElementById("fatigue");
  ui.archiveList = document.getElementById("archiveList");
  ui.muteBtn = document.getElementById("muteBtn");
  ui.resetBtn = document.getElementById("resetBtn");

  ui.muteBtn.onclick = () => {
    state.muted = !state.muted;
    setMuted(state.muted);
    ui.muteBtn.textContent = `Mute: ${state.muted ? "On" : "Off"}`;
  };

  ui.resetBtn.onclick = resetAll;

  background(0);
  noCursor();
}

function draw(){
  const wear = state.fatigue * 55;
  background(8 + wear, 18);

  drawCompressionDust(state.fatigue);

  for (let i = actors.length - 1; i >= 0; i--) {
    actors[i].update();
    actors[i].draw();
    if (actors[i].dead) actors.splice(i, 1);
  }

  drawCursorWound(mouseX, mouseY, state.fatigue);

  ui.total.textContent = String(state.total);
  ui.fatigue.textContent = state.fatigue.toFixed(2);

  if (!state.outcomeTriggered && state.total >= 180) {
    state.outcomeTriggered = true;
    pushArchiveSystemMessage("THRESHOLD", "The system starts to bite back.");
  }
  if (state.outcomeTriggered) drawOutcomeHint();
}

function keyPressed() {

  if (keyCode === 8) { // backspace
    playErase();
    pushArchiveSystemMessage("ERASE?", "Attempt logged. Record remains.");
    return false;
  }

  if (keyCode === 32) { // space
    playSpace();
    pushArchiveSystemMessage("SPACE", "Breath / pause.");
    return false;
  }


  if (keyCode === 13) { // enter
  playEnter();        
  logLabour("ENTER"); 
  return false;
}

  const k = (key || "").toUpperCase();

  if (k === "A") playA();
  else if (k === "S") playS();
  else if (k === "D") playD();
  else if (k === "F") playF();

  if (k.length === 1 && k !== " ") logLabour(k);

  return false;
}


function logLabour(k){
  state.total++;
  const growth = state.total < 180 ? 0.008 : 0.012;
  state.fatigue = constrain(state.fatigue + growth, 0, 1);

  const x = random(width);
  const y = random(height);
  spawnVisualForKey(k, x, y, state.fatigue);

  playLabourSound(k, state.fatigue);

  pushArchive(k, state.fatigue);
}

function spawnVisualForKey(k, x, y, fatigue){
  const code = k.charCodeAt(0);
  const idx = constrain(code - 65, 0, 25);

  if (idx % 4 === 0) actors.push(new PulseCircle(x, y, fatigue));
  else if (idx % 4 === 1) actors.push(new ParticleBurst(x, y, fatigue));
  else if (idx % 4 === 2) actors.push(new ScanLine(random() < 0.5 ? "h" : "v", fatigue));
  else actors.push(new TypoStamp(k, x, y, fatigue));
}

// ------------------- Archive Wall -------------------
function pushArchive(k, fatigue){
  const item = {
    t: new Date(),
    key: k,
    fatigue: fatigue
  };
  state.archives.unshift(item);
  state.archives = state.archives.slice(0, state.maxArchives);
  renderArchive();
}

function pushArchiveSystemMessage(k, msg){
  state.archives.unshift({ t: new Date(), key: k, fatigue: state.fatigue, msg });
  state.archives = state.archives.slice(0, state.maxArchives);
  renderArchive();
}

function renderArchive(){
  ui.archiveList.innerHTML = state.archives.map(a => {
    const time = a.t.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit", second:"2-digit"});
    const pct = Math.round(a.fatigue * 100);
    const note = a.msg ? `<div class="meta"><span>${time}</span><span>${a.msg}</span></div>` :
                         `<div class="meta"><span>${time}</span><span>fatigue ${a.fatigue.toFixed(2)}</span></div>`;
    return `
      <div class="card">
        <div class="k">${escapeHtml(a.key)}</div>
        ${note}
        <div class="bar"><div style="width:${pct}%"></div></div>
      </div>
    `;
  }).join("");
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ------------------- Visual Modules -------------------
class PulseCircle{
  constructor(x,y,f){
    this.x=x; this.y=y;
    this.r=10;
    this.life=255;
    this.f=f;
  }
  update(){ this.r += 10 + this.f*14; this.life -= 10; this.dead = this.life<=0; }
  draw(){
    noFill();
    stroke(255, this.life);
    strokeWeight(2 + this.f*3);
    circle(this.x, this.y, this.r);
  }
}

class ParticleBurst{
  constructor(x,y,f){
    this.p=[];
    this.life=255;
    this.f=f;
    const n = 18 + Math.floor(f*26);
    for(let i=0;i<n;i++){
      const a = random(TWO_PI);
      const sp = random(2, 7 + f*10);
      this.p.push({x,y,vx:cos(a)*sp, vy:sin(a)*sp});
    }
  }
  update(){
    this.life -= 12;
    for(const pt of this.p){
      pt.x += pt.vx; pt.y += pt.vy;
      pt.vx *= 0.94; pt.vy *= 0.94;
    }
    this.dead = this.life<=0;
  }
  draw(){
    noStroke();
    fill(255, this.life);
    for(const pt of this.p) circle(pt.x, pt.y, 2 + this.f*2);
  }
}

class ScanLine{
  constructor(dir,f){
    this.dir=dir; this.f=f; this.t=0; this.life=255;
  }
  update(){ this.t += 14 + this.f*18; this.life -= 18; this.dead = this.life<=0; }
  draw(){
    stroke(255, this.life);
    strokeWeight(1 + this.f*5);
    if(this.dir==="h"){
      const y = (this.t % height);
      line(0, y, width, y);
    }else{
      const x = (this.t % width);
      line(x, 0, x, height);
    }
  }
}

class TypoStamp{
  constructor(ch,x,y,f){
    this.ch=ch; this.x=x; this.y=y;
    this.life=255;
    this.s=18 + f*48;
    this.f=f;
  }
  update(){ this.life -= 14; this.y += 0.4 + this.f*1.2; this.dead=this.life<=0; }
  draw(){
    noStroke();
    fill(255, this.life);
    textAlign(CENTER, CENTER);
    textSize(this.s);
    text(this.ch, this.x, this.y);
  }
}

// ------------------- Conceptual overlays -------------------
function drawCompressionDust(f){
  if (f <= 0.2) return;
  const n = Math.floor(map(f, 0.2, 1.0, 40, 220));
  noStroke();
  for(let i=0;i<n;i++){
    const x = random(width), y = random(height);
    const s = random(1, 3 + f*3);
    fill(255, random(8, 22 + f*20));
    rect(x, y, s, s);
  }
}

function drawCursorWound(x,y,f){
  push();
  noFill();
  stroke(255, 120);
  strokeWeight(1.2 + f*2.4);
  const r = 6 + 14 * (1 + sin(frameCount*0.08)) * 0.5;
  circle(constrain(x,0,width), constrain(y,0,height), r);
  pop();
}

function drawOutcomeHint(){
  push();
  noStroke();
  fill(255, 210);
  textAlign(LEFT, TOP);
  textSize(12);
  const msg = "Outcome Room: your input has accumulated into noise.\nKeep typing to feel the system’s fatigue mapping.";
  text(msg, 12, 12);
  pop();
}

function resetAll(){
  actors = [];
  state.total = 0;
  state.fatigue = 0;
  state.archives = [];
  state.outcomeTriggered = false;
  renderArchive();
}

function windowResized(){
  const topH = document.querySelector(".topbar").offsetHeight;
  resizeCanvas(windowWidth - 360, windowHeight - topH);
}
