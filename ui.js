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
    if (frameCount % 6 !== 0) return;

    if (player) {
        document.getElementById('health-bar').style.width = `${(player.health / player.maxHealth) * 100}%`;
        document.getElementById('xp-bar').style.width = `${(player.xp / player.xpToNextLevel) * 100}%`;
    }
    document.getElementById('timer').innerText = formatTime(Math.floor(gameTime));
    
    updateSkillsHUD(player);
}

function updateSkillsHUD(player) {
    if (!player || !player.skills) return;

    for (const skillId in player.skills) {
        const skillState = player.skills[skillId];
        const skillData = SKILL_DATABASE[skillId];

        if (!skillState.hudElement) continue; 

        if (skillData.cooldown > 0 && skillState.timer > 0) {
            skillState.hudElement.classList.add('on-cooldown');
        } else {
            skillState.hudElement.classList.remove('on-cooldown');
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
    for(const skillId in player.skills){
        const skillData = SKILL_DATABASE[skillId];
        if(player.skills[skillId].level < skillData.levels.length) options.push(skillId);
    }
    for(const skillId in SKILL_DATABASE){
        if(!player.skills[skillId] && SKILL_DATABASE[skillId].type !== 'utility' && !options.includes(skillId)) {
            options.push(skillId);
        }
    }
    options.sort(() => 0.5 - Math.random());
    if (options.length > 0 && options.length < 3 && !options.includes('heal')) {
        options.push('heal');
    }
    
    options.slice(0, 3).forEach(skillId => {
        const skill = SKILL_DATABASE[skillId]; 
        const card = document.createElement('div');
        card.className = 'skill-card';
        const currentLevel = player.skills[skillId]?.level || 0;
        let levelText = skill.type !== 'utility' || (skill.levels && skill.levels.length > 1) ? ` (Nível ${currentLevel + 1})` : '';
        let descText = skill.desc || (skill.levels && skill.levels[currentLevel] ? skill.levels[currentLevel].desc : '');

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
}

function showRank() {
    document.getElementById('rank-time').innerText = formatTime(parseInt(localStorage.getItem('bestTime') || '0'));
    document.getElementById('rank-total-kills').innerText = parseInt(localStorage.getItem('totalKills') || '0');
}

function populateUpgradesMenu() {
    const container = document.getElementById('upgrades-options');
    container.innerHTML = '';
    document.getElementById('gem-counter-upgrades').textContent = playerGems;

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
                    spendGems(nextLevelData.cost);
                    upgradeSkill(key);
                    savePermanentData();
                    SoundManager.play('levelUp', ['C5', 'G5']);
                    populateUpgradesMenu();
                    updateGemDisplay();
                };
            } else {
                card.style.opacity = 0.5;
                card.style.cursor = 'not-allowed';
            }
        } else {
            card.innerHTML = `<h3>${upgrade.name} (Nível MÁXIMO)</h3>`;
            card.style.opacity = 0.7;
        }
        container.appendChild(card);
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Erro ao tentar ativar tela cheia: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
}

export function setupEventListeners(gameController) {
    const { setGameState, initGame, getPlayer } = gameController;

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
        updateGemDisplay();
        populateUpgradesMenu();
        setGameState('upgrades');
    };
    document.getElementById('back-from-upgrades-button').onclick = () => setGameState('menu');
    
    document.getElementById('pause-button').onclick = () => setGameState('paused');
    document.getElementById('fullscreen-button').onclick = toggleFullscreen;

    ui.dashButtonMobile.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const player = getPlayer();
        if (player) player.dash();
    });
}