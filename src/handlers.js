import { gameState, allGameData, combatState, setCombatState } from './state.js';
import { elements, flashStat, updateUI, showDeathScreen } from './ui.js';

// --- LÓGICA DE ESTADO E EFEITOS ---

export function logLifeEvent(text) {
    gameState.lifeLog.push(`Idade ${gameState.age}: ${text}`);
}

export function applyEffects(effects) {
    if (!effects) return;
    if (effects.attributes) {
        for (const attr in effects.attributes) {
            const value = effects.attributes[attr];
            gameState.attributes[attr] += value;
            const elementMap = {
                health: elements.attrHealth, maxHealth: elements.attrMaxHealth,
                body: elements.attrBody, mind: elements.attrMind,
                soul: elements.attrSoul, luck: elements.attrLuck,
                qi: elements.cultQi
            };
            if (elementMap[attr]) {
                flashStat(elementMap[attr], value > 0 ? 'increase' : 'decrease');
            }
        }
    }
    if (effects.resources) {
        for (const res in effects.resources) gameState.resources[res] += effects.resources[res];
    }
    if (effects.cultivation) {
        for (const cult in effects.cultivation) {
             gameState.cultivation[cult] += effects.cultivation[cult]
             flashStat(elements.cultQi, 'increase');
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
        default:
            success = true;
    }
    return success;
}

// --- FUNÇÕES DE COMBATE ---

function startCombat(enemyId) {
    const enemyData = allGameData.enemies.find(e => e.id === enemyId);
    if (!enemyData) return;
    const newCombatState = {
        enemy: enemyData,
        enemyHealth: enemyData.attributes.health,
        log: [],
        playerIsDefending: false
    };
    setCombatState(newCombatState);
    showCombatUI();
}

function showCombatUI() {
    if (!combatState) return;
    const combatLog = combatState.log.map(entry => `<p>${entry}</p>`).join('');
    const combatHTML = `
        <h2>Combate!</h2>
        <p><strong>${combatState.enemy.name}</strong> - Saúde: ${combatState.enemyHealth}</p>
        <p><strong>Você</strong> - Saúde: ${gameState.attributes.health}</p>
        <hr><div class="combat-log">${combatLog}</div>`;
    elements.eventContent.innerHTML = combatHTML;
    elements.choicesContainer.innerHTML = '';

    const attackButton = document.createElement('button');
    attackButton.textContent = "Ataque Físico";
    attackButton.onclick = () => takeCombatTurn('attack');
    elements.choicesContainer.appendChild(attackButton);

    const defendButton = document.createElement('button');
    defendButton.textContent = "Defender";
    defendButton.onclick = () => takeCombatTurn('defend');
    elements.choicesContainer.appendChild(defendButton);

    elements.nextYearBtn.style.display = 'none';
    elements.sectActionsBtn.style.display = 'none';
}

function takeCombatTurn(actionType) {
    if (!combatState) return;
    combatState.log = [];

    // --- Ação do Jogador ---
    if (actionType === 'attack') {
        combatState.playerIsDefending = false; // Atacar remove o estado de defesa
        // Chance de Esquiva do Inimigo
        if (Math.random() < combatState.enemy.attributes.dodgeChance) {
            combatState.log.push(`${combatState.enemy.name} se esquiva do seu ataque!`);
        } else {
            // Cálculo de Dano do Jogador
            let playerDamage = Math.max(1, Math.floor(gameState.attributes.body / 2) - Math.floor(combatState.enemy.attributes.defense / 2));
            // Chance de Crítico do Jogador
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

    // Checa se o inimigo foi derrotado
    if (combatState.enemyHealth <= 0) {
        endCombat('win');
        return;
    }

    // --- Ação do Inimigo ---
    // Chance de Esquiva do Jogador
    if (Math.random() < gameState.attributes.dodgeChance) {
        combatState.log.push(`Você se esquiva do ataque de ${combatState.enemy.name}!`);
    } else {
        // Cálculo de Dano do Inimigo
        let enemyDamage = Math.max(1, Math.floor(combatState.enemy.attributes.body / 2) - Math.floor(gameState.attributes.defense / 2));
        // Chance de Crítico do Inimigo
        if (Math.random() < combatState.enemy.attributes.critChance) {
            enemyDamage *= 2;
            combatState.log.push("GOLPE CRÍTICO!");
        }
        // Aplica o estado de defesa
        if (combatState.playerIsDefending) {
            enemyDamage = Math.floor(enemyDamage / 2);
            combatState.log.push("Sua defesa amortece o golpe!");
            combatState.playerIsDefending = false;
        }
        applyEffects({ attributes: { health: -enemyDamage } });
        combatState.log.push(`${combatState.enemy.name} ataca e causa ${enemyDamage} de dano.`);
    }

    // Checa se o jogador foi derrotado
    if (gameState.attributes.health <= 0) {
        endCombat('loss');
        return;
    }

    // Atualiza a UI para o próximo turno
    showCombatUI();
    updateUI();
}

function endCombat(outcome) {
    const originalEvent = allGameData.events.find(e => e.age === gameState.age && e.choices.some(c => c.effects.special === 'duel_lian'));
    let resultText = '';
    if (outcome === 'win') {
        logLifeEvent(`Derrotou ${combatState.enemy.name} em um duelo.`);
        resultText = allGameData.strings[originalEvent.choices[0].successKey];
    } else {
        resultText = allGameData.strings[originalEvent.choices[0].failureKey];
    }
    elements.eventContent.innerHTML = `<p>${resultText}</p>`;
    elements.choicesContainer.innerHTML = '';
    setCombatState(null);
    if (gameState.attributes.health <= 0) {
        showDeathScreen();
    } else {
        elements.nextYearBtn.style.display = 'block';
        if (gameState.sect.id) elements.sectActionsBtn.style.display = 'block';
        updateUI();
    }
}

// --- FUNÇÕES DE SEITA ---

export function showSectStore() {
    const sectData = allGameData.sects.find(s => s.id === gameState.sect.id);
    if (!sectData) return;
    elements.eventContent.innerHTML = `<p>Você entra no pavilhão de tesouros da ${sectData.name}.</p>`;
    elements.choicesContainer.innerHTML = '';
    sectData.store.forEach(item => {
        const itemButton = document.createElement('button');
        itemButton.textContent = `Comprar ${item.name} (${item.cost} contribuição)`;
        itemButton.onclick = () => {
            if (gameState.sect.contribution >= item.cost) {
                gameState.sect.contribution -= item.cost;
                applyEffects(item.effects);
                if (item.type === 'pill' || item.type === 'technique') gameState.inventory.push(item.id);
                elements.eventContent.innerHTML = `<p>Você adquiriu ${item.name}!</p>`;
                showSectStore();
            } else {
                elements.eventContent.innerHTML = "<p>Você não tem pontos de contribuição suficientes.</p>";
            }
            updateUI();
        };
        elements.choicesContainer.appendChild(itemButton);
    });
    const leaveStoreButton = document.createElement('button');
    leaveStoreButton.textContent = "Sair da Loja";
    leaveStoreButton.onclick = showSectActions;
    elements.choicesContainer.appendChild(leaveStoreButton);
}

export function showSectActions() {
    elements.eventContent.innerHTML = "<p>Você está no pátio principal da sua seita. O que gostaria de fazer?</p>";
    elements.choicesContainer.innerHTML = '';
    const missionButton = document.createElement('button');
    missionButton.textContent = "Aceitar uma Missão da Seita";
    missionButton.onclick = acceptSectMission;
    elements.choicesContainer.appendChild(missionButton);
    const storeButton = document.createElement('button');
    storeButton.textContent = "Visitar a Loja da Seita";
    storeButton.onclick = showSectStore;
    elements.choicesContainer.appendChild(storeButton);
    const sectData = allGameData.sects.find(s => s.id === gameState.sect.id);
    const currentRankIndex = gameState.sect.rankIndex;
    const nextRankIndex = currentRankIndex + 1;
    if (nextRankIndex < sectData.ranks.length) {
        const promotionButton = document.createElement('button');
        const neededContribution = sectData.contribution_needed[currentRankIndex];
        promotionButton.textContent = `Tentar Promoção para ${sectData.ranks[nextRankIndex]} (${neededContribution} contribuição)`;
        if (gameState.sect.contribution >= neededContribution) {
            promotionButton.onclick = () => {
                gameState.sect.contribution -= neededContribution;
                gameState.sect.rankIndex++;
                const newRank = sectData.ranks[gameState.sect.rankIndex];
                logLifeEvent(`Foi promovido para ${newRank} na seita.`);
                elements.eventContent.innerHTML = `<p>Parabéns! Você foi promovido para ${newRank}!</p>`;
                updateUI();
            };
        } else {
            promotionButton.disabled = true;
        }
        elements.choicesContainer.appendChild(promotionButton);
    }
    const leaveButton = document.createElement('button');
    leaveButton.textContent = "Voltar às suas atividades";
    leaveButton.onclick = () => {
        elements.eventContent.innerHTML = "Você volta para seus afazeres, pronto para o próximo ano.";
        elements.choicesContainer.innerHTML = '';
        elements.nextYearBtn.style.display = 'block';
        elements.sectActionsBtn.style.display = 'block';
    };
    elements.choicesContainer.appendChild(leaveButton);
    elements.nextYearBtn.style.display = 'none';
    elements.sectActionsBtn.style.display = 'none';
}

export function acceptSectMission() {
    const sectData = allGameData.sects.find(s => s.id === gameState.sect.id);
    if (!sectData || !sectData.missions || sectData.missions.length === 0) {
        elements.eventContent.innerHTML = "<p>Não há missões disponíveis no momento.</p>";
        return;
    }
    const mission = sectData.missions[Math.floor(Math.random() * sectData.missions.length)];
    elements.eventContent.innerHTML = `<p><strong>Nova Missão: ${mission.name}</strong></p><p>${mission.description}</p>`;
    elements.choicesContainer.innerHTML = '';
    const attemptButton = document.createElement('button');
    attemptButton.textContent = "Tentar a Missão";
    attemptButton.onclick = () => {
        let missionSuccess = false;
        let outcomeText = '';
        if (mission.check.special) {
            missionSuccess = handleSpecialEffects(mission.check.special, mission);
            if (!gameState.combat) {
                outcomeText = missionSuccess ? `Sucesso na missão '${mission.name}'!` : `Falha na missão '${mission.name}'.`;
                if(missionSuccess) applyEffects(mission.rewards.success);
                else applyEffects(mission.rewards.failure);
                elements.eventContent.innerHTML = `<p>${outcomeText}</p>`;
                if (gameState.attributes.health <= 0) showDeathScreen();
                else updateUI();
            }
        } else {
            const playerStat = gameState.attributes[mission.check.attribute];
            const successChance = 0.5 + ((playerStat - mission.check.difficulty) * 0.05);
            missionSuccess = Math.random() < successChance;
            if (missionSuccess) {
                applyEffects(mission.rewards.success);
                outcomeText = `Sucesso! Você completou a missão '${mission.name}'.`;
            } else {
                applyEffects(mission.rewards.failure);
                outcomeText = `Falha! Você não conseguiu completar a missão '${mission.name}'.`;
            }
            elements.eventContent.innerHTML = `<p>${outcomeText}</p>`;
            if (gameState.attributes.health <= 0) showDeathScreen();
            else updateUI();
        }
        elements.choicesContainer.innerHTML = '';
    };
    elements.choicesContainer.appendChild(attemptButton);
    const refuseButton = document.createElement('button');
    refuseButton.textContent = "Recusar Missão";
    refuseButton.onclick = showSectActions;
    elements.choicesContainer.appendChild(refuseButton);
}
