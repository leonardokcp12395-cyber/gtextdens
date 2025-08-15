import { SKILL_DATABASE, PERMANENT_UPGRADES, CONFIG } from '../config.js';
import { playerGems, playerUpgrades, savePermanentData, spendGems, upgradeSkill } from './save.js';
import { SoundManager } from './sound.js';
import { formatTime } from './utils.js';
import { initGame } from '../main.js'; // This will create a circular dependency, I might need to move setGameState to main.js

export const ui = {};

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
        characterSelectScreen: 'character-select-screen',
        achievementsScreen: 'achievements-screen',
        hud: 'hud',
        temporaryMessage: 'temporary-message',
        dashButtonMobile: 'dash-button-mobile'
    };
    for (const key in uiElements) {
        if (document.getElementById(uiElements[key])) {
            ui[key] = document.getElementById(uiElements[key]);
        }
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

function updateSkillsHUD(player) {
    if (!player || !player.skills) return;
    for (const skillId in player.skills) {
        const skillState = player.skills[skillId];
        const skillData = SKILL_DATABASE[skillId];
        const hudElement = document.getElementById(`hud-skill-${skillId}`);
        if (!hudElement) continue;

        if (skillData.cooldown > 0 && skillState.timer > 0) {
            hudElement.classList.add('on-cooldown');
            const cooldownPercent = (skillState.timer / skillData.cooldown);
            hudElement.style.setProperty('--cooldown-percent', `${cooldownPercent * 100}%`);
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
    // ... (logic from Gnomo)
}

export function setupEventListeners(gameContext) {
    // ... (logic from Gnomo)
}
