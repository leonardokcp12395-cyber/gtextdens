import { gameState, allGameData, setGameData, cultivationRealms, combatState, saveGame } from './state.js';
import { elements, updateUI, showDeathScreen, setupTabs } from './ui.js';
import { applyEffects, handleSpecialEffects, logLifeEvent, showSectActions, logAction } from './handlers.js';

const ACTION_ENERGY_COST = 20;

/**
 * Inicializa o jogo, configurando o estado inicial e os event listeners.
 * @param {object} gameData - Os dados completos do jogo carregados dos JSONs.
 */
export function initializeGame(gameData) {
    setGameData(gameData);
    // A inicialização do gameState já foi feita no main, mas precisamos garantir a UI inicial.
    updateUI();
    setupTabs();
    elements.nextYearBtn.addEventListener('click', advanceYear);
    elements.sectActionsBtn.addEventListener('click', showSectActions);
}

/**
 * Mostra um evento na tela, com seu texto e opções.
 * @param {object} event - O objeto do evento a ser exibido.
 */
export function showEvent(event) {
    elements.eventContent.innerHTML = `<p>${event.text}</p>`;
    elements.choicesContainer.innerHTML = '';

    const hasEnoughEnergy = gameState.attributes.energy >= ACTION_ENERGY_COST;

    event.choices.forEach(choice => {
        const button = document.createElement('button');
        button.textContent = choice.text;

        if (!hasEnoughEnergy) {
            button.disabled = true;
            button.textContent += ` (Requer ${ACTION_ENERGY_COST} de Energia)`;
        }

        button.onclick = () => {
            // Deduz energia
            gameState.attributes.energy -= ACTION_ENERGY_COST;
            if (gameState.attributes.energy < 0) gameState.attributes.energy = 0;

            let success = true;
            if (choice.effects.special) {
                success = handleSpecialEffects(choice.effects.special);
            } else {
                applyEffects(choice.effects);
            }

            if (gameState.combat) { // O combate é tratado no seu próprio fluxo
                return;
            }

            let resultText;
            if (choice.effects.special) {
                const key = success ? choice.successKey : choice.failureKey;
                resultText = allGameData.strings[key] || "Resultado não encontrado.";
            } else {
                resultText = allGameData.strings[choice.resultKey] || "Resultado não encontrado.";
            }
            elements.eventContent.innerHTML = `<p>${resultText}</p>`;
            elements.choicesContainer.innerHTML = '';

            logAction({
                eventText: event.text,
                choiceText: choice.text,
                resultText: resultText
            });

            if (gameState.attributes.health <= 0) {
                showDeathScreen();
            } else {
                elements.nextYearBtn.style.display = 'block';
                updateUI();
            }
            saveGame();
        };
        elements.choicesContainer.appendChild(button);
    });
    elements.nextYearBtn.style.display = 'none';
}

/**
 * Dispara o evento de avanço de reino de cultivo.
 */
function triggerBreakthroughEvent() {
    const currentRealmIndex = gameState.cultivation.realmIndex;
    const nextRealm = cultivationRealms[currentRealmIndex + 1];
    if (!nextRealm) {
        elements.eventContent.innerHTML = "<p>Você atingiu o pico do mundo mortal. O caminho à frente está velado em mistério.</p>";
        return;
    }

    // Verifica se o jogador cumpre os requisitos
    const requirements = nextRealm.breakthroughRequirements || {};
    let meetsRequirements = true;
    let requirementsText = "";
    for (const attr in requirements) {
        if (gameState.attributes[attr] < requirements[attr]) {
            meetsRequirements = false;
            requirementsText += ` ${attr}: ${requirements[attr]} (Você tem ${gameState.attributes[attr]}),`;
        }
    }
    requirementsText = requirementsText.slice(0, -1); // Remove a última vírgula

    let eventHTML = `<p>Você acumulou Qi suficiente e sente a barreira para o próximo reino: ${nextRealm.name}.</p>`;
    if (!meetsRequirements) {
        eventHTML += `<p style="color: #d63031;">No entanto, você sente que sua base é instável. Requisitos não cumpridos:${requirementsText}.</p>`;
    }
    elements.eventContent.innerHTML = eventHTML;
    elements.choicesContainer.innerHTML = '';

    // Lógica dos botões de escolha
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
            elements.eventContent.innerHTML = `<p>Parabéns! Após uma meditação perigosa, você rompeu seus limites e avançou para o reino ${nextRealm.name}!</p>`;
        } else {
            gameState.cultivation.qi = Math.floor(gameState.cultivation.qi * 0.8);
            elements.eventContent.innerHTML = `<p>A tentativa falhou! Seu Qi se dispersa violentamente e você sofre um revés.</p>`;
        }
        elements.choicesContainer.innerHTML = '';
        elements.nextYearBtn.style.display = 'block';
        updateUI();
        saveGame();
    };
    elements.choicesContainer.appendChild(attemptButton);

    // Botão de esperar
    const waitButton = document.createElement('button');
    waitButton.textContent = "Esperar e acumular mais base.";
    waitButton.onclick = () => {
        elements.eventContent.innerHTML = "<p>Você decide esperar, sentindo que uma base mais sólida aumentará suas chances.</p>";
        elements.choicesContainer.innerHTML = '';
        elements.nextYearBtn.style.display = 'block';
        updateUI();
        saveGame();
    };
    elements.choicesContainer.appendChild(waitButton);

    elements.nextYearBtn.style.display = 'none';
}

/**
 * Avança um ano no jogo, processando eventos e o passar do tempo.
 */
export function advanceYear() {
    if (combatState) {
        // A lógica de combate agora vive em handlers.js, mas a UI pode precisar ser chamada daqui.
        // showCombatUI(); // Esta chamada está em takeCombatTurn, o que é correto.
        return;
    }

  // Restaura a energia ao avançar o ano
  gameState.attributes.energy = gameState.attributes.maxEnergy;

    gameState.age++;
    if (gameState.age > 50) gameState.attributes.health--;

    if (gameState.attributes.health <= 0) {
        showDeathScreen();
        return;
    }

    if (gameState.inventory.includes("basic_breathing_technique")) {
        gameState.cultivation.qi += 10;
    } else {
        gameState.cultivation.qi += 5;
    }

    const currentRealm = cultivationRealms[gameState.cultivation.realmIndex];

    // Lógica de avanço de sub-reino
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
        applyEffects({ attributes: { health: 10, maxHealth: 10 } }); // Bônus por avançar
    }

    if (gameState.cultivation.qi >= currentRealm.qiMax) {
        gameState.cultivation.qi = currentRealm.qiMax;
        triggerBreakthroughEvent();
        updateUI();
        saveGame();
        return;
    }

    // Lógica de Evento Aleatório (25% de chance)
    if (Math.random() < 0.25 && allGameData.random_events && allGameData.random_events.length > 0) {
        const randomEvent = allGameData.random_events[Math.floor(Math.random() * allGameData.random_events.length)];
        showEvent(randomEvent);
    } else {
        // Lógica de Evento por Idade (como antes)
        const eventsForAge = allGameData.events.filter(event => event.age === gameState.age);
        let currentEvent = eventsForAge.find(event => event.sectId === gameState.sect.id);
        if (!currentEvent) {
            currentEvent = eventsForAge.find(event => !event.sectId);
        }

        if (currentEvent) {
            showEvent(currentEvent);
        } else {
            elements.eventContent.innerHTML = `<p>Você passou um ano tranquilo meditando e treinando.</p>`;
            elements.nextYearBtn.style.display = 'block';
        }
    }
    updateUI();
    saveGame();
}
