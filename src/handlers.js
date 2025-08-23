// This is a complete rewrite of the file to ensure all functions are present
// and to re-introduce the sect mission logic that was removed.

import { gameState, allGameData, combatState, setCombatState, getEffectiveAttributes } from './state.js';
import { generateProceduralNpc } from './game.js';

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
        for (const res in effects.resources) {
            if (res === 'reputation' && typeof effects.resources.reputation === 'object') {
                for (const faction in effects.resources.reputation) {
                    if (gameState.resources.reputation[faction] !== undefined) {
                        gameState.resources.reputation[faction] += effects.resources.reputation[faction];
                    }
                }
            } else {
                gameState.resources[res] += effects.resources[res];
            }
        }
    }
    if (effects.cultivation) {
        for (const cult in effects.cultivation) {
             gameState.cultivation[cult] += effects.cultivation[cult]
        };
    }
    if (effects.sect) {
        for (const sectAttr in effects.sect) {
            gameState.sect[sectAttr] += effects.sect[sectAttr];
        }
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
        for (const flag in effects.storyFlags) {
            if (flag.includes('.')) {
                const parts = flag.split('.');
                gameState[parts[0]][parts[1]] = effects.storyFlags[flag];
            } else {
                gameState.storyFlags[flag] = effects.storyFlags[flag];
            }
        }
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
        case "gain_talent_point":
            gameState.resources.talentPoints++;
            success = true;
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
                const rival = generateProceduralNpc();
                rival.name = `Discípulo Rival ${rival.name.split(' ')[0]}`;
                rival.isRival = true;
                rival.initialRelationship = -10;
                gameState.relationships[rival.id] = rival;
                gameState.storyFlags.rivalId = rival.id;
                logLifeEvent(`Você sente o olhar competitivo de ${rival.name} em você.`);
                success = true;
            }
            break;
        case "start_rival_duel":
            const rivalId = gameState.storyFlags.rivalId;
            if (rivalId && gameState.relationships[rivalId]) {
                const rivalData = gameState.relationships[rivalId];
                // We can pass the rival's data object directly to startCombat now
                startCombat(rivalData, null, { successKey: 'rival_duel_win', failureKey: 'rival_duel_loss' });
                success = true;
            } else {
                success = false;
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
        case "start_combat_golem_guardian":
            startCombat('stone_golem_guardian', null, { successKey: 'quest_wb_frag1_success', failureKey: 'quest_wb_frag1_failure' });
            success = true;
            break;
        case "intimidate_merchant_wb":
            if (getEffectiveAttributes().body > 20) {
                applyEffects({ item: 'fragmento_lamina_2', storyFlags: { "whispering_blade_ready_to_forge": true } });
                success = true;
            } else {
                applyEffects({ resources: { reputation: -10 } });
                success = false;
            }
            break;
        case "join_golden_pavilion":
            gameState.sect.id = "golden_pavilion_sect";
            logLifeEvent("Você se juntou ao Pavilhão Dourado.");
            applyEffects({ storyFlags: { "golden_pavilion_discovered": true } });
            const rival = generateProceduralNpc();
            rival.name = `Comerciante Rival ${rival.name.split(' ')[0]}`;
            rival.isRival = true;
            rival.initialRelationship = -15;
            gameState.relationships[rival.id] = rival;
            gameState.storyFlags.rivalId = rival.id;
            logLifeEvent(`Você nota o olhar calculista de ${rival.name} avaliando você.`);
            success = true;
            break;
        case "propose_marriage":
            const npc = mission; // Re-using the 'mission' parameter to pass the npc object
            if (npc && npc.canMarry && !gameState.spouseId) {
                gameState.spouseId = npc.id;
                npc.socialStatus = "casado";
                npc.partnerId = "player"; // A simple way to note the connection
                logLifeEvent(`Você e ${npc.name} se casaram em uma cerimônia simples.`);
                success = true;
            }
            break;
        case "start_spouse_quest_combat":
            startCombat('guan_family_disciple', null, { successKey: 'spouse_quest_win', failureKey: 'spouse_quest_loss' });
            success = true;
            break;
        case "child_dev_body":
            const childId_b = gameState.storyFlags.active_child_id;
            if (childId_b && gameState.relationships[childId_b]) {
                gameState.relationships[childId_b].attributes.body += 1;
                success = true;
            }
            break;
        case "start_sect_leader_duel":
            startCombat('sect_leader_hidden_cloud', null, { successKey: 'sect_leader_duel_win', failureKey: 'sect_leader_duel_loss' });
            success = true;
            break;
        case "start_smuggler_combat":
            startCombat('smuggler_guard', null, { successKey: 'smuggler_win', failureKey: 'smuggler_loss' });
            success = true;
            break;
        case "start_beast_matriarch_combat":
            startCombat('beast_matriarch', null, { successKey: 'beast_matriarch_win', failureKey: 'beast_matriarch_loss' });
            success = true;
            break;
        case "start_combat":
            const enemyId = mission.enemyId; // Re-using mission param to pass data
            if (enemyId) {
                startCombat(enemyId, null, { successKey: `${enemyId}_win`, failureKey: `${enemyId}_loss` });
                success = true;
            }
            break;
        case "recruit_disciples":
            if (gameState.sect.contribution >= 100) {
                gameState.sect.contribution -= 100;
                const newDisciples = Math.floor(Math.random() * 5) + 1;
                gameState.sect.discipleCount += newDisciples;
                logLifeEvent(`Você gastou recursos da seita para recrutar ${newDisciples} novos discípulos.`);
                success = true;
            } else {
                success = false;
            }
            break;
        case "send_diplomatic_gift":
            const data = mission; // Re-using the mission param
            const targetSectId = data.targetSectId;
            if (gameState.sect.contribution >= 100) {
                gameState.sect.contribution -= 100;
                applyEffects({ resources: { reputation: { [targetSectId]: 10 } } });
                logLifeEvent(`Você enviou um presente diplomático para ${allGameData.sects.find(s => s.id === targetSectId).name}, melhorando as relações.`);
                success = true;
            } else {
                success = false;
            }
            break;
        case "send_disciples_on_mission":
            if (gameState.sect.contribution >= 50 && gameState.sect.missionTimer <= 0) {
                gameState.sect.contribution -= 50;
                gameState.sect.missionTimer = 2; // 2 meses de duração
                logLifeEvent("Você enviou um grupo de discípulos em uma missão para coletar recursos.");
                success = true;
            } else {
                success = false;
            }
            break;
        case "child_dev_mind":
            const childId_m = gameState.storyFlags.active_child_id;
            if (childId_m && gameState.relationships[childId_m]) {
                gameState.relationships[childId_m].attributes.mind += 1;
                success = true;
            }
            break;
        case "child_joins_sect":
            const childId_s = gameState.storyFlags.active_child_id_sect;
            if (childId_s && gameState.relationships[childId_s]) {
                const child = gameState.relationships[childId_s];
                child.sectId = gameState.sect.id;
                logLifeEvent(`${child.name} se juntou à sua seita.`);
                success = true;
            }
            break;
        case "start_combat_lian_rival_duel":
            startCombat('rival_lian_duel', null, { successKey: 'lian_duel_win', failureKey: 'lian_duel_loss' });
            success = true;
            break;
        case "reforge_whispering_blade":
            // Remove quest items
            const itemsToRemove = ["cabo_lamina_antiga", "fragmento_lamina_1", "fragmento_lamina_2"];
            itemsToRemove.forEach(itemId => {
                const index = gameState.inventory.indexOf(itemId);
                if (index > -1) {
                    gameState.inventory.splice(index, 1);
                }
            });
            // Add final weapon
            applyEffects({ item: 'lamina_sussurrante' });
            success = true;
            break;
        case "become_apprentice_mestre_kaito":
            applyEffects({
                storyFlags: { "apprentice_mestre_kaito": true },
                item: "receita_amuleto_artesao"
            });
            logLifeEvent("Você se tornou aprendiz de Mestre Kaito e aprendeu a receita do Amuleto do Artesão!");
            success = true;
            break;
        case "become_apprentice_mei_lin":
            applyEffects({
                storyFlags: { "apprentice_mei_lin": true },
                item: "receita_pilula_percepcao"
            });
            logLifeEvent("Você se tornou aprendiz de Mei Lin e aprendeu a receita da Pílula da Percepção!");
            success = true;
            break;
        case "lose_current_sect_reputation_5":
            if (gameState.sect.id) {
                applyEffects({ resources: { reputation: { [gameState.sect.id]: -5 } } });
            }
            success = true;
            break;
        case "gain_current_sect_reputation_5":
            if (gameState.sect.id) {
                applyEffects({ resources: { reputation: { [gameState.sect.id]: 5 } } });
            }
            success = true;
            break;
        case "gain_current_sect_reputation_10":
            if (gameState.sect.id) {
                applyEffects({ resources: { reputation: { [gameState.sect.id]: 10 } } });
            }
            success = true;
            break;
        case "start_tournament_combat":
            const round = gameState.storyFlags.tournament_round;
            let opponentPool = [...allGameData.world_events[0].opponents[`round${round}`]];

            // Add rival to the pool if they exist and are strong enough for the round
            const rivalId = gameState.storyFlags.rivalId;
            if (rivalId && gameState.relationships[rivalId] && gameState.relationships[rivalId].cultivation.realmIndex >= round) {
                opponentPool.push(rivalId); // Add the ID, which can now be an object or a string
            }

            if (opponentPool.length > 0) {
                const opponentIdOrObj = opponentPool[Math.floor(Math.random() * opponentPool.length)];
                startCombat(opponentIdOrObj, null, { successKey: `tournament_round_${round}_win`, failureKey: `tournament_round_${round}_loss` });
                success = true;
            } else {
                // Should not happen if logic is correct
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

    const allItems = [...(allGameData.items || []), ...(allGameData.equipment || []), ...(allGameData.forging_ingredients || [])];
    const itemData = allItems.find(i => i.id === itemId);
    if (!itemData) return { success: false, message: "Item não encontrado." };

    gameState.inventory.splice(itemIndex, 1);

    let relationshipGain = allGameData.config.rewards.giftRelationship;
    let message = `${npc.name} aceita seu presente com um aceno de cabeça.`;

    if (npc.preferences) {
        const itemCategory = itemData.category || itemData.type;
        if (npc.preferences.likes && npc.preferences.likes.includes(itemCategory)) {
            relationshipGain *= 2;
            message = `${npc.name} parece adorar o presente!`;
        }
        if (npc.preferences.dislikes && npc.preferences.dislikes.includes(itemCategory)) {
            relationshipGain = 0;
            message = `${npc.name} aceita o presente, mas não parece muito impressionado(a).`;
        }
    }

    applyEffects({ relationships: { [npcId]: relationshipGain } });
    return { success: true, message: message };
}

export function sparWithNpc(npcId) {
    const npc = gameState.relationships[npcId];
    if (!npc) return { success: false, message: "NPC não encontrado." };
    let challengeDifficulty = 10; // This is complex, will leave for now
    if (npc.mood === 'Hostil' || npc.mood === 'Competitivo') {
        challengeDifficulty += 5;
    }
    if (npc.initialRelationship < 0) {
        challengeDifficulty += Math.abs(Math.floor(npc.initialRelationship / 10));
    }
    const successChance = allGameData.config.chances.spar.base + ((getEffectiveAttributes().body - challengeDifficulty) * allGameData.config.chances.spar.bodyFactor);
    if (Math.random() < successChance) {
        applyEffects({ attributes: { body: allGameData.config.rewards.spar.body }, relationships: { [npcId]: allGameData.config.rewards.spar.relationship } });
        return { success: true, message: `Você teve uma sessão de treino produtiva com ${npc.name}. Ambos se sentem mais fortes.` };
    } else {
        applyEffects({ relationships: { [npcId]: allGameData.config.penalties.sparRelationship } });
        return { success: false, message: `O treino com ${npc.name} foi desastroso. Vocês não conseguiram se entender.` };
    }
}

function addAlchemyXp(amount) {
    const skills = gameState.skills;
    skills.alchemyXp += amount;
    if (skills.alchemyXp >= skills.alchemyXpToNextLevel) {
        skills.alchemy++;
        skills.alchemyXp -= skills.alchemyXpToNextLevel;
        skills.alchemyXpToNextLevel = Math.floor(skills.alchemyXpToNextLevel * allGameData.config.xp.alchemy.levelMultiplier);
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
    let successChance = allGameData.config.chances.crafting.alchemy.base + (gameState.skills.alchemy * allGameData.config.chances.crafting.alchemy.skillFactor) + (getEffectiveAttributes().mind * allGameData.config.chances.crafting.alchemy.mindFactor);
    // Add manor bonus
    if (gameState.manor.owned && gameState.manor.alchemyLabLevel > 0) {
        successChance += gameState.manor.alchemyLabLevel * 0.05; // 5% bonus per level
    }
    // Add sect skill bonus
    if (gameState.sect.unlockedSkills.includes('efficient_alchemy')) {
        successChance += 0.05;
    }
    if (Math.random() < successChance) {
        gameState.inventory.push(recipe.result);
        addAlchemyXp(allGameData.config.xp.alchemy.success);
        const resultItem = allGameData.items.find(i => i.id === recipe.result);
        return { success: true, message: `Sucesso! Você criou ${resultItem.name}.` };
    } else {
        addAlchemyXp(allGameData.config.xp.alchemy.failure);
        return { success: false, message: "A criação falhou! Os ingredientes foram perdidos, mas você aprendeu algo com o erro." };
    }
}

function addForgingXp(amount) {
    const skills = gameState.skills;
    skills.forgingXp += amount;
    if (skills.forgingXp >= skills.forgingXpToNextLevel) {
        skills.forging++;
        skills.forgingXp -= skills.forgingXpToNextLevel;
        skills.forgingXpToNextLevel = Math.floor(skills.forgingXpToNextLevel * allGameData.config.xp.forging.levelMultiplier);
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

    let successChance = allGameData.config.chances.crafting.forging.base + (gameState.skills.forging * allGameData.config.chances.crafting.forging.skillFactor) + (getEffectiveAttributes().body * allGameData.config.chances.crafting.forging.bodyFactor);
    // Add sect skill bonus
    if (gameState.sect.unlockedSkills.includes('improved_forging_techniques')) {
        successChance += 0.05;
    }
    if (Math.random() < successChance) {
        gameState.inventory.push(recipe.result);
        addForgingXp(allGameData.config.xp.forging.success);
        const resultItem = allGameData.equipment.find(i => i.id === recipe.result);
        return { success: true, message: `Sucesso! Você forjou ${resultItem.name}.` };
    } else {
        addForgingXp(allGameData.config.xp.forging.failure);
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

export function startCombat(enemyData, missionId = null, keys = {}) {
    let enemy;
    if (typeof enemyData === 'string') {
        enemy = allGameData.enemies.find(e => e.id === enemyData);
    } else {
        enemy = enemyData; // Assume it's a direct enemy object
    }
    if (!enemy) return;

    const newCombatState = {
        enemy: enemy,
        enemyHealth: enemy.attributes.health,
        log: [],
        playerBuffs: [],
        enemyBuffs: [],
        playerStatusEffects: [],
        enemyStatusEffects: [],
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

function updateStatusEffects(effects, target, log) {
    const activeEffects = [];
    let isStunned = false;

    effects.forEach(effect => {
        switch (effect.type) {
            case 'poison':
                const poisonDamage = effect.damage || 5;
                target.attributes.health -= poisonDamage;
                log.push(`${target.name} sofre ${poisonDamage} de dano de veneno.`);
                break;
            case 'stun':
                isStunned = true;
                log.push(`${target.name} está atordoado e não pode agir!`);
                break;
        }

        effect.duration--;
        if (effect.duration > 0) {
            activeEffects.push(effect);
        } else {
            log.push(`O efeito de ${effect.id} desapareceu de ${target.name}.`);
        }
    });

    return { activeEffects, isStunned };
}

function calculateDamage(baseDamage, damageType, target) {
    let finalDamage = baseDamage;
    if (target.resistances && target.resistances[damageType]) {
        finalDamage *= target.resistances[damageType];
    }
    if (target.vulnerabilities && target.vulnerabilities[damageType]) {
        finalDamage *= target.vulnerabilities[damageType];
    }
    return Math.floor(finalDamage);
}

export function takeCombatTurn(action) {
    if (!combatState) return 'loss';
    combatState.log = [];

    // Player's status effects tick first
    let playerStatusResult = updateStatusEffects(combatState.playerStatusEffects, { name: "Você", attributes: gameState.attributes }, combatState.log);
    combatState.playerStatusEffects = playerStatusResult.activeEffects;
    if (gameState.attributes.health <= 0) return 'loss';
    if (playerStatusResult.isStunned) {
        // If player is stunned, we skip their action and go to the enemy's turn
        action = 'stunned';
    }

    combatState.playerBuffs = updateBuffs(combatState.playerBuffs, combatState.log);
    const playerBaseAttributes = getEffectiveAttributes();
    const playerAttributes = applyBuffs(playerBaseAttributes, combatState.playerBuffs);

    let enemyTurnSkipped = false;

    if (action === 'stunned') {
        // Player does nothing this turn
    } else if (typeof action === 'object' && action.type === 'technique') {
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
                let baseDamage = effect.baseValue + Math.floor(playerAttributes[effect.scalingStat] * effect.scalingFactor);
                const damageType = effect.damageType || 'spiritual';

                // Reduz o dano pela defesa mágica do inimigo se for espiritual
                if (damageType === 'spiritual') {
                    baseDamage -= combatState.enemy.attributes.magicDefense || 0;
                }

                const finalDamage = calculateDamage(baseDamage, damageType, combatState.enemy);
                combatState.enemyHealth -= finalDamage;
                combatState.log.push(`A técnica causa ${finalDamage} de dano de ${damageType}.`);
            } else if (effect.type === 'combat_buff') {
                combatState.playerBuffs.push({ name: techData.name, ...effect });
                combatState.log.push(`Você se sente mais forte! (+${effect.value} ${effect.stat} por ${effect.duration} turnos)`);
            } else if (effect.type === 'combat_status_effect') {
                combatState.enemyStatusEffects.push({ id: techData.id, ...effect.statusEffect });
                combatState.log.push(`Você aplica ${effect.statusEffect.type} no inimigo!`);
            } else if (effect.type === 'combat_extra_attack') {
                combatState.log.push("Você usa a Lâmina Veloz para um ataque extra!");
                // Perform a basic physical attack immediately
                let baseDamage = Math.max(1, Math.floor(playerAttributes.body / allGameData.config.combat.damage.bodyDivisor) - Math.floor(combatState.enemy.attributes.defense / allGameData.config.combat.damage.defenseDivisor));
                let finalDamage = calculateDamage(baseDamage, 'physical', combatState.enemy);
                combatState.enemyHealth -= finalDamage;
                combatState.log.push(`Seu ataque rápido causa ${finalDamage} de dano físico.`);
            }
        }
    } else if (action === 'attack') {
        combatState.playerIsDefending = false;
        if (Math.random() < combatState.enemy.attributes.dodgeChance) {
            combatState.log.push(`${combatState.enemy.name} se esquiva do seu ataque!`);
        } else {
            const weaponId = gameState.equipment.weapon;
            const weapon = allGameData.equipment.find(e => e.id === weaponId);
            const damageType = weapon ? weapon.damageType : 'physical';

            let baseDamage = Math.max(1, playerAttributes.attackPower - (combatState.enemy.attributes.defense || 0));

            let finalDamage = calculateDamage(baseDamage, damageType, combatState.enemy);

            if (Math.random() < playerAttributes.critChance) {
                finalDamage = Math.floor(finalDamage * playerAttributes.critDamage);
                combatState.log.push("GOLPE CRÍTICO!");
            }
            combatState.enemyHealth -= finalDamage;
            combatState.log.push(`Você ataca e causa ${finalDamage} de dano ${damageType}.`);
        }
    } else if (action === 'defend') {
        combatState.playerIsDefending = true;
        combatState.log.push("Você se prepara para defender o próximo ataque.");
    }

    if (combatState.enemyHealth <= 0) return 'win';

    if (!enemyTurnSkipped) {
        // Enemy's status effects tick
        let enemyStatusResult = updateStatusEffects(combatState.enemyStatusEffects, { name: combatState.enemy.name, attributes: combatState.enemy }, combatState.log);
        combatState.enemyStatusEffects = enemyStatusResult.activeEffects;
        if (combatState.enemyHealth <= 0) return 'win';

        if (enemyStatusResult.isStunned) {
            // Skip enemy's turn if stunned
        } else {
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
                        if (ability.effect && ability.effect.statusEffect && Math.random() < ability.effect.statusEffect.chance) {
                            combatState.playerStatusEffects.push({ id: ability.id, ...ability.effect.statusEffect });
                            combatState.log.push(`Você foi envenenado!`);
                        }
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
                let enemyDamage = Math.max(1, (enemyAttributes.attackPower || enemyAttributes.body) - playerAttributes.defense);

                // Assume o ataque do inimigo é físico, a menos que especificado de outra forma
                const enemyDamageType = enemyAttributes.damageType || 'physical';
                if (enemyDamageType === 'spiritual') {
                    enemyDamage = Math.max(1, (enemyAttributes.attackPower || enemyAttributes.soul) - playerAttributes.magicDefense);
                }

                if (Math.random() < enemyAttributes.critChance) {
                    enemyDamage = Math.floor(enemyDamage * (enemyAttributes.critDamage || 1.5));
                    combatState.log.push("GOLPE CRÍTICO INIMIGO!");
                }
                if (combatState.playerIsDefending) {
                    enemyDamage = Math.floor(enemyDamage * allGameData.config.combat.defendMultiplier);
                    combatState.log.push("Sua defesa amortece o golpe!");
                    combatState.playerIsDefending = false;
                }
                applyEffects({ attributes: { health: -enemyDamage } });
                combatState.log.push(`${combatState.enemy.name} ataca e causa ${enemyDamage} de dano.`);
            }
        }
        }
    }

    if (gameState.attributes.health <= 0) return 'loss';

    return 'continue';
}

export function endCombat(outcome, returnView = 'map') {
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
        // After a sect mission, we should return to the sect actions view.
        returnView = 'sect_actions';
    } else if (successKey && failureKey) {
        if (outcome === 'win') {
            logLifeEvent(`Derrotou ${combatState.enemy.name} em um duelo crucial.`);
            if (combatState.enemy.id === 'elite_blood_disciple') {
                applyEffects({ storyFlags: { warriorPath1Success: true } });
            }
            if (combatState.enemy.id === 'elite_commander') {
                applyEffects({ storyFlags: { warriorPath2Success: true } });
            }
            if (combatState.enemy.id === 'stone_golem_guardian') {
                applyEffects({ item: 'fragmento_lamina_1' });
            }
            if (combatState.enemy.id === 'rival_lian_duel') {
                applyEffects({ item: 'tech_swift_blade' });
            }

            // Handle tournament outcomes
            if (successKey.startsWith('tournament_round_')) {
                const round = parseInt(successKey.match(/(\d+)/)[0]);
                if (outcome === 'win') {
                    logLifeEvent(`Você venceu a ${round}ª rodada do Grande Torneio!`);
                    applyEffects({
                        storyFlags: { [`tournament_round_${round}_won`]: true, tournament_round: round + 1 },
                        resources: { money: 100 * round }
                    });
                    // Check if tournament is won
                    if (round >= Object.keys(allGameData.world_events[0].opponents).length) {
                        applyEffects({ storyFlags: { tournament_winner: true, tournament_active: false } });
                        logLifeEvent("Você é o campeão do Grande Torneio de Artes Marciais!");
                    }
                } else { // loss
                    logLifeEvent(`Você foi eliminado na ${round}ª rodada do Grande Torneio.`);
                    applyEffects({ storyFlags: { tournament_eliminated: true, tournament_active: false } });
                }
            }

            // Handle rival duel outcomes
            if (successKey === 'rival_duel_win') {
                logLifeEvent(`Você derrotou seu rival em um duelo. A vitória lhe rendeu respeito na seita.`);
                applyEffects({ sect: { favor: 1, reputation: { [gameState.sect.id]: 5 } } });
                gameState.relationships[gameState.storyFlags.rivalId].initialRelationship -= 5;
            }

            // Handle spouse quest outcomes
            if (successKey === 'spouse_quest_win') {
                logLifeEvent(`Você defendeu a honra de sua família.`);
                applyEffects({ relationships: { [gameState.spouseId]: 15 } });
                gameState.storyFlags.spouse_quest_avenge_insult_active = false; // End the quest
            }

            // Handle sect leader duel win
            if (successKey === 'sect_leader_duel_win') {
                logLifeEvent(`Você derrotou o Mestre da Seita e se tornou a nova liderança!`);
                applyEffects({ storyFlags: { isSectLeader: true } });
            }

            if (successKey === 'blood_cult_fanatic_win') {
                logLifeEvent(`Você derrotou o fanático e encontrou um diário em seu corpo.`);
                applyEffects({ storyFlags: { blood_cult_stage: 2 } });
            }

            resultText = allGameData.strings[successKey] || "Vitória!";
        } else {
             // Handle sect leader duel loss
            if (failureKey === 'sect_leader_duel_loss') {
                logLifeEvent(`Você foi derrotado pelo Mestre da Seita e exilado por sua insolência.`);
                handleSpecialEffects("exile_from_sect");
            }
             // Handle rival duel loss
            if (failureKey === 'rival_duel_loss') {
                logLifeEvent(`Você foi derrotado por seu rival. A derrota é uma lição de humildade.`);
                applyEffects({ sect: { reputation: { [gameState.sect.id]: -2 } } });
                gameState.relationships[gameState.storyFlags.rivalId].initialRelationship += 2;
            }
            // Handle tournament loss specifically as well
             if (failureKey.startsWith('tournament_round_')) {
                const round = parseInt(failureKey.match(/(\d+)/)[0]);
                logLifeEvent(`Você foi eliminado na ${round}ª rodada do Grande Torneio.`);
                applyEffects({ storyFlags: { tournament_eliminated: true, tournament_active: false } });
            }
            resultText = allGameData.strings[failureKey] || "Derrota...";
        }
    } else if (successKey === 'tribulation_success') {
        if (outcome === 'win') {
            const nextRealm = cultivationRealms[gameState.cultivation.realmIndex + 1];
            logLifeEvent(`SOBREVIVEU! Você superou a tribulação e avançou para o reino ${nextRealm.name}!`);

            // Recompensa por sobreviver à tribulação
            applyEffects({
                cultivation: { realmIndex: 1, subRealmIndex: 0, qi: -gameState.cultivation.qi },
                attributes: { maxHealth: 20, body: 2, mind: 2, soul: 2 },
                storyFlags: { justLeveledUpRealm: true }
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
    if (gameState.sect.contribution >= reqs.contribution && gameState.resources.reputation[sect.id] >= reqs.reputation) {
        gameState.sect.contribution -= reqs.contribution;
        gameState.sect.rankIndex++;
        const newRank = sect.ranks[gameState.sect.rankIndex];
        logLifeEvent(`Foi promovido para ${newRank} na seita.`);
        gameState.storyFlags.justPromoted = true;
        return true;
    }
    return false;
}

export function attemptMission(missionId) {
    const sect = getSect();
    if (!sect || !sect.missions) return;
    const mission = sect.missions.find(m => m.id === missionId);
    if (!mission) return;

    // Handle combat missions via special effects
    if (mission.check.type === 'combat') {
        startCombat(mission.check.enemyId, mission.id);
        // The outcome will be handled by endCombat
        return;
    }

    // Handle attribute check missions
    let missionSuccess = false;
    if (mission.check.attribute) {
        const playerStat = getEffectiveAttributes()[mission.check.attribute];
        const successChance = 0.5 + ((playerStat - mission.check.difficulty) * 0.05);
        missionSuccess = Math.random() < successChance;
    } else {
        missionSuccess = true; // No check means automatic success
    }

    if (missionSuccess) {
        applyEffects(mission.rewards.success);
    } else {
        applyEffects(mission.rewards.failure);
    }
    // Update UI after the mission attempt
    // This part might need to be handled in ui.js to show a proper result screen
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

// --- FUNÇÕES DE LEGADO ---
export function selectLegacy(legacyId) {
    if (legacyId === 'none') {
        localStorage.removeItem('wuxiaLegacyChoice');
    } else {
        const legacy = allGameData.legacies.find(l => l.id === legacyId);
        if (legacy) {
            localStorage.setItem('wuxiaLegacyChoice', JSON.stringify(legacy.effects));
        }
    }
    // Recarrega o jogo para um novo começo
    location.reload();
}

export function becomeHeir(heirId) {
    const heir = gameState.relationships[heirId];
    if (!heir) return;

    const inheritance = {
        isHeir: true,
        heirData: heir,
        money: Math.floor(gameState.resources.money / 2),
        talents: heir.inheritedTalents || []
    };

    localStorage.removeItem('wuxiaGameState'); // Limpa o save antigo
    localStorage.setItem('wuxiaHeirInheritance', JSON.stringify(inheritance));
    location.reload();
}

export function unlockSectSkill(skillId) {
    const skill = allGameData.sect_skills.find(s => s.id === skillId);
    if (!skill || gameState.sect.unlockedSkills.includes(skillId)) {
        return;
    }

    if (gameState.sect.contribution >= skill.cost.contribution && gameState.sect.favor >= skill.cost.favor) {
        gameState.sect.contribution -= skill.cost.contribution;
        gameState.sect.favor -= skill.cost.favor;
        gameState.sect.unlockedSkills.push(skillId);
        logLifeEvent(`Sua seita pesquisou e desbloqueou a habilidade: ${skill.name}.`);
    }
}

export function upgradeManorFacility(facility) {
    const facilityKey = `${facility}Level`;
    const baseCost = allGameData.config.costs.manor_upgrades[facility];
    const cost = baseCost * (gameState.manor[facilityKey] + 1);

    if (gameState.resources.money >= cost) {
        gameState.resources.money -= cost;
        gameState.manor[`${facility}Level`]++;
        logLifeEvent(`Você melhorou sua instalação: ${facility.replace(/([A-Z])/g, ' $1')}.`);
        return { success: true };
    } else {
        return { success: false, message: "Você não tem moedas suficientes." };
    }
}
