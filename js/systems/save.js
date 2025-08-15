import { PERMANENT_UPGRADES } from "../config.js";

export let playerGems = 0;
export let playerUpgrades = {};
export let playerAchievements = {};

export function loadPermanentData() {
    playerGems = parseInt(localStorage.getItem('playerGems') || '0');
    playerUpgrades = JSON.parse(localStorage.getItem('playerUpgrades') || '{}');
    playerAchievements = JSON.parse(localStorage.getItem('playerAchievements') || '{"unlocked":{},"stats":{"totalKills":0}}');

    for(const key in PERMANENT_UPGRADES) {
        if (playerUpgrades[key] === undefined || playerUpgrades[key] === null) {
            playerUpgrades[key] = 0;
        }
    }
}

export function savePermanentData() {
    localStorage.setItem('playerGems', playerGems);
    localStorage.setItem('playerUpgrades', JSON.stringify(playerUpgrades));
    localStorage.setItem('playerAchievements', JSON.stringify(playerAchievements));
}

export function spendGems(amount) {
    if (playerGems >= amount) {
        playerGems -= amount;
        return true;
    }
    return false;
}

export function addGems(amount) {
    playerGems += amount;
}

export function upgradeSkill(skillKey) {
    if (playerUpgrades[skillKey] < PERMANENT_UPGRADES[skillKey].levels.length) {
        playerUpgrades[skillKey]++;
    }
}

export function saveScore(score) {
    const bestTime = parseInt(localStorage.getItem('bestTime') || '0');
    const totalKills = parseInt(localStorage.getItem('totalKills') || '0');

    if (score.time > bestTime) {
        localStorage.setItem('bestTime', score.time);
    }
    localStorage.setItem('totalKills', totalKills + score.kills);
}
