// This is a complete rewrite of the file to ensure all functions are present
// and to re-introduce the sect mission logic that was removed.

import { gameState, allGameData, combatState, setCombatState, getEffectiveAttributes } from './state.js';

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
            // Aplica efeitos aos atributos base, não aos efetivos
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
        for (const npcId in effects.relationships) {
            if (gameState.relationships[npcId]) {
                gameState.relationships[npcId].initialRelationship += effects.relationships[npcId];
            }
        }
    }
    if (effects.item) {
        if (typeof effects.item === 'string') {
            gameState.inventory.push(effects.item);
        } else if (typeof effects.item === 'object' && effects.item.id && effects.item.quantity) {
            for (let i = 0; i < effects.item.quantity; i++) {
                gameState.inventory.push(effects.item.id);
            }
        }
    }
    if (effects.storyFlags) {
        Object.assign(gameState.storyFlags, effects.storyFlags);
    }
}

export function handleSpecialEffects(specialKey, mission = null) {
    let success = false;
    const effectiveAttributes = getEffectiveAttributes(); // Usa atributos efetivos para checagens
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
                gameState.inventory.push("raiz_de_terra");
                applyEffects({ attributes: { "body": 1 } });
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
            if (effectiveAttributes.mind > 15) {
                applyEffects({ attributes: { mind: 3, soul: 1 } });
                success = true;
            } else {
                applyEffects({ attributes: { mind: -1 } });
                success = false;
            }
            break;
        case "meditate_power_spot":
            if (effectiveAttributes.mind > 12) {
                applyEffects({ cultivation: { qi: 75 }, attributes: { mind: 1 } });
                success = true;
            } else {
                applyEffects({ attributes: { mind: -1 } });
            }
            break;
        case "duel_lian":
            startCombat('rival_lian_14', null, { successKey: 'duel_lian_win', failureKey: 'duel_lian_loss' });
            success = true;
            break;
        case "sect_exam_hidden_cloud":
            if (effectiveAttributes.mind >= 12 && effectiveAttributes.soul >= 12) {
                gameState.sect.id = "hidden_cloud_sect";
                logLifeEvent("Juntou-se à Seita da Nuvem Oculta.");
                success = true;
            }
            break;
        case "gain_talent_point":
            gameState.talentPoints++;
            success = true;
            break;
        case "mission_patrol_forest":
            startCombat('weak_demon_beast', mission ? mission.id : null);
            success = true; // Mission combat outcomes are handled differently in endCombat
            break;
        case "defect_to_scorching_mountain":
            logLifeEvent(`Você foi exilado de sua seita: ${getSect().name}.`);
            gameState.sect.id = "scorching_mountain_sect";
            gameState.sect.rankIndex = 0;
            gameState.sect.contribution = 50;
            if (gameState.relationships.ancião_da_seita) {
                gameState.relationships.ancião_da_seita.initialRelationship = -80;
            }
            if (gameState.relationships.xiao_mei) {
                gameState.relationships.xiao_mei.initialRelationship -= 30;
            }
            if (gameState.relationships.feng_zhi) {
                gameState.relationships.feng_zhi.initialRelationship += 40;
            }
            success = true;
            break;
        case "start_combat_elite_blood":
            startCombat('elite_blood_disciple', null, { successKey: 'warrior_path_1_success', failureKey: 'warrior_path_1_failure' });
            success = true;
            break;
        case "start_combat_elite_commander":
            startCombat('elite_commander', null, { successKey: 'warrior_path_2_success', failureKey: 'warrior_path_2_failure' });
            success = true;
            break;
        case "decipher_codes":
            if (effectiveAttributes.mind > 30) {
                applyEffects({ storyFlags: { "enemySupplyRouteDiscovered": true }, resources: { "reputation": 20 } });
                success = true;
            } else {
                success = false;
            }
            break;
        case "infiltrate_camp":
            const infiltrationChance = 0.4 + (effectiveAttributes.soul * 0.01) + (effectiveAttributes.luck * 0.01);
            if (Math.random() < infiltrationChance) {
                applyEffects({ storyFlags: { "battlePlansStolen": true }, resources: { "reputation": 20 } });
                success = true;
            } else {
                applyEffects({ attributes: { health: -15 } });
                success = false;
            }
            break;
        case "exile_from_sect":
            logLifeEvent(`Você foi exilado de sua seita: ${getSect().name}.`);
            gameState.sect.id = null;
            gameState.sect.rankIndex = 0;
            gameState.sect.contribution = 0;
            applyEffects({ resources: { reputation: -100 } });
            success = true;
            break;
        case "ambush_supply_route":
            const ambushChance = 0.3 + (effectiveAttributes.mind * 0.015) + (effectiveAttributes.luck * 0.01);
            if (Math.random() < ambushChance) {
                applyEffects({ storyFlags: { strategistPathSuccess: true }, resources: { reputation: 30 } });
                success = true;
            } else {
                applyEffects({ resources: { reputation: -10 } });
                success = false;
            }
            break;
        case "doctor_battle_plans":
            const doctorChance = 0.3 + (effectiveAttributes.soul * 0.015) + (effectiveAttributes.luck * 0.01);
            if (Math.random() < doctorChance) {
                applyEffects({ storyFlags: { spyPathSuccess: true }, resources: { reputation: 30 } });
                success = true;
            } else {
                applyEffects({ resources: { reputation: -15 } });
                success = false;
            }
            break;
        case "resolve_sect_war":
            let warScore = 0;
            if (gameState.storyFlags.warriorPath1Success) warScore++;
            if (gameState.storyFlags.warriorPath2Success) warScore++;
            if (gameState.storyFlags.strategistPathSuccess) warScore++;
            if (gameState.storyFlags.spyPathSuccess) warScore++;

            let outcome = "stalemate";
            if (warScore === 0) {
                outcome = "defeat";
            } else if (warScore >= 2) {
                outcome = "victory";
            }

            applyEffects({ storyFlags: { warOutcome: outcome } });
            success = true;
            break;
        default:
            success = true;
    }
    return success;
}

export function giveGiftToNpc(npcId, itemId, itemIndex) {
    const npc = gameState.relationships[npcId];
    if (!npc) return { success: false, message: "NPC não encontrado." };
    gameState.inventory.splice(itemIndex, 1);
    applyEffects({ relationships: { [npcId]: 5 } });
    return { success: true, message: `${npc.name} aceita seu presente com um aceno de cabeça.` };
}

export function sparWithNpc(npcId) {
    const npc = gameState.relationships[npcId];
    if (!npc) return { success: false, message: "NPC não encontrado." };
    let challengeDifficulty = 10;
    if (npc.mood === 'Hostil' || npc.mood === 'Competitivo') {
        challengeDifficulty += 5;
    }
    if (npc.initialRelationship < 0) {
        challengeDifficulty += Math.abs(Math.floor(npc.initialRelationship / 10));
    }
    const successChance = 0.6 + ((getEffectiveAttributes().body - challengeDifficulty) * 0.02);
    if (Math.random() < successChance) {
        applyEffects({ attributes: { body: 1 }, relationships: { [npcId]: 3 } });
        return { success: true, message: `Você teve uma sessão de treino produtiva com ${npc.name}. Ambos se sentem mais fortes.` };
    } else {
        applyEffects({ relationships: { [npcId]: -5 } });
        return { success: false, message: `O treino com ${npc.name} foi desastroso. Vocês não conseguiram se entender.` };
    }
}

function addAlchemyXp(amount) {
    const skills = gameState.skills;
    skills.alchemyXp += amount;
    if (skills.alchemyXp >= skills.alchemyXpToNextLevel) {
        skills.alchemy++;
        skills.alchemyXp -= skills.alchemyXpToNextLevel;
        skills.alchemyXpToNextLevel = Math.floor(skills.alchemyXpToNextLevel * 1.5);
    }
}

export function craftItem(recipeId) {
    const recipe = allGameData.recipes.find(r => r.id === recipeId);
    if (!recipe) return { success: false, message: "Receita não encontrada." };
    if (gameState.skills.alchemy < recipe.skillRequired) {
        return { success: false, message: "Seu nível de alquimia é muito baixo." };
    }
    const playerIngredients = gameState.inventory.reduce((acc, itemId) => {
        acc[itemId] = (acc[itemId] || 0) + 1;
        return acc;
    }, {});
    for (const required of recipe.ingredients) {
        if (!playerIngredients[required.id] || playerIngredients[required.id] < required.quantity) {
            return { success: false, message: `Faltam ingredientes. Você precisa de ${required.quantity}x ${allGameData.ingredients.find(i => i.id === required.id).name}.` };
        }
    }
    recipe.ingredients.forEach(required => {
        for (let i = 0; i < required.quantity; i++) {
            const indexToRemove = gameState.inventory.findIndex(itemId => itemId === required.id);
            gameState.inventory.splice(indexToRemove, 1);
        }
    });
    const successChance = 0.5 + (gameState.skills.alchemy * 0.02) + (getEffectiveAttributes().mind * 0.01);
    if (Math.random() < successChance) {
        gameState.inventory.push(recipe.result);
        addAlchemyXp(5);
        const resultItem = allGameData.items.find(i => i.id === recipe.result);
        return { success: true, message: `Sucesso! Você criou ${resultItem.name}.` };
    } else {
        addAlchemyXp(1);
        return { success: false, message: "A criação falhou! Os ingredientes foram perdidos, mas você aprendeu algo com o erro." };
    }
}

function addForgingXp(amount) {
    const skills = gameState.skills;
    skills.forgingXp += amount;
    if (skills.forgingXp >= skills.forgingXpToNextLevel) {
        skills.forging++;
        skills.forgingXp -= skills.forgingXpToNextLevel;
        skills.forgingXpToNextLevel = Math.floor(skills.forgingXpToNextLevel * 1.5);
    }
}

export function forgeItem(recipeId) {
    const recipe = allGameData.forging_recipes.find(r => r.id === recipeId);
    if (!recipe) return { success: false, message: "Receita não encontrada." };

    if (gameState.skills.forging < recipe.skillRequired) {
        return { success: false, message: "Seu nível de forja é muito baixo." };
    }

    const playerIngredients = gameState.inventory.reduce((acc, itemId) => {
        acc[itemId] = (acc[itemId] || 0) + 1;
        return acc;
    }, {});

    const allForgingIngredients = allGameData.forging_ingredients || [];
    for (const required of recipe.ingredients) {
        if (!playerIngredients[required.id] || playerIngredients[required.id] < required.quantity) {
            const ingredientName = allForgingIngredients.find(i => i.id === required.id)?.name || required.id;
            return { success: false, message: `Faltam ingredientes. Você precisa de ${required.quantity}x ${ingredientName}.` };
        }
    }

    recipe.ingredients.forEach(required => {
        for (let i = 0; i < required.quantity; i++) {
            const indexToRemove = gameState.inventory.findIndex(itemId => itemId === required.id);
            gameState.inventory.splice(indexToRemove, 1);
        }
    });

    const successChance = 0.5 + (gameState.skills.forging * 0.02) + (getEffectiveAttributes().body * 0.01);
    if (Math.random() < successChance) {
        gameState.inventory.push(recipe.result);
        addForgingXp(5);
        const resultItem = allGameData.equipment.find(i => i.id === recipe.result);
        return { success: true, message: `Sucesso! Você forjou ${resultItem.name}.` };
    } else {
        addForgingXp(1);
        return { success: false, message: "A forja falhou! Os materiais foram perdidos." };
    }
}

export function sellItem(itemId, itemIndex) {
    const allItems = [...(allGameData.items || []), ...(allGameData.ingredients || []), ...(allGameData.forging_ingredients || []), ...(allGameData.sects.flatMap(s => s.store) || [])];
    const itemData = allItems.find(i => i.id === itemId);
    if (!itemData || !itemData.value) {
        return { success: false, message: "Este item não pode ser vendido." };
    }
    applyEffects({ resources: { money: itemData.value } });
    gameState.inventory.splice(itemIndex, 1);
    return { success: true, message: `Você vendeu ${itemData.name} por ${itemData.value} moedas.` };
}

export function buyMarketItem(itemId) {
    const allItems = [...(allGameData.items || []), ...(allGameData.ingredients || [])];
    const itemData = allItems.find(i => i.id === itemId);
    if (!itemData || !itemData.cost) {
        return { success: false, message: "Este item não está à venda." };
    }
    if (gameState.resources.money < itemData.cost) {
        return { success: false, message: "Você não tem moedas suficientes." };
    }
    applyEffects({ resources: { money: -itemData.cost } });
    gameState.inventory.push(itemId);
    return { success: true, message: `Você comprou ${itemData.name} por ${itemData.cost} moedas.` };
}

export function listenForRumors() {
    const availableRumors = allGameData.rumors.filter(r => !gameState.heardRumors.includes(r.id));
    if (availableRumors.length === 0) {
        return { success: false, message: "Você já ouviu todos os boatos por enquanto." };
    }
    const rumor = availableRumors[Math.floor(Math.random() * availableRumors.length)];
    gameState.heardRumors.push(rumor.id);
    if (rumor.effects) {
        applyEffects(rumor.effects);
    }
    return { success: true, message: rumor.text };
}

// --- FUNÇÕES DE TÉCNICA ---

export function equipTechnique(itemId) {
    if (gameState.equippedTechniques.length >= gameState.techniqueSlots) {
        return;
    }
    if (!gameState.equippedTechniques.includes(itemId)) {
        gameState.equippedTechniques.push(itemId);
    }
}

export function unequipTechnique(itemId) {
    const index = gameState.equippedTechniques.indexOf(itemId);
    if (index > -1) {
        gameState.equippedTechniques.splice(index, 1);
    }
}

// --- FUNÇÕES DE EQUIPAMENTO ---

export function equipItem(itemId) {
    const allItems = [...(allGameData.items || []), ...(allGameData.equipment || [])];
    const itemData = allItems.find(i => i.id === itemId);
    if (!itemData || !itemData.equipmentType) return;

    const slot = itemData.equipmentType;

    const itemIndex = gameState.inventory.indexOf(itemId);
    if (itemIndex === -1) return;

    if (gameState.equipment[slot]) {
        const currentItemId = gameState.equipment[slot];
        gameState.inventory.push(currentItemId);
    }

    gameState.inventory.splice(itemIndex, 1);
    gameState.equipment[slot] = itemId;
}

export function unequipItem(slot) {
    const itemId = gameState.equipment[slot];
    if (itemId) {
        gameState.equipment[slot] = null;
        gameState.inventory.push(itemId);
    }
}

// --- FUNÇÕES DE COMBATE ---

export function startCombat(enemyId, missionId = null, keys = {}) {
    const enemyData = allGameData.enemies.find(e => e.id === enemyId);
    if (!enemyData) return;
    const newCombatState = {
        enemy: enemyData,
        enemyHealth: enemyData.attributes.health,
        log: [],
        playerBuffs: [],
        enemyBuffs: [],
        playerIsDefending: false,
        missionId: missionId,
        successKey: keys.successKey,
        failureKey: keys.failureKey
    };
    setCombatState(newCombatState);
}

function applyBuffs(baseAttributes, buffs) {
    const modifiedAttributes = { ...baseAttributes };
    buffs.forEach(buff => {
        if (modifiedAttributes[buff.stat] !== undefined) {
            modifiedAttributes[buff.stat] += buff.value;
        }
    });
    return modifiedAttributes;
}

function updateBuffs(buffs, log) {
    const activeBuffs = [];
    buffs.forEach(buff => {
        buff.duration--;
        if (buff.duration > 0) {
            activeBuffs.push(buff);
        } else {
            log.push(`O efeito de ${buff.name} desapareceu.`);
        }
    });
    return activeBuffs;
}

export function takeCombatTurn(action) {
    if (!combatState) return 'loss';
    combatState.log = [];

    combatState.playerBuffs = updateBuffs(combatState.playerBuffs, combatState.log);
    const playerBaseAttributes = getEffectiveAttributes();
    const playerAttributes = applyBuffs(playerBaseAttributes, combatState.playerBuffs);

    let enemyTurnSkipped = false;

    if (typeof action === 'object' && action.type === 'technique') {
        const allItems = [...(allGameData.items || []), ...(allGameData.sects.flatMap(s => s.store) || [])];
        const techData = allItems.find(i => i.id === action.id);
        const effect = techData.activeEffect;

        if (effect.energyCost && playerAttributes.energy < effect.energyCost) {
            combatState.log.push("Você não tem energia suficiente para usar esta técnica!");
            enemyTurnSkipped = true;
        } else {
            if(effect.energyCost) applyEffects({ attributes: { energy: -effect.energyCost } });
            if(effect.healthCost) applyEffects({ attributes: { health: -effect.healthCost } });

            combatState.log.push(`Você usa ${techData.name}!`);

            if (effect.type === 'combat_damage') {
                let damage = effect.baseValue + Math.floor(playerAttributes[effect.scalingStat] * effect.scalingFactor);
                combatState.enemyHealth -= damage;
                combatState.log.push(`A técnica causa ${damage} de dano de ${effect.damageType}.`);
            } else if (effect.type === 'combat_buff') {
                combatState.playerBuffs.push({ name: techData.name, ...effect });
                combatState.log.push(`Você se sente mais forte! (+${effect.value} ${effect.stat} por ${effect.duration} turnos)`);
            }
        }
    } else if (action === 'attack') {
        combatState.playerIsDefending = false;
        if (Math.random() < combatState.enemy.attributes.dodgeChance) {
            combatState.log.push(`${combatState.enemy.name} se esquiva do seu ataque!`);
        } else {
            let playerDamage = Math.max(1, Math.floor(playerAttributes.body / 2) - Math.floor(combatState.enemy.attributes.defense / 2));
            if (Math.random() < playerAttributes.critChance) {
                playerDamage *= 2;
                combatState.log.push("GOLPE CRÍTICO!");
            }
            combatState.enemyHealth -= playerDamage;
            combatState.log.push(`Você ataca e causa ${playerDamage} de dano.`);
        }
    } else if (action === 'defend') {
        combatState.playerIsDefending = true;
        combatState.log.push("Você se prepara para defender o próximo ataque.");
    }

    if (combatState.enemyHealth <= 0) return 'win';

    if (!enemyTurnSkipped) {
        combatState.enemyBuffs = updateBuffs(combatState.enemyBuffs, combatState.log);
        const enemyAttributes = applyBuffs({attributes: combatState.enemy.attributes}, combatState.enemyBuffs);

        let enemyUsedAbility = false;
        if (combatState.enemy.abilities) {
            for (const ability of combatState.enemy.abilities) {
                if (Math.random() < ability.chance) {
                    combatState.log.push(`${combatState.enemy.name} usa ${ability.name}!`);
                    if (ability.id === 'blood_siphon') {
                        let damage = Math.floor(enemyAttributes.body / 2);
                        applyEffects({ attributes: { health: -damage } });
                        combatState.enemyHealth += Math.floor(damage / 2);
                        combatState.log.push(`Você sofre ${damage} de dano e o inimigo se cura.`);
                    } else if (ability.id === 'rallying_cry') {
                        const buff = ability.effect;
                        combatState.enemyBuffs.push({ name: ability.name, ...buff });
                        combatState.log.push(`${combatState.enemy.name} parece mais forte!`);
                    } else if (ability.id === 'heavenly_smite') {
                        let damage = ability.effect.baseDamage;
                        applyEffects({ attributes: { health: -damage } });
                        combatState.log.push(`O raio celestial causa ${damage} de dano direto a você!`);
                    }
                    enemyUsedAbility = true;
                    break;
                }
            }
        }

        if (!enemyUsedAbility) {
            if (Math.random() < playerAttributes.dodgeChance) {
                combatState.log.push(`Você se esquiva do ataque de ${combatState.enemy.name}!`);
            } else {
                let enemyDamage = Math.max(1, Math.floor(enemyAttributes.body / 2) - Math.floor(playerAttributes.defense / 2));
                if (Math.random() < enemyAttributes.critChance) {
                    enemyDamage *= 2;
                    combatState.log.push("GOLPE CRÍTICO INIMIGO!");
                }
                if (combatState.playerIsDefending) {
                    enemyDamage = Math.floor(enemyDamage / 2);
                    combatState.log.push("Sua defesa amortece o golpe!");
                    combatState.playerIsDefending = false;
                }
                applyEffects({ attributes: { health: -enemyDamage } });
                combatState.log.push(`${combatState.enemy.name} ataca e causa ${enemyDamage} de dano.`);
            }
        }
    }

    if (gameState.attributes.health <= 0) return 'loss';

    return 'continue';
}

export function endCombat(outcome) {
    let resultText = '';
    const { missionId, successKey, failureKey } = combatState;
    if (missionId) {
        const sect = getSect();
        const mission = sect.missions.find(m => m.id === missionId);
        if (mission) {
            if (outcome === 'win') {
                applyEffects(mission.rewards.success);
                resultText = `Você completou a missão '${mission.name}' com sucesso!`;
            } else {
                applyEffects(mission.rewards.failure);
                resultText = `Você falhou na missão '${mission.name}'.`;
            }
        }
    } else if (successKey && failureKey) {
        if (outcome === 'win') {
            logLifeEvent(`Derrotou ${combatState.enemy.name} em um duelo crucial.`);
            if (combatState.enemy.id === 'elite_blood_disciple') {
                applyEffects({ storyFlags: { warriorPath1Success: true } });
            }
             if (combatState.enemy.id === 'elite_commander') {
                applyEffects({ storyFlags: { warriorPath2Success: true } });
            }
            resultText = allGameData.strings[successKey] || "Vitória!";
        } else {
            resultText = allGameData.strings[failureKey] || "Derrota...";
        }
    } else if (successKey === 'tribulation_success') {
        if (outcome === 'win') {
            const nextRealm = cultivationRealms[gameState.cultivation.realmIndex + 1];
            logLifeEvent(`SOBREVIVEU! Você superou a tribulação e avançou para o reino ${nextRealm.name}!`);

            // Recompensa por sobreviver à tribulação
            applyEffects({
                cultivation: { realmIndex: 1, subRealmIndex: 0, qi: -gameState.cultivation.qi },
                attributes: { maxHealth: 20, body: 2, mind: 2, soul: 2 }
            });

            resultText = allGameData.strings[successKey];
        } else {
            logLifeEvent("Você falhou em superar a tribulação. Seu cultivo foi severamente danificado.");
            applyEffects({
                attributes: { maxHealth: -10 },
                cultivation: { qi: -Math.floor(gameState.cultivation.qi / 2) }
            });
            resultText = allGameData.strings[failureKey];
        }
    } else {
        resultText = (outcome === 'win') ? `Você derrotou ${combatState.enemy.name}!` : `Você foi derrotado por ${combatState.enemy.name}.`;
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
    if (nextRankIndex >= sect.ranks.length) return;
    const reqs = sect.promotion_requirements[currentRankIndex];
    if (gameState.contribution >= reqs.contribution && gameState.resources.reputation >= reqs.reputation) {
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
    return sect.missions.find(m => m.id === 'mission_patrol_forest');
}

export function attemptMission(mission) {
    if (!mission) return;
    let missionSuccess = false;
    if (mission.check.attribute) {
        const playerStat = getEffectiveAttributes()[mission.check.attribute];
        const successChance = 0.5 + ((playerStat - mission.check.difficulty) * 0.05);
        missionSuccess = Math.random() < successChance;
    } else {
        missionSuccess = true;
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
