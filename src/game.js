import { gameState, allGameData, setGameData, cultivationRealms, combatState, saveGame, getEffectiveAttributes } from './state.js';
import { elements, updateUI, showDeathScreen, setupTabs, showView, showCombatUI, showSectActions, showAlchemyView, showHubView } from './ui.js';
import { applyEffects, handleSpecialEffects, logLifeEvent, logAction, startCombat } from './handlers.js';

const TRAVEL_ENERGY_COST = 10;

/**
 * Inicializa o jogo, configurando o estado inicial e os event listeners.
 */
export function initializeGame(gameData) {
    setGameData(gameData);
    setupTabs();
    elements.nextYearBtn.addEventListener('click', () => advanceYear('rest'));
    elements.meditateBtn.addEventListener('click', () => advanceYear('meditate'));
    elements.sectActionsBtn.addEventListener('click', showSectActions);
    elements.alchemyBtn.addEventListener('click', showAlchemyView);
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
            // Checagem de existência vs. checagem de valor
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
    return met;
}


/**
 * Ação principal de viajar para uma nova região e encontrar um evento.
 * @param {string} regionId - O ID da região para a qual viajar.
 */
export function travelToRegion(regionId) {
    if (gameState.attributes.energy < TRAVEL_ENERGY_COST) {
        return;
    }
    gameState.attributes.energy -= TRAVEL_ENERGY_COST;
    gameState.currentRegionId = regionId;
    updateUI();

    const region = allGameData.regions.find(r => r.id === regionId);
    if (!region) return;

    if (region.type === 'hub') {
        showHubView(region);
        return;
    }

    // Lógica de evento para regiões normais
    const allEvents = [...(allGameData.events || []), ...(allGameData.random_events || [])];

    const possibleEvents = allEvents.filter(event => {
        // 1. O evento já foi acionado?
        if (gameState.triggeredEvents.includes(event.id)) return false;
        // 2. As condições são atendidas?
        if (!checkEventConditions(event.conditions)) return false;
        // 3. O evento pertence a esta região? (Opcional, por enquanto todos são globais)
        // Adicionar lógica de regionId no evento se necessário
        return true;
    });

    if (possibleEvents.length > 0) {
        // TODO: Adicionar sistema de prioridade de eventos
        const eventToShow = possibleEvents[0];
        showEvent(eventToShow);
    } else {
        // Nenhum evento encontrado, apenas mostra o mapa
        showView('map');
    }
}


/**
 * Mostra um evento na tela, com seu texto e opções.
 * @param {object} event - O objeto do evento a ser exibido.
 */
export function showEvent(event) {
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
                // Após o evento, volta para o mapa
                const backToMapButton = document.createElement('button');
                backToMapButton.textContent = "Voltar ao Mapa";
                backToMapButton.onclick = () => {
                    showView('map');
                    updateUI();
                };
                elements.choicesContainer.appendChild(backToMapButton);
            }
            saveGame();
        };
        elements.choicesContainer.appendChild(button);
    });
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
        if (effectiveAttributes[attr] < requirements[attr]) {
            meetsRequirements = false;
            requirementsText += ` ${attr}: ${requirements[attr]} (Você tem ${effectiveAttributes[attr]}),`;
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
             const successChance = (meetsRequirements ? 0.7 : 0.1) + (effectiveAttributes.luck * 0.01);
            if (Math.random() < successChance) {
                applyEffects({ cultivation: { realmIndex: 1, subRealmIndex: 0, qi: -gameState.cultivation.qi }});
                logLifeEvent(`Avançou para o reino ${nextRealm.name}.`);
                elements.eventContent.innerHTML = `<p>Parabéns! Você avançou para o reino ${nextRealm.name}!</p>`;
            } else {
                gameState.cultivation.qi = Math.floor(gameState.cultivation.qi * 0.8);
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
function findAndShowEvent() {
    const allEvents = [...(allGameData.events || []), ...(allG...
        const backToMapButton = document.createElement('button');
        backToMapButton.textContent = "Voltar ao Mapa";
        backToMapButton.onclick = () => {
            showView('map');
            updateUI();
        };
        elements.choicesContainer.innerHTML = '';
        elements.choicesContainer.appendChild(backToMapButton);
        saveGame();
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
                const qiGain = 5 + Math.floor(npc.attributes.soul / 5);
                npc.cultivation.qi += qiGain;

                const currentNpcRealm = cultivationRealms[npc.cultivation.realmIndex];
                if (npc.cultivation.qi >= currentNpcRealm.qiMax) {
                    const breakthroughChance = 0.5 + (npc.attributes.luck * 0.01);
                    if (Math.random() < breakthroughChance) {
                        npc.cultivation.realmIndex++;
                        npc.cultivation.qi = 0;
                        const newRealm = cultivationRealms[npc.cultivation.realmIndex];
                        npc.lifeEvents.push({ age: npc.age, text: `avançou para o reino ${newRealm.name}!` });
                    } else {
                        npc.cultivation.qi = Math.floor(npc.cultivation.qi * 0.8);
                        npc.lifeEvents.push({ age: npc.age, text: `falhou em sua tentativa de avanço de reino.` });
                    }
                }
            }

            // Lógica de eventos de vida
            for (const event of allGameData.npc_life_events) {
                let currentChance = event.chance;
                if (event.ambition_affinity && event.ambition_affinity === npc.ambition) {
                    currentChance *= 2; // Dobra a chance se a ambição for compatível
                }

                if (Math.random() < currentChance) {
                    if (event.effects.mood) {
                        npc.mood = event.effects.mood;
                    }
                    npc.lifeEvents.push({ age: npc.age, text: event.text });
                    break;
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

            if (Math.random() < 0.1) { // 10% de chance de interação por ano
                let relChange = (Math.random() - 0.5) * 4; // -2 a +2
                if (npc1.ambition === npc2.ambition && npc1.ambition !== 'power') {
                    relChange += 5; // Interesses em comum
                }
                if (npc1.ambition === 'power' && npc2.ambition === 'power') {
                    relChange -= 5; // Rivais de poder
                }

                npc1.relationships[npc2.id] = (npc1.relationships[npc2.id] || 0) + relChange;
                npc2.relationships[npc1.id] = (npc2.relationships[npc1.id] || 0) + relChange;

                // Lógica de Casamento
                if (npc1.socialStatus === 'solteiro' && npc2.socialStatus === 'solteiro' && npc1.relationships[npc2.id] > 75 && npc2.relationships[npc1.id] > 75) {
                    if (Math.random() < 0.2) { // 20% de chance de casamento por ano se as condições forem atendidas
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
                    if (Math.random() < 0.05) { // 5% de chance de ter um filho por ano
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

function generateProceduralNpc(parents = null) {
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


function findAndShowEvent() {
    const allEvents = [...(allGameData.events || []), ...(allGameData.random_events || [])];
    const possibleEvents = allEvents.filter(event => {
        if (gameState.triggeredEvents.includes(event.id)) return false;
        if (!checkEventConditions(event.conditions)) return false;
        return true;
    });

    if (possibleEvents.length > 0) {
        const eventToShow = possibleEvents[0];
        showEvent(eventToShow);
    } else {
        showView('map');
    }
}

export function advanceYear(actionType = 'rest') {
    if (combatState) { return; }

    gameState.age++;

    // Simulação de NPCs e geração procedural sempre acontecem
    simulateNpcLife();
    checkNpcUnlocks();
    if (Math.random() < 0.25) {
        const newNpc = generateProceduralNpc();
        gameState.relationships[newNpc.id] = newNpc;
        logLifeEvent(`Você conheceu uma nova pessoa: ${newNpc.name}.`);
    }

    if (actionType === 'meditate') {
        logLifeEvent("Você passou o ano em meditação isolada.");
        applyEffects({ cultivation: { qi: 50 } }); // Ganho de Qi significativamente maior
        showView('map'); // Volta para o mapa
    } else { // Ação padrão 'rest'
        gameState.attributes.energy = gameState.attributes.maxEnergy;
        findAndShowEvent(); // Tenta encontrar um evento para o jogador
    }

    // Lógica de Perda de Saúde por Idade (baseado no reino)
    const currentRealmIndex = gameState.cultivation.realmIndex;
    let naturalDeclineAge = 100; // Idade base para mortais
    if (currentRealmIndex === 1) naturalDeclineAge = 150; // Condensação de Qi
    else if (currentRealmIndex >= 2) naturalDeclineAge = 250; // Estabelecimento de Fundação e acima

    if (gameState.age > naturalDeclineAge) {
        const agePenalty = Math.floor((gameState.age - naturalDeclineAge) / 10);
        applyEffects({ attributes: { health: -(1 + agePenalty) } });
    }

    if (gameState.attributes.health <= 0) {
        showDeathScreen();
        return;
    }

    // Lógica de cultivo
    if (gameState.inventory.includes("basic_breathing_technique")) {
        gameState.cultivation.qi += 10;
    } else {
        gameState.cultivation.qi += 5;
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
        applyEffects({ attributes: { health: 10, maxHealth: 10 } });
    }

    // Verifica se um avanço de reino está pronto
    if (gameState.cultivation.qi >= currentRealm.qiMax) {
        gameState.cultivation.qi = currentRealm.qiMax;
        triggerBreakthroughEvent();
    }

    updateUI();
    saveGame();
    showView('map'); // Sempre volta para o mapa após descansar
}
