// This is a complete rewrite of the file to ensure all functions are present
// and to re-introduce the sect mission logic that was removed.

import { gameState, allGameData, combatState, setCombatState } from './state.js';

// --- LÓGICA DE ESTADO E EFEITOS ---

export function logLifeEvent(text) {
    gameState.lifeLog.push(`Idade ${gameState.age}: ${text}`);
}

export function logAction(logData) {
    gameState.actionLog.push({
        age: gameState.age,
        ...logData
    });
}

export function applyEffects(effects) {
    if (!effects) return;
    if (effects.attributes) {
        for (const attr in effects.attributes) {
            const value = effects.attributes[attr];
            gameState.attributes[attr] += value;
            if (attr === 'maxHealth' && value > 0) {
                gameState.attributes.health += value;
            }
        }
    }
    if (effects.resources) {
        for (const res in effects.resources) gameState.resources[res] += effects.resources[res];
    }
    if (effects.cultivation) {
        for (const cult in effects.cultivation) {
             gameState.cultivation[cult] += effects.cultivation[cult]
        };
    }
    if (effects.relationships) {
        for (const person in effects.relationships) {
            const existingRel = gameState.relationships.find(r => r.name === person);
            if (existingRel) existingRel.value += effects.relationships[person];
            else gameState.relationships.push({ name: person, value: effects.relationships[person] });
        }
    }
    if (effects.item) {
        gameState.inventory.push(effects.item);
    }
}

export function handleSpecialEffects(specialKey) {
    let success = false;
    switch (specialKey) {
        case "monk_disciple":
            if (Math.random() > 0.5) {
                gameState.inventory.push("basic_breathing_technique");
                applyEffects({ cultivation: { qi: 5 } });
                success = true;
            } else {
                applyEffects({ attributes: { luck: 1 } });
            }
            break;
        case "explore_cave":
            if (Math.random() > 0.5) {
                gameState.inventory.push("body_refining_pill");
                applyEffects({ attributes: { body: 1, soul: 1 } });
                success = true;
            } else {
                applyEffects({ attributes: { health: -5 } });
            }
            break;
        case "buy_qi_pill":
            if (gameState.resources.money >= 25) {
                applyEffects({ resources: { money: -25 }, cultivation: { qi: 50 } });
                success = true;
            }
            break;
        case "insight_meditation":
            if (gameState.attributes.mind > 15) {
                applyEffects({ attributes: { mind: 3, soul: 1 } });
                success = true;
            } else {
                applyEffects({ attributes: { mind: -1 } });
                success = false;
            }
            break;
        case "meditate_power_spot":
            if (gameState.attributes.mind > 12) {
                applyEffects({ cultivation: { qi: 75 }, attributes: { mind: 1 } });
                success = true;
            } else {
                applyEffects({ attributes: { mind: -1 } });
            }
            break;
        case "duel_lian":
            startCombat('rival_lian_14');
            success = true;
            break;
        case "sect_exam_hidden_cloud":
            if (gameState.attributes.mind >= 12 && gameState.attributes.soul >= 12) {
                gameState.sect.id = "hidden_cloud_sect";
                logLifeEvent("Juntou-se à Seita da Nuvem Oculta.");
                success = true;
            }
            break;
        case "gain_talent_point":
            gameState.talentPoints++;
            success = true;
            break;
        default:
            success = true;
    }
    return success;
}

// --- FUNÇÕES DE COMBATE ---

export function startCombat(enemyId) {
    const enemyData = allGameData.enemies.find(e => e.id === enemyId);
    if (!enemyData) return;
    const newCombatState = {
        enemy: enemyData,
        enemyHealth: enemyData.attributes.health,
        log: [],
        playerIsDefending: false
    };
    setCombatState(newCombatState);
}

export function takeCombatTurn(actionType) {
    if (!combatState) return 'loss';
    combatState.log = [];

    if (actionType === 'attack') {
        combatState.playerIsDefending = false;
        if (Math.random() < combatState.enemy.attributes.dodgeChance) {
            combatState.log.push(`${combatState.enemy.name} se esquiva do seu ataque!`);
        } else {
            let playerDamage = Math.max(1, Math.floor(gameState.attributes.body / 2) - Math.floor(combatState.enemy.attributes.defense / 2));
            if (Math.random() < gameState.attributes.critChance) {
                playerDamage *= 2;
                combatState.log.push("GOLPE CRÍTICO!");
            }
            combatState.enemyHealth -= playerDamage;
            combatState.log.push(`Você ataca e causa ${playerDamage} de dano.`);
        }
    } else if (actionType === 'defend') {
        combatState.playerIsDefending = true;
        combatState.log.push("Você se prepara para defender o próximo ataque.");
    }

    if (combatState.enemyHealth <= 0) return 'win';

    if (Math.random() < gameState.attributes.dodgeChance) {
        combatState.log.push(`Você se esquiva do ataque de ${combatState.enemy.name}!`);
    } else {
        let enemyDamage = Math.max(1, Math.floor(combatState.enemy.attributes.body / 2) - Math.floor(gameState.attributes.defense / 2));
        if (Math.random() < combatState.enemy.attributes.critChance) {
            enemyDamage *= 2;
            combatState.log.push("GOLPE CRÍTICO!");
        }
        if (combatState.playerIsDefending) {
            enemyDamage = Math.floor(enemyDamage / 2);
            combatState.log.push("Sua defesa amortece o golpe!");
            combatState.playerIsDefending = false;
        }
        applyEffects({ attributes: { health: -enemyDamage } });
        combatState.log.push(`${combatState.enemy.name} ataca e causa ${enemyDamage} de dano.`);
    }

    if (gameState.attributes.health <= 0) return 'loss';

    return 'continue';
}

export function endCombat(outcome) {
    const originalEvent = allGameData.events.find(e => e.age === gameState.age && e.choices.some(c => c.effects.special === 'duel_lian'));
    let resultText = '';
    if (outcome === 'win') {
        logLifeEvent(`Derrotou ${combatState.enemy.name} em um duelo.`);
        resultText = allGameData.strings[originalEvent.choices[0].successKey];
    } else {
        resultText = allGameData.strings[originalEvent.choices[0].failureKey];
    }
    setCombatState(null);
    return resultText;
}

// --- FUNÇÕES DE SEITA ---
export function getSect() {
    return allGameData.sects.find(s => s.id === gameState.sect.id);
}

export function attemptPromotion() {
    const sect = getSect();
    if (!sect) return;
    const currentRankIndex = gameState.sect.rankIndex;
    const nextRankIndex = currentRankIndex + 1;
    if (nextRankIndex >= sect.ranks.length) return; // Já está no rank máximo

    const reqs = sect.promotion_requirements[currentRankIndex];
    if (gameState.sect.contribution >= reqs.contribution && gameState.resources.reputation >= reqs.reputation) {
        gameState.sect.contribution -= reqs.contribution;
        gameState.sect.rankIndex++;
        const newRank = sect.ranks[gameState.sect.rankIndex];
        logLifeEvent(`Foi promovido para ${newRank} na seita.`);
        return true;
    }
    return false;
}

export function acceptSectMission() {
    const sect = getSect();
    if (!sect || !sect.missions || sect.missions.length === 0) return null;
    return sect.missions[Math.floor(Math.random() * sect.missions.length)];
}

export function attemptMission(mission) {
    if (!mission) return;
    let missionSuccess = false;
    if (mission.check.attribute) {
        const playerStat = gameState.attributes[mission.check.attribute];
        const successChance = 0.5 + ((playerStat - mission.check.difficulty) * 0.05);
        missionSuccess = Math.random() < successChance;
    } else {
        missionSuccess = true; // Missões sem check são sucesso automático por enquanto
    }

    if (missionSuccess) {
        applyEffects(mission.rewards.success);
    } else {
        applyEffects(mission.rewards.failure);
    }
    return missionSuccess;
}


// --- FUNÇÕES DE TALENTO ---
export function unlockTalent(talentId) {
    const talent = allGameData.talents.find(t => t.id === talentId);
    if (!talent) return;
    if (gameState.unlockedTalents.includes(talentId)) return;

    const canAfford = gameState.talentPoints >= talent.cost;
    const meetsReqs = talent.requirements.every(req => gameState.unlockedTalents.includes(req));

    if (canAfford && meetsReqs) {
        gameState.talentPoints -= talent.cost;
        gameState.unlockedTalents.push(talentId);
        applyEffects(talent.effects);
        logLifeEvent(`Você desbloqueou o talento: ${talent.name}!`);
    }
}
