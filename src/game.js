import { gameState, allGameData, setGameData, cultivationRealms, combatState, saveGame, getEffectiveAttributes } from './state.js';
import { elements, updateUI, showDeathScreen, setupTabs, showView, showCombatUI, showSectActions, showAlchemyView, showHubView, showTutorial } from './ui.js';
import { applyEffects, handleSpecialEffects, logLifeEvent, logAction, startCombat } from './handlers.js';

/**
 * Inicializa o jogo, configurando o estado inicial e os event listeners.
 */
export function initializeGame(gameData) {
    setupTabs();
    elements.nextMonthBtn.addEventListener('click', () => advanceMonth('rest'));
    elements.meditateBtn.addEventListener('click', () => advanceMonth('meditate'));
    elements.sectActionsBtn.addEventListener('click', showSectActions);
    elements.sectManagementBtn.addEventListener('click', showSectManagementView);
    elements.alchemyBtn.addEventListener('click', showAlchemyView);
    elements.manorBtn.addEventListener('click', showManorView);
    showView('map');
}

function checkEventConditions(conditions) {
    if (!conditions) return true; // Eventos sem condições sempre podem ocorrer

    let met = true;
    if (conditions.minAge && gameState.age < conditions.minAge) met = false;
    if (conditions.maxAge && gameState.age > conditions.maxAge) met = false;
    if (conditions.realmIndex && gameState.cultivation.realmIndex < conditions.realmIndex) met = false;
    if (conditions.sectId) {
        if (Array.isArray(conditions.sectId)) {
            if (!conditions.sectId.includes(gameState.sect.id)) met = false;
        } else {
            if (gameState.sect.id !== conditions.sectId) met = false;
        }
    }
    if (conditions.equippedTechnique && !gameState.equippedTechniques.includes(conditions.equippedTechnique)) met = false;

    if (conditions.storyFlags) {
        for (const flag in conditions.storyFlags) {
            const conditionValue = conditions.storyFlags[flag];

            // Simple check for flat flags
            if (!flag.includes('.')) {
                if (typeof conditionValue === 'object' && conditionValue.exists) {
                    if (gameState.storyFlags[flag] === undefined) {
                        met = false;
                        break;
                    }
                } else if (gameState.storyFlags[flag] !== conditionValue) {
                    met = false;
                    break;
                }
            }

        }
    }
     if (!met) return false;

    // Nested condition checks (e.g., "manor.owned")
    if (conditions['manor.owned'] !== undefined) {
        if (gameState.manor.owned !== conditions['manor.owned']) {
            met = false;
        }
    }
     if (!met) return false;

    // Check for currentRegionId specifically
    if (conditions.currentRegionId && gameState.currentRegionId !== conditions.currentRegionId) {
        met = false;
    }
    if (!met) return false;

    if (conditions.attributes) {
        const effectiveAttributes = getEffectiveAttributes();
        for (const attr in conditions.attributes) {
            if (effectiveAttributes[attr] < conditions.attributes[attr]) {
                 met = false;
                 break;
            }
        }
    }
     if (!met) return false;

    if (conditions.resources) {
        for (const resource in conditions.resources) {
            if (gameState.resources[resource] < conditions.resources[resource]) {
                met = false;
                break;
            }
        }
    }
    if (!met) return false;

    if (conditions.reputation) {
        for (const factionId in conditions.reputation) {
            const rep = gameState.resources.reputation[factionId];
            const cond = conditions.reputation[factionId];
            if (rep === undefined || (cond.lessThan && rep >= cond.lessThan) || (cond.greaterThan && rep <= cond.greaterThan)) {
                met = false;
                break;
            }
        }
    }
     if (!met) return false;

    if (conditions.relationships) {
        for (const npcId in conditions.relationships) {
            const rel = gameState.relationships[npcId];
            const cond = conditions.relationships[npcId];
            if (!rel || (cond.lessThan && rel.initialRelationship >= cond.lessThan) || (cond.greaterThan && rel.initialRelationship <= cond.greaterThan)) {
                met = false;
                break;
            }
        }
    }
    if (!met) return false;

    if (conditions.inventory) {
        for (const itemId in conditions.inventory) {
            const requiredAmount = conditions.inventory[itemId];
            const hasAmount = gameState.inventory.filter(id => id === itemId).length;
            if (hasAmount < requiredAmount) {
                met = false;
                break;
            }
        }
    }
    if (!met) return false;

    if (conditions.not_inventory) {
        for (const itemId in conditions.not_inventory) {
            const requiredAmount = conditions.not_inventory[itemId];
            const hasAmount = gameState.inventory.filter(id => id === itemId).length;
            if (hasAmount >= requiredAmount) {
                met = false;
                break;
            }
        }
    }

    return met;
}


/**
 * Ação principal de viajar para uma nova região e encontrar um evento.
 * @param {string} regionId - O ID da região para a qual viajar.
 */
export function travelToRegion(regionId) {
    if (gameState.attributes.energy < allGameData.config.costs.travel) {
        return;
    }
    gameState.attributes.energy -= allGameData.config.costs.travel;
    gameState.currentRegionId = regionId;
    updateUI();

    const region = allGameData.regions.find(r => r.id === regionId);
    if (!region) return;

    if (region.type === 'hub') {
        showHubView(region);
        return;
    }

    // Lógica de evento para regiões normais
    // Prioritize discovering a Point of Interest
    const poisInRegion = allGameData.points_of_interest.filter(poi => poi.regionId === regionId && !gameState.discoveredPoIs.includes(poi.id));
    let discoveryMade = false;
    if (poisInRegion.length > 0) {
        for (const poiToDiscover of poisInRegion) {
            if (Math.random() < poiToDiscover.discoveryChance) {
                gameState.discoveredPoIs.push(poiToDiscover.id);
                logLifeEvent(`Você descobriu um novo local: ${poiToDiscover.name}!`);
                showEvent(poiToDiscover.events[0]);
                discoveryMade = true;
                break; // Apenas uma descoberta por viagem
            }
        }
    }

    if (discoveryMade) return; // Stop if a discovery was made

    // Fallback to normal event logic
    let allPossibleEvents = [...(allGameData.events || []), ...(allGameData.random_events || []), ...(allGameData.quest_whispering_blade || [])];

    // Check for and add any triggered world events
    const worldEvents = checkWorldEvents();
    allPossibleEvents.push(...worldEvents);

    const possibleEvents = allPossibleEvents.filter(event => {
        // 1. O evento já foi acionado?
        if (gameState.triggeredEvents.includes(event.id)) return false;
        // 2. As condições são atendidas?
        if (!checkEventConditions(event.conditions)) return false;
        // 3. O evento pertence a esta região? (Opcional, por enquanto todos são globais)
        // Adicionar lógica de regionId no evento se necessário
        return true;
    });

    if (possibleEvents.length > 0) {
        const eventToShow = selectEvent(possibleEvents);
        showEvent(eventToShow);
    } else {
        // Nenhum evento encontrado, apenas mostra o mapa
        showView('map');
    }
}


/**
 * Mostra um evento na tela, com seu texto e opções.
 * @param {object} event - O objeto do evento a ser exibido.
 * @param {string} [returnView='map'] - A view para a qual retornar após o evento.
 */
export function showEvent(event, returnView = 'map') {
    showView('event');
    elements.eventContent.innerHTML = `<p>${event.text}</p>`;
    elements.choicesContainer.innerHTML = '';

    // Marca o evento como acionado para não repetir
    if (event.id) {
        gameState.triggeredEvents.push(event.id);
    }

    event.choices.forEach(choice => {
        const button = document.createElement('button');
        button.textContent = choice.text;
        button.onclick = () => {
            let success = true;
            if (choice.effects.special) {
                success = handleSpecialEffects(choice.effects.special);
            } else {
                applyEffects(choice.effects);
            }

            if (choice.effects.special === 'duel_lian') {
                startCombat('rival_lian_14');
                showCombatUI();
                return;
            }

            if (gameState.combat) { return; }

            let resultText;
            if (choice.effects.special) {
                const key = success ? choice.successKey : choice.failureKey;
                resultText = allGameData.strings[key] || "Resultado não encontrado.";
            } else {
                resultText = allGameData.strings[choice.resultKey] || "Resultado não encontrado.";
            }
            elements.eventContent.innerHTML = `<p>${resultText}</p>`;
            elements.choicesContainer.innerHTML = '';

            logAction({ eventText: event.text, choiceText: choice.text, resultText: resultText });

            if (gameState.attributes.health <= 0) {
                showDeathScreen();
            } else {
                // Após o evento, volta para a view anterior
                const continueButton = document.createElement('button');
                continueButton.textContent = "Continuar";
                continueButton.onclick = () => {
                    showView(returnView);
                    updateUI();
                };
                elements.choicesContainer.appendChild(continueButton);
            }
            saveGame();
        };
        elements.choicesContainer.appendChild(button);
    });
}

/**
 * Seleciona um evento de uma lista de eventos possíveis com base na prioridade.
 * @param {Array} possibleEvents - Uma lista de objetos de evento.
 * @returns {object} O evento selecionado.
 */
function selectEvent(possibleEvents) {
    // Encontra a prioridade mais alta entre os eventos possíveis
    const maxPriority = Math.max(...possibleEvents.map(e => e.priority || 0));

    // Filtra eventos que têm a prioridade mais alta
    const highPriorityEvents = possibleEvents.filter(e => (e.priority || 0) === maxPriority);

    // Seleciona aleatoriamente um dos eventos de maior prioridade
    return highPriorityEvents[Math.floor(Math.random() * highPriorityEvents.length)];
}


/**
 * Dispara o evento de avanço de reino de cultivo.
 */
function triggerBreakthroughEvent() {
    showView('event');
    const currentRealmIndex = gameState.cultivation.realmIndex;
    const nextRealm = cultivationRealms[currentRealmIndex + 1];
    if (!nextRealm) {
        elements.eventContent.innerHTML = "<p>Você atingiu o pico do mundo mortal. O caminho à frente está velado em mistério.</p>";
        return;
    }

    const requirements = nextRealm.breakthroughRequirements || {};
    const effectiveAttributes = getEffectiveAttributes();
    let meetsRequirements = true;
    let requirementsText = "";
    for (const attr in requirements) {
        const isCultivationStat = ['daoComprehension'].includes(attr);
        const playerStat = isCultivationStat ? gameState.cultivation[attr] : effectiveAttributes[attr];

        if (playerStat < requirements[attr]) {
            meetsRequirements = false;
            requirementsText += ` ${attr}: ${requirements[attr]} (Você tem ${playerStat}),`;
        }
    }
    requirementsText = requirementsText.slice(0, -1);

    let eventHTML = `<p>Você acumulou Qi suficiente e sente a barreira para o próximo reino: ${nextRealm.name}.</p>`;
    if (!meetsRequirements) {
        eventHTML += `<p style="color: #d63031;">No entanto, você sente que sua base é instável. Requisitos não cumpridos:${requirementsText}.</p>`;
    }
    elements.eventContent.innerHTML = eventHTML;
    elements.choicesContainer.innerHTML = '';

    const attemptButton = document.createElement('button');
    attemptButton.textContent = "Tentar o avanço agora.";
    if (!meetsRequirements) {
        attemptButton.disabled = true;
        attemptButton.title = `Requisitos não cumpridos:${requirementsText}`;
    }
    attemptButton.onclick = () => {
        // Para reinos mais baixos, é um teste simples. Para mais altos, uma tribulação.
        if (gameState.cultivation.realmIndex < 1) { // Apenas a primeira transição é simples
             const successChance = (meetsRequirements ? allGameData.config.chances.breakthrough.baseSuccess : allGameData.config.chances.breakthrough.baseFailure) + (effectiveAttributes.luck * allGameData.config.chances.breakthrough.luckFactor);
            if (Math.random() < successChance) {
                applyEffects({ cultivation: { realmIndex: 1, subRealmIndex: 0, qi: -gameState.cultivation.qi }, storyFlags: { justLeveledUpRealm: true } });
                logLifeEvent(`Avançou para o reino ${nextRealm.name}.`);
                elements.eventContent.innerHTML = `<p>Parabéns! Você avançou para o reino ${nextRealm.name}!</p>`;
            } else {
                gameState.cultivation.qi = Math.floor(gameState.cultivation.qi * allGameData.config.chances.breakthrough.qiPenaltyFactor);
                elements.eventContent.innerHTML = `<p>A tentativa falhou! Seu Qi se dispersa violentamente.</p>`;
            }
            const backToMapButton = document.createElement('button');
            backToMapButton.textContent = "Voltar ao Mapa";
            backToMapButton.onclick = () => {
                showView('map');
                updateUI();
            };
            elements.choicesContainer.innerHTML = '';
            elements.choicesContainer.appendChild(backToMapButton);
            saveGame();
        } else {
            // Tribulação Celestial!
            elements.eventContent.innerHTML = `<p>Os céus se agitam! Uma tribulação desce para testar sua dignidade!</p>`;
            startCombat('lightning_spirit_tribulation', null, { successKey: 'tribulation_success', failureKey: 'tribulation_failure' });
            showCombatUI();
        }
    };
    elements.choicesContainer.appendChild(attemptButton);

    const waitButton = document.createElement('button');
    waitButton.textContent = "Esperar e acumular mais base.";
    waitButton.onclick = () => {
        showView('map');
        updateUI();
    };
    elements.choicesContainer.appendChild(waitButton);
}


/**
 * Avança um ano no jogo. Agora, principalmente para restaurar energia e progredir o tempo.
 */
function simulateNpcLife() {
    if (!allGameData.npc_life_events) return;

    for (const npcId in gameState.relationships) {
        const npc = gameState.relationships[npcId];
        if (npc.alive) {
            npc.age++;

            // Lógica de morte
            if (npc.age > npc.maxAge) {
                npc.alive = false;
                logLifeEvent(`${npc.name} morreu de velhice.`);
                continue;
            }

            // Lógica de Cultivo do NPC
            if (npc.cultivation && npc.attributes) {
                let qiGain = allGameData.config.npc.cultivation.baseQiGain + Math.floor(npc.attributes.soul / allGameData.config.npc.cultivation.soulDivisor);

                // Rival Growth Bonus
                if (npc.isRival) {
                    qiGain *= 1.2; // 20% faster Qi gain
                    // Add 1 point every 5 months to avoid floating point issues
                    if (gameState.month % 5 === 0) {
                        npc.attributes.body += 1;
                        npc.attributes.mind += 1;
                        npc.attributes.soul += 1;
                    }
                }

                npc.cultivation.qi += qiGain;

                const currentNpcRealm = cultivationRealms[npc.cultivation.realmIndex];
                if (npc.cultivation.qi >= currentNpcRealm.qiMax) {
                    const breakthroughChance = allGameData.config.chances.npcBreakthrough.base + (npc.attributes.luck * allGameData.config.chances.npcBreakthrough.luckFactor);
                    if (Math.random() < breakthroughChance) {
                        npc.cultivation.realmIndex++;
                        npc.cultivation.qi = 0;
                        const newRealm = cultivationRealms[npc.cultivation.realmIndex];
                        npc.lifeEvents.push({ age: npc.age, text: `avançou para o reino ${newRealm.name}!` });
                    } else {
                        npc.cultivation.qi = Math.floor(npc.cultivation.qi * allGameData.config.chances.npcBreakthrough.qiPenaltyFactor);
                        npc.lifeEvents.push({ age: npc.age, text: `falhou em sua tentativa de avanço de reino.` });
                    }
                }
            }

            // Lógica de eventos de vida
            for (const event of allGameData.npc_life_events) {
                let currentChance = event.chance;
                if (event.ambition_affinity && event.ambition_affinity === npc.ambition) {
                    currentChance *= allGameData.config.npc.lifeEvent.ambitionMultiplier; // Dobra a chance se a ambição for compatível
                }

                if (Math.random() < currentChance) {
                    if (event.effects.mood) {
                        npc.mood = event.effects.mood;
                    }
                    npc.lifeEvents.push({ age: npc.age, text: event.text });
                    break;
                }
            }

            // Lógica de Ambição
            if (npc.ambition === 'wealth' && npc.age > 25 && !npc.isMerchant) {
                if (Math.random() < allGameData.config.chances.npcAmbition.wealth) {
                    npc.isMerchant = true;
                    gameState.storyFlags.hasMerchantNpc = true;
                    npc.lifeEvents.push({ age: npc.age, text: "decidiu deixar sua vida para trás e se tornou um mercador viajante." });
                    logLifeEvent(`Você ouve que ${npc.name} se tornou um mercador viajante.`);
                }
            } else if (npc.ambition === 'power' && npc.sectId && npc.cultivation.realmIndex >= 2 && !npc.hasChallengedLeader) {
                if (Math.random() < allGameData.config.chances.npcAmbition.power) {
                    npc.hasChallengedLeader = true;
                    const sect = allGameData.sects.find(s => s.id === npc.sectId);
                    const success = Math.random() < 0.2; // Baixa chance de sucesso
                    if (success) {
                        npc.lifeEvents.push({ age: npc.age, text: `desafiou a liderança da ${sect.name} e venceu, tornando-se uma figura de poder.` });
                        logLifeEvent(`Um grande escândalo abala a ${sect.name}! ${npc.name} derrotou um ancião e assumiu uma nova posição de poder!`);
                        npc.initialRelationship += 20; // Ganha respeito
                    } else {
                        npc.lifeEvents.push({ age: npc.age, text: `tentou tomar o poder na ${sect.name}, mas falhou miseravelmente e foi punido.` });
                        logLifeEvent(`Você ouve que ${npc.name} foi severamente punido após uma tentativa fracassada de tomar o poder na ${sect.name}.`);
                        npc.initialRelationship -= 20;
                    }
                }
            }
        }
    }

    // Fase Social (Interação entre NPCs)
    const npcs = Object.values(gameState.relationships).filter(n => n.alive && !n.isProcedural);
    for (let i = 0; i < npcs.length; i++) {
        for (let j = i + 1; j < npcs.length; j++) {
            const npc1 = npcs[i];
            const npc2 = npcs[j];

            if (Math.random() < allGameData.config.chances.npcInteraction) { // 10% de chance de interação por ano
                let relChange = (Math.random() - 0.5) * allGameData.config.npc.relationships.interactionChange; // -2 a +2
                if (npc1.ambition === npc2.ambition && npc1.ambition !== 'power') {
                    relChange += allGameData.config.npc.relationships.commonInterestBonus; // Interesses em comum
                }
                if (npc1.ambition === 'power' && npc2.ambition === 'power') {
                    relChange -= allGameData.config.npc.relationships.powerRivalPenalty; // Rivais de poder
                }

                npc1.relationships[npc2.id] = (npc1.relationships[npc2.id] || 0) + relChange;
                npc2.relationships[npc1.id] = (npc2.relationships[npc1.id] || 0) + relChange;

                // Lógica de Casamento
                if (npc1.socialStatus === 'solteiro' && npc2.socialStatus === 'solteiro' && npc1.relationships[npc2.id] > 75 && npc2.relationships[npc1.id] > 75) {
                    if (Math.random() < allGameData.config.chances.npcMarriage) { // 20% de chance de casamento por ano se as condições forem atendidas
                        npc1.socialStatus = 'casado';
                        npc2.socialStatus = 'casado';
                        npc1.partnerId = npc2.id;
                        npc2.partnerId = npc1.id;
                        npc1.lifeEvents.push({ age: npc1.age, text: `casou-se com ${npc2.name}.` });
                        npc2.lifeEvents.push({ age: npc2.age, text: `casou-se com ${npc1.name}.` });
                        // Log para o jogador principal também
                        logLifeEvent(`Você ouve notícias de que ${npc1.name} e ${npc2.name} se casaram.`);
                    }
                }

                // Lógica de Filhos
                if (npc1.socialStatus === 'casado' && npc1.partnerId === npc2.id) {
                    if (Math.random() < allGameData.config.chances.npcChildren) { // 5% de chance de ter um filho por ano
                        const child = generateProceduralNpc([npc1, npc2]);
                        gameState.relationships[child.id] = child;
                        npc1.childrenIds.push(child.id);
                        npc2.childrenIds.push(child.id);
                        logLifeEvent(`${npc1.name} e ${npc2.name} tiveram um(a) filho(a): ${child.name}.`);
                    }
                }
            }
        }
    }
}

function checkNpcUnlocks() {
    if (!allGameData.npcs) return;

    allGameData.npcs.forEach(npc => {
        // Se o NPC já está no jogo, não faz nada
        if (gameState.relationships[npc.id]) return;
        // Se o NPC não tem condições de desbloqueio, não faz nada
        if (!npc.unlockConditions) return;

        let conditionsMet = true;
        const conditions = npc.unlockConditions;

        if (conditions.age && gameState.age < conditions.age) conditionsMet = false;
        if (conditions.reputation && gameState.resources.reputation < conditions.reputation) conditionsMet = false;
        if (conditions.sectId && gameState.sect.id !== conditions.sectId) conditionsMet = false;
        // Para região, o jogador precisa estar na região no momento do avanço do ano (ex: descansando na floresta)
        if (conditions.regionId && gameState.currentRegionId !== conditions.regionId) conditionsMet = false;

        if (conditions.attributes) {
            for (const attr in conditions.attributes) {
                if (gameState.attributes[attr] < conditions.attributes[attr]) {
                    conditionsMet = false;
                    break;
                }
            }
        }

        if (conditionsMet) {
            // Desbloqueia o NPC
            const newNpc = JSON.parse(JSON.stringify(npc));
            newNpc.unlocked = true;
            gameState.relationships[npc.id] = newNpc;
            logLifeEvent(`Você conheceu uma nova pessoa: ${npc.name}.`);
        }
    });
}

// --- LÓGICA DE GERAÇÃO PROCEDURAL ---
function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateProceduralNpc(parents = null) {
    if (parents) {
        const [p1, p2] = parents;
        const lastName = p1.name.split(' ')[1] || p2.name.split(' ')[1];
        const firstName = getRandomElement(allGameData.npc_templates[0].firstNames); // Usa nomes genéricos
        const fullName = `${firstName} ${lastName}`;
        const newNpc = {
            id: `proc_child_${gameState.age}_${Date.now()}`,
            name: fullName,
            description: `Filho(a) de ${p1.name} e ${p2.name}.`,
            age: 0,
            maxAge: getRandomNumber(80, 100),
            initialRelationship: 0,
            mood: 'Neutro',
            alive: true,
            unlocked: true,
            lifeEvents: [{ age: 0, text: `nasceu de ${p1.name} e ${p2.name}.` }],
            isProcedural: true,
            ambition: getRandomElement(['power', 'knowledge', 'wealth', 'connection']),
            attributes: {
                body: Math.floor((p1.attributes.body + p2.attributes.body) / 2) + getRandomNumber(-2, 2),
                mind: Math.floor((p1.attributes.mind + p2.attributes.mind) / 2) + getRandomNumber(-2, 2),
                soul: Math.floor((p1.attributes.soul + p2.attributes.soul) / 2) + getRandomNumber(-2, 2),
                luck: Math.floor((p1.attributes.luck + p2.attributes.luck) / 2) + getRandomNumber(-2, 2),
            },
            cultivation: { realmIndex: 0, subRealmIndex: 0, qi: 0 },
            relationships: {},
            socialStatus: "solteiro",
            partnerId: null,
            childrenIds: [],
            parentIds: [p1.id, p2.id]
        };
        return newNpc;
    } else {
        const template = getRandomElement(allGameData.npc_templates);
        const firstName = getRandomElement(template.firstNames);
        const lastName = getRandomElement(template.lastNames);
        const fullName = `${firstName} ${lastName}`;

        const newNpc = {
            id: `proc_${gameState.age}_${Date.now()}`,
            name: fullName,
            description: template.description.replace('[NOME]', fullName),
            age: getRandomNumber(template.ageRange[0], template.ageRange[1]),
            maxAge: getRandomNumber(template.maxAgeRange[0], template.maxAgeRange[1]),
            initialRelationship: getRandomNumber(template.relationshipRange[0], template.relationshipRange[1]),
            mood: getRandomElement(template.moods),
            alive: true,
            unlocked: true,
            lifeEvents: [],
            isProcedural: true,
            // Adiciona estrutura completa para consistência
            ambition: getRandomElement(['power', 'knowledge', 'wealth', 'connection']),
            attributes: { body: 10, mind: 10, soul: 10, luck: 5 },
            cultivation: { realmIndex: 0, subRealmIndex: 0, qi: 0 },
            relationships: {},
            socialStatus: "solteiro",
            partnerId: null,
            childrenIds: []
        };
        return newNpc;
    }
}


function checkWorldEvents() {
    if (!allGameData.world_events) return [];

    const triggeredWorldEvents = [];
    allGameData.world_events.forEach(worldEvent => {
        const trigger = worldEvent.trigger;
        if (trigger.type === 'recurring_year') {
            if ((gameState.age - (trigger.offset || 0)) % trigger.interval === 0 && gameState.age >= (trigger.offset || 0)) {
                // Add all sub-events from this world event to the pool
                triggeredWorldEvents.push(...worldEvent.events);
            }
        }
    });
    return triggeredWorldEvents;
}

function findAndShowEvent(lastViewId = 'map') {
    let allPossibleEvents = [...(allGameData.events || []), ...(allGameData.random_events || []), ...(allGameData.quest_whispering_blade || []), ...(allGameData.quest_blood_cult || [])];

    // Check for and add any triggered world events
    const worldEvents = checkWorldEvents();
    allPossibleEvents.push(...worldEvents);

    const possibleEvents = allPossibleEvents.filter(event => {
        if (event.id && gameState.triggeredEvents.includes(event.id)) return false;
        if (!checkEventConditions(event.conditions)) return false;
        return true;
    });

    if (possibleEvents.length > 0) {
        const eventToShow = selectEvent(possibleEvents);
        showEvent(eventToShow, lastViewId);
    } else {
        showView(lastViewId);
    }
}

export function advanceMonth(actionType = 'rest') {
    if (combatState) { return; }

    const activeViewElement = document.querySelector('.view-container.active');
    const lastViewId = activeViewElement ? activeViewElement.id.replace('-view', '') : 'map';

    gameState.month++;
    const isNewYear = gameState.month % 12 === 0;

    if (isNewYear) {
        gameState.age++;
        // Simulação de NPCs e geração procedural sempre acontecem no ano novo
        simulateNpcLife();
    }
    checkNpcUnlocks();
    checkNpcReactions();
    checkTutorials();

    // Lógica de Família (Casamento e Filhos)
    // Reset child dev flag each year
    gameState.storyFlags.has_child_between_6_and_12 = false;
    gameState.storyFlags.has_child_between_14_and_16 = false;
    delete gameState.storyFlags.active_child_id;

    if (gameState.spouseId && !gameState.storyFlags.playerIsHeir) { // Don't have children if you *are* the heir
        const spouse = gameState.relationships[gameState.spouseId];
        if (spouse && spouse.alive) {
            // Check for child development events
            const eligibleChildrenDev = gameState.children.map(id => gameState.relationships[id]).filter(c => c && c.alive && c.age >= 6 && c.age <= 12);
            if (eligibleChildrenDev.length > 0) {
                gameState.storyFlags.has_child_between_6_and_12 = true;
                gameState.storyFlags.active_child_id = eligibleChildrenDev[0].id;
            }

            const eligibleChildrenSect = gameState.children.map(id => gameState.relationships[id]).filter(c => c && c.alive && c.age >= 14 && c.age <= 16);
            if (eligibleChildrenSect.length > 0) {
                gameState.storyFlags.has_child_between_14_and_16 = true;
                gameState.storyFlags.active_child_id_sect = eligibleChildrenSect[0].id;
            }
            // Lógica de Bônus do Cônjuge
            const spouseHighestAttr = Object.keys(spouse.attributes).reduce((a, b) => spouse.attributes[a] > spouse.attributes[b] ? a : b);
            switch (spouseHighestAttr) {
                case 'body':
                    applyEffects({ attributes: { maxHealth: 1 } });
                    break;
                case 'mind':
                    applyEffects({ cultivation: { qi: 5 } });
                    break;
                case 'soul':
                    applyEffects({ attributes: { soul: 0.1 } }); // Pequeno ganho contínuo
                    break;
            }

            if (Math.random() < allGameData.config.chances.birth) {
                const playerAsNpc = { id: 'player', name: 'Você', attributes: gameState.attributes };
                const child = generateProceduralNpc([playerAsNpc, spouse]);

                // Lógica de Herança de Talento
                if (gameState.unlockedTalents.length > 0) {
                    const inheritedTalent = getRandomElement(gameState.unlockedTalents);
                    child.inheritedTalents = [inheritedTalent];
                    const talentData = allGameData.talents.find(t => t.id === inheritedTalent);
                    logLifeEvent(`Você e ${spouse.name} tiveram um(a) filho(a), ${child.name}, que herdou o talento: ${talentData.name}!`);
                } else {
                    logLifeEvent(`Você e ${spouse.name} tiveram um(a) filho(a): ${child.name}.`);
                }

                gameState.relationships[child.id] = child;
                gameState.children.push(child.id);
            }
        }
    }

    if (Math.random() < allGameData.config.chances.proceduralNpcSpawn) {
        const newNpc = generateProceduralNpc();
        gameState.relationships[newNpc.id] = newNpc;
        logLifeEvent(`Você conheceu uma nova pessoa: ${newNpc.name}.`);
    }

    if (actionType === 'meditate') {
        logLifeEvent("Você passou o mês em meditação isolada, aprofundando sua conexão com o Dao.");
        // Meditation is now more effective per unit of time and grants Dao Comprehension
        applyEffects({ cultivation: { qi: Math.ceil(allGameData.config.rewards.meditationQi / 4), daoComprehension: 0.5 } });
        showView('map'); // Volta para o mapa
    } else if (actionType === 'train_manor') {
        const bodyGain = (1 + (gameState.manor.sparringGroundLevel * 0.5)) / 12;
        logLifeEvent(`Você passou o mês treinando em sua mansão.`);
        applyEffects({ attributes: { body: bodyGain } });
        showView('manor'); // Return to the manor view
    } else { // Ação padrão 'rest'
        gameState.attributes.energy = gameState.attributes.maxEnergy;
        findAndShowEvent(lastViewId); // Tenta encontrar um evento para o jogador
    }

    // Lógica de Perda de Saúde por Idade (só checa no ano novo)
    if (isNewYear) {
        const currentRealmIndex = gameState.cultivation.realmIndex;
        let naturalDeclineAge = allGameData.config.aging.declineAge.mortal; // Idade base para mortais
        if (currentRealmIndex === 1) naturalDeclineAge = allGameData.config.aging.declineAge.qiCondensation; // Condensação de Qi
        else if (currentRealmIndex >= 2) naturalDeclineAge = allGameData.config.aging.declineAge.foundationEstablishment; // Estabelecimento de Fundação e acima

        if (gameState.age > naturalDeclineAge) {
            const agePenalty = Math.floor((gameState.age - naturalDeclineAge) / allGameData.config.aging.penaltyDivisor);
            applyEffects({ attributes: { health: -(allGameData.config.aging.basePenalty + agePenalty) } });
        }
    }

    if (gameState.attributes.health <= 0) {
        showDeathScreen();
        return;
    }

    // Lógica de cultivo
    let qiGain = (gameState.inventory.includes("basic_breathing_technique")
        ? allGameData.config.rewards.cultivationQiWithTechnique
        : allGameData.config.rewards.cultivationQiBase) / 12;

    // Add manor bonus
    if (gameState.manor.owned && gameState.manor.spiritGatheringFormationLevel > 0) {
        qiGain += (gameState.manor.spiritGatheringFormationLevel * 10) / 12; // Bonus mensal
    }

    // Add sect skill bonus
    if (gameState.sect.unlockedSkills.includes('intensive_qi_gathering')) {
        qiGain += 2; // From skill
    }

    gameState.cultivation.qi += qiGain;

    // Add sect leader bonus (monthly)
    if (gameState.storyFlags.isSectLeader) {
        applyEffects({ sect: { contribution: Math.ceil(50 / 12), favor: Math.ceil(5 / 12) } });
        if(isNewYear) logLifeEvent("Como Mestre da Seita, você continua a administrar os recursos.");
    }

    // Sect Mission Timer
    if (gameState.sect.missionTimer > 0) {
        gameState.sect.missionTimer--;
        if (gameState.sect.missionTimer === 0) {
            // Resolve mission
            const successChance = 0.5 + (gameState.sect.discipleCount * 0.01);
            if (Math.random() < successChance) {
                const moneyGained = Math.floor(Math.random() * 100) + 50;
                applyEffects({ resources: { money: moneyGained } });
                logLifeEvent(`Seus discípulos retornaram com sucesso de sua missão, trazendo ${moneyGained} moedas para o tesouro.`);
            } else {
                logLifeEvent("Seus discípulos retornaram de mãos vazias de sua missão.");
            }
        }
    }

    const currentRealm = cultivationRealms[gameState.cultivation.realmIndex];
    const subRealmThreshold1 = Math.floor(currentRealm.qiMax / 3);
    const subRealmThreshold2 = Math.floor((currentRealm.qiMax * 2) / 3);
    const oldSubRealm = gameState.cultivation.subRealmIndex;

    if (gameState.cultivation.subRealmIndex < 2 && gameState.cultivation.qi >= subRealmThreshold2) {
        gameState.cultivation.subRealmIndex = 2;
    } else if (gameState.cultivation.subRealmIndex < 1 && gameState.cultivation.qi >= subRealmThreshold1) {
        gameState.cultivation.subRealmIndex = 1;
    }

    if (oldSubRealm !== gameState.cultivation.subRealmIndex) {
        const subRealmName = currentRealm.subRealms[gameState.cultivation.subRealmIndex];
        logLifeEvent(`Atingiu ${currentRealm.name} - ${subRealmName}.`);
        applyEffects({ attributes: { health: allGameData.config.rewards.subRealmBreakthroughHealth, maxHealth: allGameData.config.rewards.subRealmBreakthroughHealth } });
    }

    // Verifica se um avanço de reino está pronto
    if (gameState.cultivation.qi >= currentRealm.qiMax) {
        gameState.cultivation.qi = currentRealm.qiMax;
        triggerBreakthroughEvent();
    }

    updateUI();
    saveGame();
    // A visão já é tratada por findAndShowEvent ou triggerBreakthroughEvent
}

function checkTutorials() {
    if (!allGameData.tutorials) return;

    for (const tutorial of allGameData.tutorials) {
        if (gameState.shownTutorials.includes(tutorial.id)) continue;

        let triggerMet = false;
        const trigger = tutorial.trigger;

        if (trigger.storyFlags) {
            const flag = Object.keys(trigger.storyFlags)[0];
            const condition = trigger.storyFlags[flag];
            if (flag.includes('.')) {
                const parts = flag.split('.');
                if (gameState[parts[0]][parts[1]] === condition) triggerMet = true;
            } else {
                if (gameState.storyFlags[flag] === condition) triggerMet = true;
            }
        } else if (trigger['sect.favor']) {
            if (gameState.sect.favor > trigger['sect.favor'].greaterThan) triggerMet = true;
        } else if (trigger.children) {
            if (gameState.children.length > trigger.children.length_greaterThan) triggerMet = true;
        }

        if (triggerMet) {
            showTutorial(tutorial);
            gameState.shownTutorials.push(tutorial.id);
            break; // Mostra apenas um tutorial por vez para não sobrecarregar
        }
    }
}

function checkNpcReactions() {
    if (gameState.storyFlags.justLeveledUpRealm) {
        const newRealm = cultivationRealms[gameState.cultivation.realmIndex];
        logLifeEvent(`Sua ascensão para o reino ${newRealm.name} não passou despercebida.`);
        for (const npcId in gameState.relationships) {
            const npc = gameState.relationships[npcId];
            if (npc.alive) {
                if (npc.initialRelationship > 30) logLifeEvent(`${npc.name} envia seus parabéns por seu incrível avanço.`);
                else if (npc.initialRelationship < -30 || npc.isRival) logLifeEvent(`Você sente o olhar invejoso de ${npc.name} sobre você.`);
            }
        }
        delete gameState.storyFlags.justLeveledUpRealm;
    }

    if (gameState.storyFlags.justPromoted) {
        const sect = allGameData.sects.find(s => s.id === gameState.sect.id);
        const newRank = sect.ranks[gameState.sect.rankIndex];
        logLifeEvent(`Sua promoção para ${newRank} foi notada dentro da seita.`);
        for (const npcId in gameState.relationships) {
            const npc = gameState.relationships[npcId];
            if (npc.alive && npc.sectId === gameState.sect.id) { // Reação apenas de membros da mesma seita
                if (npc.isRival) {
                    logLifeEvent(`Seu rival, ${npc.name}, range os dentes de inveja.`);
                    npc.initialRelationship -= 10;
                } else if (npc.initialRelationship > 20) {
                    logLifeEvent(`${npc.name} o parabeniza por sua dedicação à seita.`);
                    npc.initialRelationship += 5;
                }
            }
        }
        delete gameState.storyFlags.justPromoted;
    }

    if (gameState.storyFlags.tournament_winner) {
        logLifeEvent(`Sua vitória no Grande Torneio o tornou uma lenda!`);
        for (const npcId in gameState.relationships) {
            const npc = gameState.relationships[npcId];
            if (npc.alive) {
                if (npc.isRival) {
                    logLifeEvent(`${npc.name} jura que um dia o superará.`);
                    npc.initialRelationship -= 15;
                } else if (npc.initialRelationship > 50) {
                    logLifeEvent(`${npc.name} celebra sua vitória com grande alegria.`);
                    npc.initialRelationship += 10;
                } else {
                    logLifeEvent(`${npc.name} agora o vê com um novo nível de respeito.`);
                    npc.initialRelationship += 5;
                }
            }
        }
        delete gameState.storyFlags.tournament_winner;
    }
}
