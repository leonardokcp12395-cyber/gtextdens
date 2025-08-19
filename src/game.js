import { gameState, allGameData, setGameData, cultivationRealms, combatState, saveGame } from './state.js';
import { elements, updateUI, showDeathScreen, setupTabs, showView, showCombatUI, showSectActions } from './ui.js';
import { applyEffects, handleSpecialEffects, logLifeEvent, logAction, startCombat } from './handlers.js';

const TRAVEL_ENERGY_COST = 10;

/**
 * Inicializa o jogo, configurando o estado inicial e os event listeners.
 */
export function initializeGame(gameData) {
    setGameData(gameData);
    setupTabs();
    elements.nextYearBtn.addEventListener('click', advanceYear);
    elements.sectActionsBtn.addEventListener('click', showSectActions);
    showView('map');
}

/**
 * Ação principal de viajar para uma nova região.
 * @param {string} regionId - O ID da região para a qual viajar.
 */
export function travelToRegion(regionId) {
    if (gameState.attributes.energy < TRAVEL_ENERGY_COST) {
        // Opcional: Adicionar um feedback visual de que não há energia.
        // Por enquanto, os botões de região não serão renderizados se não houver energia.
        return;
    }

    gameState.attributes.energy -= TRAVEL_ENERGY_COST;
    gameState.currentRegionId = regionId;
    updateUI(); // Atualiza a UI para refletir o gasto de energia

    // Lógica para encontrar um evento na região
    // TODO: Esta lógica precisa ser melhorada para não repetir eventos.
    const region = allGameData.regions.find(r => r.id === regionId);
    if (!region || !region.eventIds || region.eventIds.length === 0) {
        showView('map');
        return;
    }

    // Simplificação: por enquanto, pega o primeiro evento da lista que corresponde à idade atual.
    // Isso mantém a progressão da história principal.
    const eventId = region.eventIds.find(id => id === `age_${gameState.age}`);
    const event = allGameData.events.find(e => e.age === gameState.age); // Assumindo que o ID do evento corresponde à idade

    if (event) {
        showEvent(event);
    } else {
        // Lógica de evento aleatório se nenhum evento de idade for encontrado
        const randomEvent = allGameData.random_events[Math.floor(Math.random() * allGameData.random_events.length)];
        showEvent(randomEvent);
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
    let meetsRequirements = true;
    let requirementsText = "";
    for (const attr in requirements) {
        if (gameState.attributes[attr] < requirements[attr]) {
            meetsRequirements = false;
            requirementsText += ` ${attr}: ${requirements[attr]} (Você tem ${gameState.attributes[attr]}),`;
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
        const successChance = (meetsRequirements ? 0.7 : 0.1) + (gameState.attributes.luck * 0.01);
        if (Math.random() < successChance) {
            gameState.cultivation.realmIndex++;
            gameState.cultivation.subRealmIndex = 0;
            gameState.cultivation.qi = 0;
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
export function advanceYear() {
    if (combatState) { return; }

    // Restaura a energia e avança a idade
    gameState.attributes.energy = gameState.attributes.maxEnergy;
    gameState.age++;

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
