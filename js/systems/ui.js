// js/systems/ui.js

import { SKILL_DATABASE, PERMANENT_UPGRADES, CONFIG } from '../config.js';
import { playerGems, playerUpgrades, savePermanentData, spendGems, upgradeSkill } from './save.js';
import SoundManager from './sound.js';
import { formatTime } from './utils.js';

// Objeto UI será populado depois que a página carregar
export const ui = {};

// Função para inicializar o objeto UI
export function initUI() {
    const uiElements = {
        layer: 'ui-layer',
        mainMenu: 'main-menu',
        pauseMenu: 'pause-menu',
        gameOverScreen: 'game-over-screen',
        levelUpScreen: 'level-up-screen',
        guideScreen: 'guide-screen',
        rankScreen: 'rank-screen',
        upgradesMenu: 'upgrades-menu',
        hud: 'hud',
        temporaryMessage: 'temporary-message',
        dashButtonMobile: 'dash-button-mobile'
    };
    for (const key in uiElements) {
        ui[key] = document.getElementById(uiElements[key]);
    }
}


export function updateHUD(player, gameTime, frameCount) {
    if (!player) return;

    if (frameCount % 6 === 0) { 
        const healthPercent = (player.health / player.maxHealth) * 100;
        const xpPercent = (player.xp / player.xpToNextLevel) * 100;
        document.getElementById('health-bar').style.width = `${healthPercent > 0 ? healthPercent : 0}%`;
        document.getElementById('xp-bar').style.width = `${xpPercent > 0 ? xpPercent : 0}%`;
    }
    document.getElementById('timer').innerText = formatTime(gameTime);
    updateSkillsHUD(player);
}

export function createSkillHudIcon(skillId, level) {
    const skillData = SKILL_DATABASE[skillId];
    if (!skillData || skillData.type === 'passive') return;

    const container = document.getElementById('skills-hud');
    let hudIcon = document.getElementById(`hud-skill-${skillId}`);
    if (!hudIcon) {
        hudIcon = document.createElement('div');
        hudIcon.className = 'skill-hud-icon';
        hudIcon.id = `hud-skill-${skillId}`;
        container.appendChild(hudIcon);
    }
    hudIcon.innerHTML = `${skillData.icon}<sub>${level}</sub>`;
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
    if (ui.temporaryMessage) {
        ui.temporaryMessage.textContent = message;
        ui.temporaryMessage.style.color = color;
        ui.temporaryMessage.classList.add('show');
        setTimeout(() => {
            ui.temporaryMessage.classList.remove('show');
        }, 2000);
    }
}

export function populateLevelUpOptions(player, gameContext) {
    const container = document.getElementById('skill-options');
    container.innerHTML = '';
    
    let options = [];
    for(const skillId in player.skills){
        const skillData = SKILL_DATABASE[skillId];
        if(skillData && player.skills[skillId].level < skillData.levels.length) {
            options.push(skillId);
        }
    }
    
    let availableSkills = Object.keys(SKILL_DATABASE).filter(id => !player.skills[id] && !SKILL_DATABASE[id].instant);
    options.push(...availableSkills);
    
    let finalOptions = [...new Set(options)].sort(() => 0.5 - Math.random()).slice(0, 3);
    
    if (finalOptions.length < 3 && player.health < player.maxHealth) {
        finalOptions.push('heal');
    }
    
    finalOptions.forEach(skillId => {
        const skill = SKILL_DATABASE[skillId]; 
        const card = document.createElement('div');
        card.className = 'skill-card';
        const currentLevel = player.skills[skillId]?.level || 0;
        let levelText = skill.instant ? '' : ` (Nível ${currentLevel + 1})`;
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
            card.innerHTML = `<h3>${upgrade.name} (Nível ${currentLevel + 1}/${maxLevel})</h3>
                              <p>${upgrade.desc(nextLevelData.effect)}</p>
                              <p>Custo: <strong>${nextLevelData.cost} Gemas</strong></p>`;
            if (playerGems >= nextLevelData.cost) {
                card.style.cursor = 'pointer';
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
        document.documentElement.requestFullscreen().catch(err => console.error(`Erro: ${err.message}`));
    } else {
        document.exitFullscreen();
    }
}

export function setupEventListeners(gameContext) {
    const { setGameState, initGame, isMobile, keys, movementVector } = gameContext;

    document.getElementById('play-button').onclick = initGame;
    document.getElementById('restart-button-pause').onclick = initGame;
    document.getElementById('restart-button-gameover').onclick = initGame;
    document.getElementById('resume-button').onclick = () => setGameState('playing');
    document.getElementById('back-to-menu-button-pause').onclick = () => setGameState('menu');
    document.getElementById('back-to-menu-button-gameover').onclick = () => setGameState('menu');
    document.getElementById('guide-button').onclick = () => setGameState('guide');
    document.getElementById('back-from-guide-button').onclick = () => setGameState('menu');
    document.getElementById('rank-button').onclick = () => { showRank(); setGameState('rank'); };
    document.getElementById('back-from-rank-button').onclick = () => setGameState('menu');
    document.getElementById('upgrades-button').onclick = () => { populateUpgradesMenu(); setGameState('upgrades'); };
    document.getElementById('back-from-upgrades-button').onclick = () => setGameState('menu');
    document.getElementById('pause-button').onclick = () => { if (gameContext.player) setGameState('paused'); };
    document.getElementById('fullscreen-button').onclick = toggleFullscreen;

    if (isMobile) {
        let touchIdentifier = null;
        let joystickBase;

        const handleTouchStart = (e) => {
            if (e.target.closest('.ui-button')) return;
            const gameState = gameContext.gameState;
            if (gameState !== 'playing' || touchIdentifier !== null) return;
            e.preventDefault();
            const touch = e.changedTouches[0];
            touchIdentifier = touch.identifier;

            if (!joystickBase) {
                joystickBase = document.createElement('div');
                joystickBase.className = 'joystick-base';
                const joystickHandle = document.createElement('div');
                joystickHandle.className = 'joystick-handle';
                joystickBase.appendChild(joystickHandle);
                document.body.appendChild(joystickBase);
            }
            
            joystickBase.style.left = `${touch.clientX - 70}px`;
            joystickBase.style.top = `${touch.clientY - 70}px`;
            joystickBase.style.display = 'flex';
            movementVector.startX = touch.clientX;
            movementVector.startY = touch.clientY;
        };

        const handleTouchMove = (e) => {
            const gameState = gameContext.gameState;
            if (gameState !== 'playing' || touchIdentifier === null) return;
            e.preventDefault();
            for (let touch of e.touches) {
                if (touch.identifier === touchIdentifier) {
                    const dx = touch.clientX - movementVector.startX;
                    const dy = touch.clientY - movementVector.startY;
                    const dist = Math.min(Math.hypot(dx, dy), CONFIG.JOYSTICK_RADIUS);
                    const angle = Math.atan2(dy, dx);
                    joystickBase.firstChild.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
                    movementVector.x = dist > CONFIG.JOYSTICK_DEAD_ZONE ? Math.cos(angle) : 0;
                    movementVector.y = dist > CONFIG.JOYSTICK_DEAD_ZONE ? Math.sin(angle) : 0;
                    break;
                }
            }
        };

        const handleTouchEnd = (e) => {
            for (let touch of e.changedTouches) {
                if (touch.identifier === touchIdentifier) {
                    touchIdentifier = null;
                    joystickBase.firstChild.style.transform = 'translate(0,0)';
                    joystickBase.style.display = 'none';
                    movementVector.x = 0;
                    movementVector.y = 0;
                    break;
                }
            }
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: false });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);

        ui.dashButtonMobile.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (gameContext.player) gameContext.player.dash();
        }, { passive: false });

    } else {
        window.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;
            if (e.key === 'Escape') {
                const gameState = gameContext.gameState;
                if (gameState === 'playing') setGameState('paused');
                else if (gameState === 'paused') setGameState('playing');
            }
        });
        window.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });
    }

    window.addEventListener('blur', () => {
        if (gameContext.gameState === 'playing') setGameState('paused');
    });
}