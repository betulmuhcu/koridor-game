// --- UI DEĞİŞKENLERİ ---
let isGameRunning = false;
let isPaused = false;
let isCountingDown = false; 

// --- SES SİSTEMİ (AUDIO ENGINE) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = new AudioContext();
let isMuted = false;

function playSound(type) {
    if (isMuted || !isGameRunning) return;
    
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'move') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    } 
    else if (type === 'portal') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.2);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } 
    else if (type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
    else if (type === 'levelup') { 
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.1);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
}

function toggleMute() {
    isMuted = !isMuted;
    const btn = document.getElementById('muteBtn');
    if (isMuted) {
        btn.innerText = "SES: KAPALI 🔇";
        btn.style.borderColor = "#555";
        btn.style.color = "#888";
    } else {
        btn.innerText = "SES: AÇIK 🔊";
        btn.style.borderColor = "#00d2ff";
        btn.style.color = "#00d2ff";
    }
}

// --- UI FONKSİYONLARI ---
function startGame() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('pauseContainer').classList.remove('hidden');
    isGameRunning = true;
    isPaused = false;
    isCountingDown = false;
    gameState = 'PLAYING';
    resetValues();
    loop(); 
}

function quitToMainMenu() {
    isPaused = false;
    isGameRunning = false;
    isCountingDown = false;
    
    document.getElementById('pauseMenu').classList.add('hidden');
    document.getElementById('countdown-overlay').classList.add('hidden');
    document.getElementById('pauseContainer').classList.add('hidden');
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('startScreen').classList.remove('hidden');
    
    resetValues(); 
    draw(); 
}

function showInstructions() {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('instructionScreen').classList.remove('hidden');
}

function hideInstructions() {
    document.getElementById('instructionScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
}

function togglePause() {
    if (!isGameRunning || gameState === 'GAMEOVER' || isCountingDown) return;
    
    const pauseMenu = document.getElementById('pauseMenu');
    const pauseBtn = document.getElementById('pauseBtn');
    
    if (!isPaused) {
        isPaused = true;
        pauseMenu.classList.remove('hidden');
        pauseBtn.innerText = "▶";
    } else {
        isCountingDown = true;
        pauseMenu.classList.add('hidden'); 
        
        const countdownOverlay = document.getElementById('countdown-overlay');
        const countdownText = document.getElementById('countdown-text');
        countdownOverlay.classList.remove('hidden');
        
        let count = 3;
        countdownText.innerText = count;
        
        let countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownText.innerText = count;
            } else {
                clearInterval(countdownInterval);
                countdownOverlay.classList.add('hidden');
                isCountingDown = false;
                isPaused = false;
                pauseBtn.innerText = "II";
                loop(); 
            }
        }, 1000);
    }
}

// ==========================================
// OYUN MOTORU
// ==========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false }); 
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');
const retryBtn = document.getElementById('retry-btn');
const bodyEl = document.body;
const pauseBtnEl = document.getElementById('pauseBtn');

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const dpr = Math.min(window.devicePixelRatio || 1, 2);

function resizeCanvas() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const config = {
    outerSize: isMobile ? 300 : 340, 
    wallThickness: isMobile ? 55 : 65, 
    playerSize: 22,
    baseSpeed: isMobile ? 3.50 : 1.80,      
    maxSpeed: 8.0,        
    acceleration: 0.0001, 
    jumpSpeed: isMobile ? 0.45 : 0.22,      
    rotationSpeed: 0.3,
    obstacleGrowthSpeed: 0.1, 
    fallingSpeed: 0.08 
};

let gameState = 'START'; 
let obstacles = [];
let particles = [];
let lastObstacleDist = 0;
let globalRotation = 0; 
 
let storedHighScore = localStorage.getItem('blockRunnerHighScore');
let highScore = storedHighScore ? parseInt(storedHighScore) : 0;
highScoreEl.innerText = highScore;

let state = {
    distance: 0, lane: 0, currentOffset: 0, rotation: 0,
    speed: config.baseSpeed, normalSpeed: config.baseSpeed, score: 0, playerScale: 1.0,
    lastCharPos: {x: 0, y: 0}, teleportCooldown: 0,
    lastScorePhase: 0 
};

const outerHalf = config.outerSize / 2;
const innerHalf = (config.outerSize - (config.wallThickness * 2)) / 2;

function handleAction(e) {
    if (isPaused || !isGameRunning || isCountingDown) return;
    if (e && (e.target.tagName === 'BUTTON' || e.target.closest('button'))) return;
    if (e && e.type === 'touchstart') e.preventDefault();

    if (gameState === 'PLAYING') {
        state.lane = state.lane === 0 ? 1 : 0;
        playSound('move');
    }
}

window.addEventListener('mousedown', handleAction);
window.addEventListener('touchstart', handleAction, {passive: false});
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') handleAction(e);
});

retryBtn.addEventListener('mousedown', (e) => { e.stopPropagation(); restartGame(); });
retryBtn.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); restartGame(); });

function restartGame() {
    gameOverEl.style.display = 'none';
    gameState = 'PLAYING';
    resetValues();
    isPaused = false;
    document.getElementById('pauseBtn').innerText = "II";
}

function resetValues() {
    state.distance = 0; state.lane = 0; state.currentOffset = 0;
    state.rotation = 0; state.speed = config.baseSpeed; 
    state.normalSpeed = config.baseSpeed;
    state.score = 0; state.playerScale = 1.0; state.teleportCooldown = 0;
    state.lastScorePhase = 0;
    obstacles = [];
    particles = [];
    lastObstacleDist = 0;
    scoreEl.innerText = '0';
    highScoreEl.innerText = highScore;
}

function createExplosion(x, y, color) {
    let pCount = isMobile ? 8 : 20; 
    for (let i = 0; i < pCount; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 15, 
            vy: (Math.random() - 0.5) * 15,
            life: 1.0, color: color, size: Math.random() * 6 + 2
        });
    }
}
 
function createTeleportEffect(x, y, color) {
    let pCount = isMobile ? 5 : 15;
    for (let i = 0; i < pCount; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 20, 
            vy: (Math.random() - 0.5) * 20,
            life: 0.8, color: color, size: Math.random() * 4 + 1
        });
    }
}

function spawnObstacles() {
    if (state.distance < 100) return; 

    // --- ZORLUK ÇARPANI (Puan arttıkça zorluk artar, 1000 puanda zirveye ulaşır) ---
    let difficulty = Math.min(state.score / 1000, 1);

    // Puan arttıkça engeller arası boşluk azalır (daha sık engel gelir)
    const minGap = Math.max(180 + (state.speed * 10), (250 + (state.speed * 15)) - (difficulty * 100)); 
    
    if (state.distance > lastObstacleDist + minGap) {
        let spawnChance = Math.random();
        
        // Puan arttıkça o karede engel oluşma ihtimali artar 
        let currentSpawnChance = 0.12 + (difficulty * 0.13); 

        if (spawnChance < currentSpawnChance) { 
            let candidateDist = state.distance + 900;
            let sideLen = config.outerSize;
            let posOnSide = (candidateDist % (sideLen * 4)) % sideLen;
            
            if (posOnSide < 80) candidateDist += 100;
            else if (posOnSide > (sideLen - 80)) candidateDist += 150;

            if (obstacles.some(o => {
                let oEnd = o.dist + (o.length || 0);
                return (candidateDist > o.dist - 250 && candidateDist < oEnd + 250);
            })) return;

            const portalExists = obstacles.some(o => o.type === 'portalEntry' || o.type === 'portalExit');
            
            if (state.score >= 250 && Math.random() < 0.25) { 
                let stripLength = 300 + Math.random() * 500;
                obstacles.push({
                    dist: candidateDist,
                    type: 'speedStrip',
                    lane: Math.random() > 0.5 ? 1 : 0, 
                    scale: 1,
                    length: stripLength
                });
                lastObstacleDist = candidateDist + stripLength; 
                obstacles.sort((a, b) => a.dist - b.dist);
                return; 
            }

            // Portal çıkma ihtimali de zorlukla beraber artar 
            let portalChance = 0.18 + (difficulty * 0.10);

            if (state.score > 150 && Math.random() < portalChance && !portalExists) {
                let startLane = Math.random() > 0.5 ? 0 : 1;
                let endLane = (startLane === 0) ? 1 : 0;
                let gap = 250 + Math.random() * 600;

                if (obstacles.some(o => {
                    let oEnd = o.dist + (o.length || 0);
                    let checkDist = candidateDist + gap;
                    return (checkDist > o.dist - 250 && checkDist < oEnd + 250);
                })) return;

                obstacles.push({
                    dist: candidateDist,
                    type: 'portalEntry',
                    scale: 0,
                    lane: startLane,
                    targetDist: candidateDist + gap, 
                    targetLane: endLane
                });

                obstacles.push({
                    dist: candidateDist + gap,
                    type: 'portalExit',
                    scale: 0,
                    lane: endLane,
                    targetDist: candidateDist, 
                    targetLane: startLane
                });
            } else {
                let obstacleType = 'spike'; 
                if (state.score >= 50) {
                    obstacleType = Math.random() > 0.5 ? 'pit' : 'spike';
                }
                obstacles.push({
                    dist: candidateDist,
                    lane: Math.random() > 0.5 ? 1 : 0, scale: 0, type: obstacleType
                });
            }
            lastObstacleDist = state.distance;
            obstacles.sort((a, b) => a.dist - b.dist);
        }
    }
}

function getThemeColors() {
    let phase = Math.floor(state.score / 100) % 2;
    if (phase === 0) {
        return { bg: '#050505', wall: '#fff', obstacle: '#000', player: '#000', text: '#fff' };
    } else {
        return { bg: '#fff', wall: '#111', obstacle: '#fff', player: '#fff', text: '#000' };
    }
}
 
function update() {
    globalRotation += 0.05; 

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }

    if (state.teleportCooldown > 0) state.teleportCooldown--;

    const colors = getThemeColors();

    if (gameState === 'FALLING') {
        state.playerScale -= config.fallingSpeed;
        if (state.playerScale <= 0) {
            state.playerScale = 0;
            createExplosion(state.lastCharPos.x, state.lastCharPos.y, colors.obstacle);
            doGameOver();
        }
        return;
    }

    if (gameState !== 'PLAYING') return;

    if (state.normalSpeed < config.maxSpeed) state.normalSpeed += config.acceleration;

    let onStrip = false;
    if (state.score >= 250) {
        for (let obs of obstacles) {
            if (obs.type === 'speedStrip') {
                if (state.distance >= obs.dist && state.distance <= obs.dist + obs.length) {
                    let currentLaneInt = state.currentOffset > 0.5 ? 1 : 0;
                    if (currentLaneInt === obs.lane) {
                        onStrip = true;
                        break;
                    }
                }
            }
        }
    }

    state.speed = onStrip ? config.maxSpeed * 2.5 : state.normalSpeed;
    state.distance += state.speed;

    state.score += state.speed * 0.01;
    let currentIntScore = Math.floor(state.score);
    scoreEl.innerText = currentIntScore;
    
    let currentPhase = Math.floor(state.score / 100);
    if (currentPhase > state.lastScorePhase) {
        playSound('levelup');
        state.lastScorePhase = currentPhase;
    }

    if (currentIntScore > highScore) {
        highScore = currentIntScore;
        highScoreEl.innerText = highScore;
        localStorage.setItem('blockRunnerHighScore', highScore);
    }

    state.currentOffset += (state.lane - state.currentOffset) * config.jumpSpeed;
    
    if (Math.abs(state.currentOffset - state.lane) > 0.02) {
         let direction = state.lane > state.currentOffset ? 1 : -1;
         state.rotation += config.rotationSpeed * direction;
    } else { 
         state.rotation = 0; 
         state.currentOffset = state.lane; 
    }

    spawnObstacles();
    
    obstacles.forEach(obs => {
        if (obs.scale < 1) obs.scale += config.obstacleGrowthSpeed;
        if (obs.scale > 1) obs.scale = 1;
    });
    
    if (obstacles.length > 0) {
        let firstEnd = obstacles[0].dist + (obstacles[0].length || 0);
        if (firstEnd < state.distance - 200) obstacles.shift();
    }

    for (let obs of obstacles) {
        let distDiff = Math.abs(obs.dist - state.distance);
        let isMidAir = (state.currentOffset > 0.2 && state.currentOffset < 0.8);
        let currentLaneInt = state.currentOffset > 0.5 ? 1 : 0;

        if (obs.type === 'portalEntry' || obs.type === 'portalExit') {
            if (distDiff < 25 && state.teleportCooldown <= 0) {
                
                let effectColor = obs.type === 'portalEntry' ? "#000000" : "#FFFFFF";
                createTeleportEffect(state.lastCharPos.x, state.lastCharPos.y, effectColor); 
                
                state.lane = obs.targetLane;
                state.currentOffset = obs.targetLane;
                state.distance = obs.targetDist;
                
                state.teleportCooldown = 150; 
                playSound('portal');
            }
        }
        else if (obs.scale > 0.8) {
            if (obs.type === 'spike') {
                if (distDiff < 20) {
                    if (!isMidAir && currentLaneInt === obs.lane) {
                        createExplosion(state.lastCharPos.x, state.lastCharPos.y, colors.obstacle); 
                        playSound('crash');
                        doGameOver(); 
                    }
                }
            } else if (obs.type === 'pit') {
                if (distDiff < 20) { 
                    if (!isMidAir && currentLaneInt === obs.lane) {
                        playSound('crash');
                        gameState = 'FALLING'; 
                    }
                }
            }
        }
    }
}

function doGameOver() {
    gameState = 'GAMEOVER';
    setTimeout(() => { if(gameState === 'GAMEOVER') gameOverEl.style.display = 'block'; }, 100);
    finalScoreEl.innerText = Math.floor(state.score);
}

function getPositionOnRect(dist, size) {
    const half = size / 2;
    const sideLen = size; 
    let d = dist % (sideLen * 4);
    if (d < sideLen) return { x: -half + d, y: -half, angle: 0 };
    else if (d < sideLen * 2) return { x: half, y: -half + (d - sideLen), angle: Math.PI / 2 };
    else if (d < sideLen * 3) return { x: half - (d - sideLen * 2), y: half, angle: Math.PI };
    else return { x: -half, y: half - (d - sideLen * 3), angle: -Math.PI / 2 };
}

function drawObstacle(obs, size, colors) {
    let drawDist = obs.dist;
    if (obs.lane === 1) {
        const ratio = (innerHalf * 4) / (outerHalf * 4);
        drawDist = obs.dist * ratio;
    }
    let pos = getPositionOnRect(drawDist, size);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(pos.angle);

    if (obs.type === 'spike') {
        ctx.fillStyle = colors.obstacle; 
        let spikeH = 18 * obs.scale; let dir = obs.lane === 0 ? 1 : -1; 
        let baseOverlap = 1.5; let basePosY = obs.lane === 0 ? -baseOverlap : baseOverlap;
        ctx.beginPath(); ctx.moveTo(-15, basePosY); ctx.lineTo(15, basePosY); ctx.lineTo(0, spikeH * dir); ctx.fill();

    } else if (obs.type === 'pit') {
        ctx.fillStyle = colors.wall; 
        let pSize = (config.playerSize + 4) * obs.scale; 
        ctx.fillRect(-pSize/2, -pSize/2, pSize, pSize);
    } 
    else if (obs.type === 'portalEntry') {
        let pSize = (config.playerSize + 16) * obs.scale;
        ctx.shadowBlur = 15; ctx.shadowColor = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000000';
        
        ctx.save(); ctx.scale(1, 0.6); 
        ctx.beginPath(); ctx.arc(0, 0, pSize/2, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 2; let swirlOffset = globalRotation % (Math.PI * 2);
        ctx.beginPath(); ctx.arc(0, 0, pSize/3, swirlOffset, swirlOffset + Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, pSize/4, swirlOffset + Math.PI/2, swirlOffset + Math.PI * 1.5); ctx.stroke();
        ctx.restore(); 

    } else if (obs.type === 'portalExit') {
        let pSize = (config.playerSize + 16) * obs.scale;
        ctx.shadowBlur = 15; ctx.shadowColor = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#FFFFFF';
        
        ctx.save(); ctx.scale(1, 0.6); 
        ctx.beginPath(); ctx.arc(0, 0, pSize/2, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 2; let swirlOffset = globalRotation % (Math.PI * 2);
        ctx.beginPath(); ctx.arc(0, 0, pSize/3, swirlOffset, swirlOffset + Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, pSize/4, swirlOffset + Math.PI/2, swirlOffset + Math.PI * 1.5); ctx.stroke();
        ctx.restore(); 
    }

    ctx.restore();
}

function draw() {
    const colors = getThemeColors();

    ctx.fillStyle = colors.bg; 
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr); 
    
    bodyEl.style.backgroundColor = colors.bg;
    scoreEl.style.color = colors.text;
    pauseBtnEl.style.color = colors.text;
    pauseBtnEl.style.borderColor = colors.text;

    ctx.save(); ctx.translate((canvas.width / dpr) / 2, (canvas.height / dpr) / 2);

    ctx.fillStyle = colors.wall; ctx.fillRect(-outerHalf, -outerHalf, config.outerSize, config.outerSize);
    ctx.fillStyle = colors.bg; ctx.fillRect(-innerHalf, -innerHalf, innerHalf*2, innerHalf*2);

    for (let obs of obstacles) {
        let size = obs.lane === 0 ? config.outerSize : (innerHalf * 2);
        
        if (obs.type === 'speedStrip') {
            ctx.save();
            let isBlack = colors.player === '#000';
            ctx.strokeStyle = isBlack ? '#000' : '#fff';
            
            ctx.lineWidth = 5; 
            ctx.lineJoin = "miter"; 
            
            ctx.shadowBlur = 6; 
            ctx.shadowColor = isBlack ? '#555' : '#fff'; 

            ctx.beginPath();
            for(let d = 0; d <= obs.length; d += 1) {
                let pDist = obs.dist + d;
                if (obs.lane === 1) {
                    const ratio = (innerHalf * 4) / (outerHalf * 4);
                    pDist *= ratio;
                }
                let pos = getPositionOnRect(pDist, size);
                if (d === 0) ctx.moveTo(pos.x, pos.y);
                else ctx.lineTo(pos.x, pos.y);
            }
            
            let finalDist = obs.dist + obs.length;
            if (obs.lane === 1) finalDist *= ((innerHalf * 4) / (outerHalf * 4));
            let finalPos = getPositionOnRect(finalDist, size);
            ctx.lineTo(finalPos.x, finalPos.y);

            ctx.stroke();
            ctx.restore();
        } else {
            drawObstacle(obs, size, colors);
        }
    }
    
    const outerPos = getPositionOnRect(state.distance, config.outerSize);
    const ratio = (innerHalf * 4) / (outerHalf * 4);
    const innerPos = getPositionOnRect(state.distance * ratio, innerHalf * 2);
    let charX = outerPos.x + (innerPos.x - outerPos.x) * state.currentOffset;
    let charY = outerPos.y + (innerPos.y - outerPos.y) * state.currentOffset;
    
    state.lastCharPos = { x: charX + canvas.width / dpr, y: charY + canvas.height / dpr };

    if (gameState !== 'GAMEOVER' || gameState === 'FALLING') {
        ctx.save(); ctx.translate(charX, charY);
        ctx.rotate(outerPos.angle + state.rotation);
        ctx.scale(state.playerScale, state.playerScale);
        
        let offsetAmount = (config.playerSize / 2) - 1;
        let yShift = offsetAmount - (state.currentOffset * offsetAmount * 2);
        ctx.translate(0, yShift);
        
        ctx.fillStyle = colors.player;
        ctx.fillRect(-config.playerSize/2, -config.playerSize/2, config.playerSize, config.playerSize);
        ctx.restore();
    }
    ctx.restore();

    for (let p of particles) {
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
    ctx.globalAlpha = 1.0;
}

function loop() {
    if (!isGameRunning || isPaused) return;
    update();
    draw();
    requestAnimationFrame(loop);
}
draw();