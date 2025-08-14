// js/systems/save.js

import { PERMANENT_UPGRADES } from '../config.js';

export let playerGems = 0;
export let playerUpgrades = {};

export function loadPermanentData() {
    playerGems = parseInt(localStorage.getItem('playerGems') || '0');
    try {
        const savedUpgrades = JSON.parse(localStorage.getItem('playerUpgrades'));
        if (savedUpgrades && typeof savedUpgrades === 'object') {
            playerUpgrades = savedUpgrades;
        } else {
            playerUpgrades = {};
        }
    } catch (e) {
        playerUpgrades = {};
    }
    
    for(const key in PERMANENT_UPGRADES) {
        if (playerUpgrades[key] === undefined || playerUpgrades[key] === null) {
            playerUpgrades[key] = 0;
        }
    }
}

export function savePermanentData() {
    localStorage.setItem('playerGems', playerGems);
    localStorage.setItem('playerUpgrades', JSON.stringify(playerUpgrades));
}

// Função para salvar a pontuação da partida
export function saveScore(score) {
    const currentTimeInSeconds = Math.floor(score.time);
    const bestTime = parseInt(localStorage.getItem('bestTime') || '0');
    const totalKills = parseInt(localStorage.getItem('totalKills') || '0');

    if (currentTimeInSeconds > bestTime) {
        localStorage.setItem('bestTime', currentTimeInSeconds);
    }
    localStorage.setItem('totalKills', totalKills + score.kills);
}


export function addGems(amount) {
    playerGems += amount;
}

export function spendGems(amount) {
    if (playerGems >= amount) {
        playerGems -= amount;
        return true;
    }
    return false;
}

export function upgradeSkill(skillKey) {
    if (playerUpgrades[skillKey] !== undefined) {
        const upgradeData = PERMANENT_UPGRADES[skillKey];
        if (upgradeData && playerUpgrades[skillKey] < upgradeData.levels.length) {
             playerUpgrades[skillKey]++;
        }
    }
}
