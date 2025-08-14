// js/systems/ui.js

import { SKILL_DATABASE, PERMANENT_UPGRADES } from '../config.js';
import { playerGems, playerUpgrades, savePermanentData, spendGems, upgradeSkill } from './save.js';
import SoundManager from './sound.js';
import { formatTime } from './utils.js';

export const ui = {
    layer: document.getElementById('ui-layer'),
    mainMenu: document.getElementById('main-menu'),
    pauseMenu: document.getElementById('pause-menu'),
    gameOverScreen: document.getElementById('game-over-screen'),
    levelUpScreen: document.getElementById('level-up-screen'),
    guideScreen: document.getElementById('guide-screen'),
    rankScreen: document.getElementById('rank-screen'),
    upgradesMenu: document.getElementById('upgrades-menu'),
    hud: document.getElementById('hud'),
    temporaryMessage: document.getElementById('temporary-message'),
    dashButtonMobile: document.getElementById('dash-button-mobile')
};

export function updateHUD(player, gameTime, frameCount) {
    if (!player) return;

    if (frameCount % 6 === 0) { // Otimização para não atualizar a cada frame
        document.getElementById('health-bar').style.width = `${(player.health / player.maxHealth) * 100}%`;
        document.getElementById('xp-bar').style.width = `${(player.xp / player.xpToNextLevel) * 100}%`;
    }
    document.getElementById('timer').innerText = formatTime(gameTime);
    updateSkillsHUD(player);
}

function updateSkillsHUD(player) {
    if (!player || !player.skills) return;

    for (const skillId in player.skills) {
        const skillState = player.skills[skillId];
        const skillData = SKILL_DATABASE[skillId];
        const hudElement = document.getElementById(`hud-skill-${skillId}`);

        if (!hudElement) continue; 

        if (skillData.cooldown > 0 && skillState.timer > 0) {
            hudElement.classList.add('on-cooldown');
        } else {
            hudElement.classList.remove('on-cooldown');
        }
    }
}

export function showTemporaryMessage(message, color = "white") {
    ui.temporaryMessage.textContent = message;
    ui.temporaryMessage.style.color = color;
    ui.temporaryMessage.classList.add('show');
    setTimeout(() => {
        ui.temporaryMessage.classList.remove('show');
    }, 2000); // 2 segundos
}

export function populateLevelUpOptions(player, gameContext) {
    const container = document.getElementById('skill-options');
    container.innerHTML = '';
    
    let options = [];
    // Adiciona habilidades que podem ser melhoradas
    for(const skillId in player.skills){
        const skillData = SKILL_DATABASE[skillId];
        if(skillData && player.skills[skillId].level < skillData.levels.length) {
            options.push(skillId);
        }
    }
    
    // Adiciona novas habilidades disponíveis
    let availableSkills = Object.keys(SKILL_DATABASE).filter(id => !player.skills[id] && SKILL_DATABASE[id].type !== 'utility');
    availableSkills.sort(() => 0.5 - Math.random());
    options.push(...availableSkills);
    
    // Garante que opções não se repitam e pega 3 aleatórias
    let finalOptions = [...new Set(options)].sort(() => 0.5 - Math.random()).slice(0, 3);
    
    // Adiciona cura se houver espaço
    if (finalOptions.length < 3 && !finalOptions.includes('heal')) {
        finalOptions.push('heal');
    }
    
    finalOptions.forEach(skillId => {
        const skill = SKILL_DATABASE[skillId]; 
        const card = document.createElement('div');
        card.className = 'skill-card';
        const currentLevel = player.skills[skillId]?.level || 0;
        let levelText = skill.type !== 'utility' || (skill.levels && skill.levels.length > 1) ? ` (Nível ${currentLevel + 1})` : '';
        let descText = skill.desc || (skill.levels && skill.levels[currentLevel] ? skill.levels[currentLevel].desc : 'Nova Habilidade!');

        card.innerHTML = `<h3>${skill.name}${levelText}</h3><p>${descText}</p>`;
        card.onclick = (event) => {
            event.stopPropagation();
            player.addSkill(skillId, gameContext);
            gameContext.setGameState('playing');
        };
        container.appendChild(card);
    });
}

function updateGemDisplay() {
    document.getElementById('gem-counter').textContent = playerGems;
    document.getElementById('gem-counter-upgrades').textContent = playerGems;
}

function showRank() {
    document.getElementById('rank-time').innerText = formatTime(parseInt(localStorage.getItem('bestTime') || '0'));
    document.getElementById('rank-total-kills').innerText = parseInt(localStorage.getItem('totalKills') || '0');
}

function populateUpgradesMenu() {
    const container = document.getElementById('upgrades-options');
    container.innerHTML = '';
    updateGemDisplay();

    for (const key in PERMANENT_UPGRADES) {
        const upgrade = PERMANENT_UPGRADES[key];
        const currentLevel = playerUpgrades[key] || 0;
        const maxLevel = upgrade.levels.length;
        
        const card = document.createElement('div');
        card.className = 'skill-card';
        
        if (currentLevel < maxLevel) {
            const nextLevelData = upgrade.levels[currentLevel];
            card.innerHTML = `<h3>${upgrade.name} (Nível ${currentLevel}/${maxLevel})</h3>
                              <p>${upgrade.desc(nextLevelData.effect)}</p>
                              <p>Custo: <strong>${nextLevelData.cost} Gemas</strong></p>`;
            if (playerGems >= nextLevelData.cost) {
                card.onclick = () => {
                    if (spendGems(nextLevelData.cost)) {
                        upgradeSkill(key);
                        savePermanentData();
                        SoundManager.play('levelUp', ['C5', 'G5']);
                        populateUpgradesMenu();
                    }
                };
            } else {
                card.style.opacity = 0.5;
                card.style.cursor = 'not-allowed';
            }
        } else {
            card.innerHTML = `<h3>${upgrade.name} (Nível MÁXIMO)</h3><p>${upgrade.desc(upgrade.levels[maxLevel-1].effect)}</p>`;
            card.style.opacity = 0.7;
            card.style.cursor = 'default';
        }
        container.appendChild(card);
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Erro: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

export function setupEventListeners(gameContext) {
    const { setGameState, initGame, player, isMobile, keys, movementVector } = gameContext;

    document.getElementById('play-button').onclick = initGame;
    document.getElementById('restart-button-pause').onclick = initGame;
    document.getElementById('restart-button-gameover').onclick = initGame;

    document.getElementById('resume-button').onclick = () => setGameState('playing');
    document.getElementById('back-to-menu-button-pause').onclick = () => setGameState('menu');
    document.getElementById('back-to-menu-button-gameover').onclick = () => setGameState('menu');
    
    document.getElementById('guide-button').onclick = () => setGameState('guide');
    document.getElementById('back-from-guide-button').onclick = () => setGameState('menu');
    
    document.getElementById('rank-button').onclick = () => {
        showRank();
        setGameState('rank');
    };
    document.getElementById('back-from-rank-button').onclick = () => setGameState('menu');
    
    document.getElementById('upgrades-button').onclick = () => {
        populateUpgradesMenu();
        setGameState('upgrades');
    };
    document.getElementById('back-from-upgrades-button').onclick = () => setGameState('menu');
    
    document.getElementById('pause-button').onclick = () => {
        if (gameContext.player) setGameState('paused');
    };
    document.getElementById('fullscreen-button').onclick = toggleFullscreen;

    // Controles
    if (isMobile) {
        let touchIdentifier = null;
        const joystickBase = document.createElement('div');
        joystickBase.className = 'joystick-base';
        const joystickHandle = document.createElement('div');
        joystickHandle.className = 'joystick-handle';
        joystickBase.appendChild(joystickHandle);

        const touchStart = (e) => {
            if (e.target.closest('.ui-button')) return;
            if (gameState !== 'playing' || touchIdentifier !== null) return;
            e.preventDefault();
            const touch = e.changedTouches[0];
            touchIdentifier = touch.identifier;
            joystickBase.style.left = `${touch.clientX - 70}px`;
            joystickBase.style.top = `${touch.clientY - 70}px`;
            document.body.appendChild(joystickBase);
            movementVector.startX = touch.clientX;
            movementVector.startY = touch.clientY;
        };

        const touchMove = (e) => {
            if (gameState !== 'playing' || touchIdentifier === null) return;
            e.preventDefault();
            for (let touch of e.touches) {
                if (touch.identifier === touchIdentifier) {
                    const dx = touch.clientX - movementVector.startX;
                    const dy = touch.clientY - movementVector.startY;
                    const dist = Math.min(Math.hypot(dx, dy), 70);
                    const angle = Math.atan2(dy, dx);
                    joystickHandle.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
                    
                    const deadZone = 10;
                    movementVector.x = dist > deadZone ? Math.cos(angle) : 0;
                    movementVector.y = dist > deadZone ? Math.sin(angle) : 0;
                    break;
                }
            }
        };

        const touchEnd = (e) => {
            for (let touch of e.changedTouches) {
                if (touch.identifier === touchIdentifier) {
                    touchIdentifier = null;
                    joystickHandle.style.transform = 'translate(0,0)';
                    if (joystickBase.parentNode) joystickBase.parentNode.removeChild(joystickBase);
                    movementVector.x = 0;
                    movementVector.y = 0;
                    break;
                }
            }
        };

        window.addEventListener('touchstart', touchStart, { passive: false });
        window.addEventListener('touchmove', touchMove, { passive: false });
        window.addEventListener('touchend', touchEnd);
        window.addEventListener('touchcancel', touchEnd);

        ui.dashButtonMobile.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (gameContext.player) gameContext.player.dash();
        }, { passive: false });

    } else { // Controles PC
        window.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;
            keys[e.code] = true;
            if (e.key === 'Escape') {
                if (gameState === 'playing') setGameState('paused');
                else if (gameState === 'paused') setGameState('playing');
            }
        });
        window.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
            keys[e.code] = false;
        });
    }

    window.addEventListener('blur', () => {
        if (gameState === 'playing') setGameState('paused');
    });
}
