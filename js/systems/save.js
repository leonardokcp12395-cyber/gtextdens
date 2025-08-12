// js/systems/save.js

import { PERMANENT_UPGRADES } from '../config.js';

export let playerGems = 0;
export let playerUpgrades = {};

export function loadPermanentData() {
    playerGems = parseInt(localStorage.getItem('playerGems') || '0');
    playerUpgrades = JSON.parse(localStorage.getItem('playerUpgrades') || '{}');
    
    // Inicializa o objeto de upgrades se ele não existir no save
    for(const key in PERMANENT_UPGRADES) {
        if (playerUpgrades[key] === undefined || playerUpgrades[key] === null) {
            playerUpgrades[key] = 0; // Nível 0
        }
    }
}

export function savePermanentData() {
    localStorage.setItem('playerGems', playerGems);
    localStorage.setItem('playerUpgrades', JSON.stringify(playerUpgrades));
}

// Funções para modificar os valores (melhor do que acessá-los globalmente)
export function addGems(amount) {
    playerGems += amount;
}

export function spendGems(amount) {
    playerGems -= amount;
}

export function upgradeSkill(skillKey) {
    if (playerUpgrades[skillKey] !== undefined) {
        playerUpgrades[skillKey]++;
    }
}