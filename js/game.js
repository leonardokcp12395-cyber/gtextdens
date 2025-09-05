/**
 * Main game logic for "Jornada do Dao Imortal".
 * This script handles the game state, UI updates, event processing, and all core mechanics.
 * It is loaded after the HTML body, and all initialization is triggered by the DOMContentLoaded event.
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTS ---
    // Defines the permanent bonuses that can be purchased with Legacy Points on the end-game screen.
    const LEGACY_BONUSES = [
        { id: 'start_with_more_money', name: 'Herança Abastada', description: 'Comece sua próxima vida com 100 moedas extras.', cost: 100, type: 'resource', effects: { resources: { money: 100 } } },
        { id: 'start_with_stronger_body', name: 'Fundação Corporal Robusta', description: 'Sua linhagem tem corpos naturalmente fortes. Comece com +5 em Corpo.', cost: 200, type: 'attribute', effects: { attributes: { body: 5 } } },
        { id: 'start_with_sharper_mind', name: 'Mente Desperta', description: 'Sua alma reencarna com uma mente afiada. Comece com +5 em Mente.', cost: 200, type: 'attribute', effects: { attributes: { mind: 5 } } },
        { id: 'start_with_technique', name: 'Memória Muscular', description: 'Você retém o conhecimento de uma técnica básica. Comece com a Forma Básica da Espada.', cost: 400, type: 'technique', effects: { techniques: ['basic_sword_form'] } }
    ];

    // --- GLOBAL GAME STATE ---
    // These objects hold the entire state of the game and are manipulated by the game functions.
    let gameState = {};      // Current player, NPCs, resources, etc. Persisted in localStorage.
    let allGameData = {};    // All static data from JSON files (events, items, etc.). Loaded once at the start.
    let allStrings = {};     // All UI strings, dialogue results, etc. Loaded once at the start.
    let combatState = {};    // Temporary state for the current combat encounter.
    let gameLoopInterval = null;
    let combatLoopInterval = null; // Para controlar o ciclo de combate

    // --- UI ELEMENT CACHE ---
    // Caching all DOM element lookups for performance and easier access.
    const elements = {
        eventContent: document.getElementById('event-content'),
        choicesContainer: document.getElementById('choices-container'),
        combatScreen: document.getElementById('combat-screen'),
        playerName: document.getElementById('player-name'),
        age: document.getElementById('char-age'),
        actions: document.getElementById('char-actions'),
        body: document.getElementById('attr-body'),
        mind: document.getElementById('attr-mind'),
        cultivationPanel: document.getElementById('cultivation-panel'),
        realm: document.getElementById('cult-realm'),
        cultRootName: document.getElementById('cult-root-name'),
        cultRootGrade: document.getElementById('cult-root-grade'),
        cultivateBtn: document.getElementById('cultivate-btn'),
        level: document.getElementById('cult-level'),
        qi: document.getElementById('cult-qi'),
        maxQi: document.getElementById('cult-max-qi'),
        money: document.getElementById('res-money'),
        talentPoints: document.getElementById('talent-points'),
        contribution: document.getElementById('res-contribution'),
        spiritStones: document.getElementById('res-spirit-stones'),
        talentsBtn: document.getElementById('talents-btn'),
        mapContainer: document.getElementById('map-container'),
        exploreSectBtn: document.getElementById('explore-sect-btn'),
        exploreCityBtn: document.getElementById('explore-city-btn'),
        exploreWildsBtn: document.getElementById('explore-wilds-btn'),
        seclusionBtn: document.getElementById('seclusion-btn'),
        endTurnBtn: document.getElementById('end-turn-btn'),
        combatPlayerHp: document.getElementById('combat-player-hp'),
        combatEnemyName: document.getElementById('combat-enemy-name'),
        combatEnemyHp: document.getElementById('combat-enemy-hp'),
        combatLog: document.getElementById('combat-log'),
        combatControls: document.getElementById('combat-controls'),
        combatActions: document.getElementById('combat-actions'),
        relationshipsList: document.getElementById('relationships-list'),
        sectInfo: document.getElementById('sect-info'),
        sectName: document.getElementById('sect-name'),
        sectRank: document.getElementById('sect-rank'),
        sectBenefit: document.getElementById('sect-benefit'),
        sectContribution: document.getElementById('sect-contribution'),
        lifespan: document.getElementById('char-lifespan'),
        legacyScreen: document.getElementById('legacy-screen'),
        legacyPoints: document.getElementById('legacy-points'),
        legacyBonusesContainer: document.getElementById('legacy-bonuses-container'),
        startNewJourneyBtn: document.getElementById('start-new-journey-btn'),
        resetProgressBtn: document.getElementById('reset-progress-btn'),
        techniquesList: document.getElementById('techniques-list'),
        eventImage: document.getElementById('event-image'),
        lifeLogList: document.getElementById('life-log-list'),
        talentsScreen: document.getElementById('talents-screen'),
        talentsScreenPoints: document.getElementById('talents-screen-points'),
        talentsContainer: document.getElementById('talents-container'),
        closeTalentsBtn: document.getElementById('close-talents-btn'),
        worldEventStatus: document.getElementById('world-event-status'),
        worldEventName: document.getElementById('world-event-name'),
        worldEventDuration: document.getElementById('world-event-duration'),
        manageTechniquesBtn: document.getElementById('manage-techniques-btn'),
        techniquesScreen: document.getElementById('techniques-screen'),
        closeTechniquesBtn: document.getElementById('close-techniques-btn'),
        learnedTechniquesList: document.getElementById('learned-techniques-list'),
        equippedTechniquesList: document.getElementById('equipped-techniques-list'),
    };

// --- CHARACTER CREATION ---
// ADICIONE ESTA FUNÇÃO AO SEU ARQUIVO game.js

/**
 * Generates a new character object for the player or an NPC.
 * @param {string} id - A unique ID for the character (e.g., 'player', 'rival_1').
 * @param {string} gender - 'masculino' or 'feminino'.
 * @param {boolean} isPlayer - True if this is the main player character.
 * @returns {object} A complete character object.
 */
function generateCharacter(id, gender, isPlayer) {
    const firstName = getRandomElement(allGameData.nomes[gender]);
    const lastName = getRandomElement(allGameData.nomes.apelidos);

    const character = {
        id: id,
        name: `${firstName} ${lastName}`,
        gender: gender,
        age: 6,
        lifespan: 80, // Lifespan inicial
        attributes: {
            body: 10,
            mind: 10,
            luck: 1
        },
        personality: getRandomElement(allGameData.personalidades),
        combat: {
            maxHp: 100,
            hp: 100,
            attack: 10,
            defense: 5,
            speed: 10
        },
        sectId: null,
        techniques: [],
        cultivation: {
            realmId: 0,
            level: 1,
            qi: 0,
            maxQi: 100
        }
    };

    // O jogador começa com uma técnica básica
    if (isPlayer) {
        character.techniques.push('basic_sword_form');
        const tech = allGameData.techniques.find(t => t.id === 'basic_sword_form');
        if (tech && tech.effects) {
             // Aplica os efeitos da técnica inicial
             for (const stat in tech.effects.combat) {
                character.combat[stat] = (character.combat[stat] || 0) + tech.effects.combat[stat];
             }
        }
    }

    return character;
}

// --- UTILITY & CORE FUNCTIONS ---
// ADICIONE ESTE BLOCO INTEIRO AO SEU ARQUIVO game.js

/**
 * Processes text to replace placeholders like [PLAYER_NAME] with game state data.
 * @param {string} text - The input string.
 * @returns {string} The processed string.
 */
function processText(text) {
    if (!text) return '';
    let processedText = text.replace(/\[PLAYER_NAME\]/g, gameState.player.name);
    if (gameState.rivalId && gameState.npcs[gameState.rivalId]) {
        processedText = processedText.replace(/\[RIVAL\]/g, gameState.npcs[gameState.rivalId].name);
    }
    return processedText;
}

/**
 * Handles the meditate/breakthrough button click.
 */
function meditate() {
    // Se o Qi está no máximo, tenta um breakthrough
    if (gameState.cultivation.qi >= gameState.cultivation.maxQi) {
        const currentRealm = allGameData.realms[gameState.cultivation.realmId];
        const successChance = 0.8; // Chance base de sucesso

        if (Math.random() < successChance) {
            gameState.cultivation.level++;
            addLogMessage(allStrings.breakthrough_success, "milestone");

            // Verifica se avançou para um novo Reino
            if (gameState.cultivation.level > currentRealm.levels) {
                gameState.cultivation.realmId++;
                gameState.cultivation.level = 1;
                const newRealm = allGameData.realms[gameState.cultivation.realmId];
                gameState.player.lifespan += newRealm.lifespan_bonus;
                addLogMessage(`Você alcançou o Reino: ${newRealm.name}! Sua expectativa de vida aumentou!`, "milestone");
            }

            // Aplica bônus de atributos e recalcula o maxQi
            applyEffects({ attributes: currentRealm.attributeBonusOnBreakthrough });
            updateCultivationStats(); // <-- PONTO CRÍTICO DA CORREÇÃO!
            gameState.resources.talentPoints++; // Ganha um ponto de talento

        } else {
            gameState.cultivation.qi = Math.floor(gameState.cultivation.qi * 0.8); // Perde 20% do Qi
            addLogMessage(allStrings.breakthrough_failure, "notification");
        }
        gameState.cultivation.qi = 0; // Reseta o Qi após a tentativa

    } else {
        // Meditação normal
        const qiGained = 10 + Math.floor(gameState.player.attributes.mind / 5);
        gameState.cultivation.qi = Math.min(gameState.cultivation.qi + qiGained, gameState.cultivation.maxQi);
        addLogMessage(`Você meditou e ganhou ${qiGained} Qi.`, 'event');
    }
    updateUI();
    saveGameState();
}

/**
 * Recalculates cultivation stats like maxQi based on the current realm and level.
 */
function updateCultivationStats() {
    const realm = allGameData.realms[gameState.cultivation.realmId];
    if (!realm) return;

    // A fórmula é: Qi base do reino + (Qi adicional por nível * (nível atual - 1))
    const newMaxQi = realm.baseMaxQi + ((gameState.cultivation.level - 1) * realm.qiPerLevel);
    gameState.cultivation.maxQi = newMaxQi;
}

/**
 * Inicia o ciclo de jogo principal que lida com o cultivo passivo.
 */
function startCultivationLoop() {
    if (gameLoopInterval) clearInterval(gameLoopInterval); // Limpa qualquer ciclo antigo

    gameLoopInterval = setInterval(() => {
        if (gameState.isCultivator && gameState.cultivation.isCultivating) {
            const root = gameState.player.spiritualRoot;
            const realm = allGameData.realms[gameState.cultivation.realmId];

            // Qi ganho por segundo = (Eficiência da Raiz * Bónus do Reino (se houver))
            const qiPerSecond = (root.efficiency || 1.0) * (realm.qiBonus || 1.0);

            gameState.cultivation.qi = Math.min(gameState.cultivation.qi + qiPerSecond, gameState.cultivation.maxQi);

            // Atualiza a UI de forma menos frequente para melhor desempenho
            if (Math.random() < 0.2) { // Atualiza ~1 vez por 5 segundos
                 updateUI();
            }
        }
    }, 1000); // Executa a cada segundo
}

/**
 * Alterna o estado de cultivo (pausa/retoma).
 */
function toggleCultivation() {
    if (!gameState.isCultivator) return;
    gameState.cultivation.isCultivating = !gameState.cultivation.isCultivating;
    updateUI();
}


/**
 * Renders the talents screen with available talents.
 */
function showTalents() {
    elements.talentsContainer.innerHTML = '';
    elements.talentsScreenPoints.textContent = gameState.resources.talentPoints;

    allGameData.talents.forEach(talent => {
        const isPurchased = gameState.player.talents && gameState.player.talents.includes(talent.id);
        const canPurchase = gameState.resources.talentPoints >= talent.cost;
        const requirementsMet = talent.requirements.every(req => gameState.player.talents.includes(req));

        const talentDiv = document.createElement('div');
        talentDiv.className = 'talent-node'; // Você pode estilizar isso no CSS

        let reqText = talent.requirements.length > 0
            ? `<br><small>Requer: ${talent.requirements.map(r => allGameData.talents.find(t=>t.id===r).name).join(', ')}</small>`
            : '';

        talentDiv.innerHTML = `
            <h4>${talent.name} (${talent.cost} Pts)</h4>
            <p>${talent.description}${reqText}</p>
        `;

        const purchaseButton = document.createElement('button');
        if (isPurchased) {
            purchaseButton.textContent = 'Adquirido';
            purchaseButton.disabled = true;
        } else {
            purchaseButton.textContent = 'Adquirir';
            if (!canPurchase || !requirementsMet) {
                purchaseButton.disabled = true;
            }
        }

        purchaseButton.addEventListener('click', () => {
            if (gameState.resources.talentPoints >= talent.cost) {
                gameState.resources.talentPoints -= talent.cost;
                if (!gameState.player.talents) gameState.player.talents = [];
                gameState.player.talents.push(talent.id);
                applyEffects(talent.effects);
                showTalents(); // Re-renderiza a tela de talentos
                updateUI();
                saveGameState();
            }
        });

        talentDiv.appendChild(purchaseButton);
        elements.talentsContainer.appendChild(talentDiv);
    });
}

/**
 * Displays the special merchant's store interface.
 */
function showSpecialMerchantStore() {
    const specialItems = allGameData.items.filter(item => item.source === 'special_merchant');
    elements.eventContent.innerHTML = `<p>O mercador exibe seus tesouros. "Preços justos para mercadorias divinas," ele murmura.</p><p>Você tem ${gameState.resources.spirit_stones || 0} Pedras Espirituais.</p>`;
    elements.choicesContainer.innerHTML = ''; // Limpa as escolhas

    specialItems.forEach(item => {
        const button = document.createElement('button');
        button.innerHTML = `${item.name} - <b>${item.cost_spirit_stones} Pedras Espirituais</b><br><small>${item.description}</small>`;

        // Desabilita o botão se o jogador não puder pagar
        if ((gameState.resources.spirit_stones || 0) < item.cost_spirit_stones) {
            button.disabled = true;
        }

        button.addEventListener('click', () => {
            // Dupla verificação para garantir que o jogador ainda pode pagar
            if ((gameState.resources.spirit_stones || 0) >= item.cost_spirit_stones) {
                // Aplica os custos e efeitos
                gameState.resources.spirit_stones -= item.cost_spirit_stones;
                applyEffects(item.effects);
                addLogMessage(`Você comprou ${item.name}!`, 'reward');

                // Esconde a loja e retorna para um estado neutro
                elements.eventContent.innerHTML = `<p>Você guarda seu novo tesouro. O mercador sorri, satisfeito com a troca.</p>`;
                elements.choicesContainer.innerHTML = '';
                updateUI();
                saveGameState();
            }
        });
        elements.choicesContainer.appendChild(button);
    });

    // Adiciona um botão para sair da loja sem comprar nada
    const leaveButton = document.createElement('button');
    leaveButton.textContent = 'Sair da loja';
    leaveButton.className = 'danger-btn';
    leaveButton.addEventListener('click', () => {
        showEvent({ text: "Você decide guardar suas Pedras Espirituais por enquanto. O mercador dá de ombros, indiferente." });
    });
    elements.choicesContainer.appendChild(leaveButton);
}

// --- SECT ACTIONS ---

/**
 * Displays the main menu for sect-related actions.
 */
function showSectActions() {
    elements.eventContent.innerHTML = `<p>Você está no pátio principal da sua seita. O que deseja fazer?</p>`;
    elements.choicesContainer.innerHTML = ''; // Limpa as escolhas

    const actions = [
        { text: 'Quadro de Missões', effect: 'show_mission_board' },
        { text: 'Loja da Seita', effect: 'show_sect_store' },
        { text: 'Pavilhão de Técnicas', effect: 'show_technique_pavilion' },
        { text: 'Tentar Promoção', effect: 'try_promotion' },
        { text: 'Voltar', effect: null } // Para voltar ao ecrã principal
    ];

    actions.forEach(action => {
        const button = document.createElement('button');
        button.textContent = action.text;
        button.addEventListener('click', () => {
            if (action.effect) {
                handleSpecialEffects(action.effect);
            } else {
                // Volta para um estado neutro
                showEvent({ text: "Você decide meditar por conta própria por enquanto." });
            }
        });
        elements.choicesContainer.appendChild(button);
    });
}

function showMissionBoard() {
    const activeWorldEvent = getActiveWorldEvent();
    let rewardModifier = activeWorldEvent?.effects?.missionDifficultyModifier || 1.0;

    elements.eventContent.innerHTML = `<p>O quadro de missões está coberto de pedidos de anciãos e outros discípulos.</p>`;
    if (rewardModifier > 1.0) {
        elements.eventContent.innerHTML += `<p style="color: #feca57;">Durante a "${activeWorldEvent.name}", as missões são mais perigosas, mas oferecem melhores recompensas!</p>`;
    }
    elements.choicesContainer.innerHTML = '';

    if (gameState.active_mission) {
        const mission = allGameData.missions.find(m => m.id === gameState.active_mission.id);
        elements.eventContent.innerHTML += `<p><b>Missão Ativa:</b> ${mission.title}<br><small>${mission.description}</small></p><p><em>Complete a sua missão atual antes de aceitar uma nova. A missão será concluída no final do ano.</em></p>`;
    } else {
        const availableMissions = allGameData.missions.filter(m =>
            m.sect_id === gameState.sect.id && gameState.sect.rank >= m.min_rank
        );

        if (availableMissions.length === 0) {
            elements.eventContent.innerHTML += `<p>Não há missões disponíveis para o seu rank no momento.</p>`;
        } else {
            availableMissions.forEach(mission => {
                // --- CÁLCULO DE RECOMPENSA MODIFICADO ---
                const finalReward = Math.floor(mission.reward.contribution * rewardModifier);
                const button = document.createElement('button');
                button.innerHTML = `<b>${mission.title}</b><br><small>${mission.description} | Recompensa: ${finalReward} Contribuição</small>`;
                button.addEventListener('click', () => {
                    // Precisamos de armazenar a recompensa modificada
                    gameState.active_mission = {
                        id: mission.id,
                        reward: { ...mission.reward, contribution: finalReward }
                    };
                    addLogMessage(`Você aceitou a missão: ${mission.title}.`, 'notification');
                    showEvent({ text: `Você aceitou a missão "${mission.title}" e parte para cumpri-la. Ela será concluída no final do ano.` });
                    saveGameState();
                });
                elements.choicesContainer.appendChild(button);
            });
        }
    }

    const backButton = document.createElement('button');
    backButton.textContent = 'Voltar';
    backButton.className = 'danger-btn';
    backButton.addEventListener('click', showSectActions);
    elements.choicesContainer.appendChild(backButton);
}

/**
 * Displays the sect's item store.
 */
function showSectStore() {
    const sect = allGameData.sects.find(s => s.id === gameState.sect.id);
    const activeWorldEvent = getActiveWorldEvent();
    let priceModifier = activeWorldEvent?.effects?.pillPriceModifier || 1.0;

    elements.eventContent.innerHTML = `<p>O discípulo encarregado da loja mostra-lhe as mercadorias disponíveis.</p><p>Você tem ${gameState.resources.contribution} de Contribuição.</p>`;
    if(priceModifier !== 1.0) {
        elements.eventContent.innerHTML += `<p style="color: #feca57;">Devido à "${activeWorldEvent.name}", os preços estão alterados!</p>`;
    }
    elements.choicesContainer.innerHTML = '';

    if (!sect.store || sect.store.length === 0) {
        elements.eventContent.innerHTML += `<p>A loja da seita está vazia no momento.</p>`;
    } else {
        sect.store.forEach(storeItem => {
            const itemDetails = allGameData.items.find(i => i.id === storeItem.id);
            if (itemDetails && gameState.sect.rank >= storeItem.min_rank) {
                // --- CÁLCULO DE CUSTO MODIFICADO ---
                const finalCost = Math.floor(storeItem.cost_contribution * priceModifier);
                const button = document.createElement('button');
                button.innerHTML = `<b>${itemDetails.name}</b> - ${finalCost} Contribuição<br><small>${itemDetails.description}</small>`;

                if (gameState.resources.contribution < finalCost) { // Usa finalCost
                    button.disabled = true;
                }

                button.addEventListener('click', () => {
                    if (gameState.resources.contribution >= finalCost) { // Usa finalCost
                        gameState.resources.contribution -= finalCost; // Usa finalCost
                        applyEffects(itemDetails.effects);
                        addLogMessage(`Você comprou ${itemDetails.name}.`, 'reward');
                        // Atualiza a interface da loja para refletir a nova contribuição
                        showSectStore();
                    }
                });
                elements.choicesContainer.appendChild(button);
            }
        });
    }

    const backButton = document.createElement('button');
    backButton.textContent = 'Voltar';
    backButton.className = 'danger-btn';
    backButton.addEventListener('click', showSectActions);
    elements.choicesContainer.appendChild(backButton);
}

/**
 * Displays the sect's technique pavilion.
 */
function showTechniquePavilion() {
    const sect = allGameData.sects.find(s => s.id === gameState.sect.id);
    elements.eventContent.innerHTML = `<p>O ancião do pavilhão de técnicas observa-o em silêncio, esperando a sua escolha.</p><p>Você tem ${gameState.resources.contribution} de Contribuição.</p>`;
    elements.choicesContainer.innerHTML = '';

     sect.techniques.forEach(sectTech => {
        const techDetails = allGameData.techniques.find(t => t.id === sectTech.id);
        const isLearned = gameState.player.techniques.includes(sectTech.id);

        if (techDetails && gameState.sect.rank >= sectTech.min_rank) {
            const button = document.createElement('button');
            button.innerHTML = `<b>${techDetails.name}</b> - ${sectTech.cost_contribution} Contribuição<br><small>${techDetails.description}</small>`;

            if (isLearned) {
                button.textContent = `Aprendido: ${techDetails.name}`;
                button.disabled = true;
            } else if (gameState.resources.contribution < sectTech.cost_contribution) {
                button.disabled = true;
            }

            button.addEventListener('click', () => {
                if (gameState.resources.contribution >= sectTech.cost_contribution) {
                    gameState.resources.contribution -= sectTech.cost_contribution;
                    handleSpecialEffects(`learn_technique_${sectTech.id}`);
                    showTechniquePavilion(); // Atualiza a interface
                }
            });
            elements.choicesContainer.appendChild(button);
        }
    });

    const backButton = document.createElement('button');
    backButton.textContent = 'Voltar';
    backButton.className = 'danger-btn';
    backButton.addEventListener('click', showSectActions);
    elements.choicesContainer.appendChild(backButton);
}

/**
 * Handles the logic for attempting a promotion within the sect.
 */
function tryPromotion() {
    const sect = allGameData.sects.find(s => s.id === gameState.sect.id);
    const nextRankIndex = gameState.sect.rank + 1;

    if (nextRankIndex >= sect.ranks.length) {
        showEvent({ text: "Você já alcançou o rank mais alto na sua seita. O seu nome será lembrado para sempre." });
        return;
    }

    const nextRank = sect.ranks[nextRankIndex];
    const reqs = nextRank.requirements;
    let message = `Requisitos para ${nextRank.name}:<br>`;
    let canPromote = true;

    // Verifica os requisitos
    if (reqs.cultivation_realm_id > gameState.cultivation.realmId || (reqs.cultivation_realm_id === gameState.cultivation.realmId && reqs.cultivation_level > gameState.cultivation.level)) {
        message += ` - Reino de Cultivo: ${allGameData.realms[reqs.cultivation_realm_id].name} Nv. ${reqs.cultivation_level} (Falhou)<br>`;
        canPromote = false;
    }
    if (reqs.contribution > gameState.resources.contribution) {
        message += ` - Contribuição: ${reqs.contribution} (Falhou)<br>`;
        canPromote = false;
    }

    if (canPromote) {
        if (nextRank.trial) {
            startSectTrial(nextRank.trial);
        } else {
            grantPromotion();
        }
    } else {
        showEvent({ text: "Você ainda não cumpre os requisitos para a promoção.<br>" + message });
    }
}

function grantPromotion() {
    const sect = allGameData.sects.find(s => s.id === gameState.sect.id);
    const nextRankIndex = gameState.sect.rank + 1;
    const nextRank = sect.ranks[nextRankIndex];

    gameState.sect.rank = nextRankIndex;
    addLogMessage(`Você foi promovido para ${nextRank.name} na sua seita!`, 'milestone');
    showEvent({ text: `Parabéns! Após verificar o seu progresso, os anciãos concederam-lhe o rank de ${nextRank.name}!` });
    updateUI();
    saveGameState();
}

function startSectTrial(trialData) {
    if (trialData.type === 'combat') {
        const enemy = allGameData.enemies.find(e => e.id === trialData.enemy_id);
        if (enemy) {
            showEvent({
                text: trialData.start_text,
                choices: [
                    {
                        text: "Aceitar o Desafio",
                        // This effect is just a placeholder, the real logic is in the overwritten event listener below
                        effects: null
                    },
                    {
                        text: "Recusar por agora",
                        resultKey: "promotion_trial_refused"
                    }
                ]
            });
            // Overwrite the 'Accept' button's listener to start combat with special callbacks
            const acceptButton = elements.choicesContainer.querySelector('button');
            acceptButton.addEventListener('click', () => {
                startCombat(JSON.parse(JSON.stringify(enemy)), {
                    onWinCallback: () => {
                        showEvent({ text: trialData.win_text });
                        grantPromotion();
                    },
                    onLoseCallback: () => {
                        showEvent({ text: trialData.lose_text });
                    }
                });
            }, { once: true });
        }
    } else if (trialData.type === 'attribute_check') {
        // Future implementation for other trial types
        showEvent({ text: "Este tipo de prova ainda não foi implementado."});
    }
}

/**
 * Processes the turn for each NPC, allowing them to make decisions based on their personality.
 */
function processNpcTurns() {
    for (const npcId in gameState.npcs) {
        const npc = gameState.npcs[npcId];
        const relationship = gameState.relationships[npcId];
        const playerPower = getCharacterPowerLevel(gameState.player);
        const npcPower = getCharacterPowerLevel(npc);

        // A pequena chance de um NPC agir por ano
        if (Math.random() > 0.15) {
            continue;
        }

        switch (npc.personality) {
            case 'Arrogante':
                if (npcPower < playerPower && relationship.state !== 'Inimigo') {
                    addLogMessage(`Arrogante, ${npc.name} zomba do seu progresso, sentindo-se ameaçado. A vossa relação piora.`, 'notification');
                    relationship.score -= 5;
                }
                break;
            case 'Leal':
                if (relationship.state === 'Amigo' && Math.random() < 0.25) {
                     addLogMessage(`Leal, ${npc.name} oferece-lhe uma Pílula de Qi para o ajudar no seu cultivo.`, 'reward');
                     applyEffects({ "items": ["small_qi_pill"] });
                }
                break;
             case 'Ambicioso':
                // Foca-se em si mesmo, mas pode desafiá-lo se estiver a ficar para trás.
                npc.cultivation.level++;
                if (npcPower < playerPower && relationship.state !== 'Amigo' && Math.random() < 0.3) {
                     addLogMessage(`Ambicioso, ${npc.name} vê-o como um obstáculo e desafia-o para um duelo!`, 'notification');
                     // Futuramente: iniciar um combate aqui.
                }
                break;
        }
    }
}

/**
 * Progresses NPCs' age and stats each year.
 */
function progressNpcs() {
    for (const npcId in gameState.npcs) {
        const npc = gameState.npcs[npcId];
        npc.age++;
        // Lógica de progressão simples: chance de ganhar atributos
        if (Math.random() < 0.3) npc.attributes.body++;
        if (Math.random() < 0.3) npc.attributes.mind++;
        if (Math.random() < 0.2) {
             npc.cultivation.level++;
             // Adicionar mais lógica de cultivo para NPCs aqui se desejar
        }
    }
}

/**
 * Updates the state of relationships based on the score.
 */
function updateRelationshipStates() {
    for (const npcId in gameState.relationships) {
        const rel = gameState.relationships[npcId];
        if (rel.score > 50) rel.state = 'Amigo';
        else if (rel.score < -50) rel.state = 'Inimigo';
        else rel.state = 'Neutro';
    }
}

/**
 * Calculates a numeric power level for a character.
 * @param {object} character - The character object.
 * @returns {number} The calculated power level.
 */
function getCharacterPowerLevel(character) {
    let power = 0;
    power += character.attributes.body * 2;
    power += character.attributes.mind * 2;
    power += character.cultivation.level * 10;
    power += character.cultivation.realmId * 100;
    return power;
}

    // --- DATA LOADING ---
/**
 * Asynchronously loads all necessary game data from JSON files.
 * This is the first function called to bootstrap the game.
 */
async function loadGameData() {
    const filesToLoad = [
        'data/events.json',
        'data/items.json',
        'data/sects.json',
        'data/enemies.json',
        'data/talents.json',
        'data/strings.json',
        'data/random_events.json',
        'data/nomes.json',
        'data/personalidades.json',
        'data/world_events.json',
        'data/realms.json',
        'data/missions.json',
        'data/techniques.json',
        'data/mortal_jobs.json',
        'data/spiritual_roots.json',
        'data/city_data.json',
        'data/social_classes.json'
    ];

    try {
        const responses = await Promise.all(filesToLoad.map(file => fetch(file)));

        for (const res of responses) {
            if (!res.ok) {
                throw new Error(`Failed to load a data file: ${res.url} (Status: ${res.status})`);
            }
        }

        const jsonData = await Promise.all(responses.map(res => res.json()));

        const [events, items, sects, enemies, talents, strings, randomEvents, nomes, personalidades, worldEvents, realms, missions, techniques, mortalJobs, spiritualRoots, cityData, socialClasses] = jsonData;

        allGameData = { events, items, sects, enemies, talents, randomEvents, nomes, personalidades, worldEvents, realms, missions, techniques, mortalJobs, spiritualRoots, cityData, socialClasses };
        allStrings = strings;

        initializeGame();
    } catch (error) {
        console.error("Fatal error loading game data:", error);
        elements.eventContent.innerHTML = `<p style="color: #ff7675;"><b>ERRO CRÍTICO:</b></p><p>${error.message}</p><hr><p><b>Como resolver:</b><br>1. Verifique se o nome do arquivo e da pasta estão EXATAMENTE iguais no seu repositório GitHub.<br>2. O GitHub diferencia maiúsculas de minúsculas (ex: 'Data' é diferente de 'data').<br>3. Certifique-se de que você enviou (commit & push) o arquivo para o GitHub.</p>`;
    }
}

    // --- CORE SYSTEMS ---

    /**
     * Retrieves the legacy data object from localStorage.
     * @returns {object} The legacy data, including totalPoints and purchased bonuses.
     */
    function getLegacyData() {
        return JSON.parse(localStorage.getItem('immortalJourneyLegacy')) || { totalPoints: 0, purchased: {} };
    }

    /**
     * Saves the legacy data object to localStorage.
     * @param {object} legacyData - The legacy data to save.
     */
    function saveLegacyData(legacyData) {
        localStorage.setItem('immortalJourneyLegacy', JSON.stringify(legacyData));
    }

/**
 * Saves the current game state to localStorage.
 */
function saveGameState() {
    localStorage.setItem('immortalJourneySave', JSON.stringify(gameState));
}

/**
 * Gets the full data object for the currently active world event, if any.
 * @returns {object|null} The world event object or null.
 */
function getActiveWorldEvent() {
    if (gameState.world_event && gameState.world_event.id) {
        return allGameData.worldEvents.find(we => we.id === gameState.world_event.id);
    }
    return null;
}


    /**
     * Adds a message to the player's life log.
     * @param {string} message - The message to log.
     * @param {string} type - The type of log entry (e.g., 'event', 'reward', 'combat'), used for styling.
     */
    function addLogMessage(message, type = 'event') {
        if (!gameState.life_log) gameState.life_log = [];
        const logEntry = { age: gameState.age, message: processText(message), type: type };
        gameState.life_log.push(logEntry);
        // Keep the log from getting excessively long.
        if (gameState.life_log.length > 150) gameState.life_log.shift();
    }

    /**
     * Returns a random element from a given array.
     * @param {Array} arr - The array to pick from.
     * @returns {*} A random element from the array.
     */
    function getRandomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    /**
     * Applies a set of effects to the game state.
     * This is a generic function that can modify attributes, resources, cultivation, etc.
     * @param {object} effects - An object describing the effects to apply.
     */
    function applyEffects(effects) {
        if (!effects) return;
        if (effects.attributes) for (const attr in effects.attributes) gameState.player.attributes[attr] = (gameState.player.attributes[attr] || 0) + effects.attributes[attr];
        if (effects.resources) for (const res in effects.resources) gameState.resources[res] = (gameState.resources[res] || 0) + effects.resources[res];
        if (effects.cultivation) for (const cult in effects.cultivation) gameState.cultivation[cult] = (gameState.cultivation[cult] || 0) + effects.cultivation[cult];
        if (effects.lifespan) gameState.player.lifespan += effects.lifespan;
        if (effects.combat) for (const stat in effects.combat) gameState.player.combat[stat] = (gameState.player.combat[stat] || 0) + effects.combat[stat];
        if (effects.relationships) {
            for (const npcKey in effects.relationships) {
                const npcId = npcKey === 'rival' ? gameState.rivalId : npcKey;
                if (gameState.relationships[npcId]) gameState.relationships[npcId].score += effects.relationships[npcKey];
            }
        }
        if (effects.special) handleSpecialEffects(effects.special);
    }

    /**
     * Handles special, non-standard effects triggered by events or choices.
     * @param {string} effectKey - The key identifying the special effect to handle.
     */
    function handleSpecialEffects(effectKey) {
        addLogMessage(`Efeito especial ativado: ${effectKey}`, 'notification');

        // Lógica para aprender técnicas
        if (effectKey.startsWith('learn_technique_')) {
            const techId = effectKey.replace('learn_technique_', '');
            if (!gameState.player.techniques.includes(techId)) {
                gameState.player.techniques.push(techId);
                const tech = allGameData.techniques.find(t => t.id === techId);
                if (tech.effects) applyEffects(tech.effects);
                addLogMessage(`Você aprendeu a técnica: ${tech.name}!`, 'milestone');
            }
            return;
        }

        // Lógica para entrar numa seita
        if (effectKey.startsWith('join_sect_')) {
            const sectId = effectKey.replace('join_sect_', '');
            const sect = allGameData.sects.find(s => s.id === sectId);
            if (sect && gameState.sect.id !== sectId) {
                gameState.sect.id = sectId;
                gameState.sect.rank = 0; // Começa no rank mais baixo
                gameState.player.sectId = sectId;
                addLogMessage(`Você juntou-se à Seita ${sect.name}!`, 'milestone');

                // O Discípulo Sênior também pertence a uma seita, vamos colocá-lo na mesma por conveniência
                const senior = gameState.npcs['senior_disciple_1'];
                if (senior) {
                    senior.sectId = sectId;
                    addLogMessage(`${senior.name} também é um membro desta seita. Ele olha para si com desdém.`, 'notification');
                }
            }
            return;
        }

        switch (effectKey) {
            case 'become_cultivator':
                gameState.isCultivator = true;

                // --- LÓGICA DE ATRIBUIÇÃO DA RAIZ ESPIRITUAL ---
                const rootTypes = allGameData.spiritualRoots.types;
                const rootGrades = allGameData.spiritualRoots.grades;

                // Escolhe um grau com base no peso (raridade)
                const totalWeight = rootGrades.reduce((sum, grade) => sum + grade.weight, 0);
                let random = Math.random() * totalWeight;
                const chosenGrade = rootGrades.find(grade => (random -= grade.weight) < 0);

                gameState.player.spiritualRoot = {
                    type: getRandomElement(rootTypes),
                    grade: chosenGrade.id,
                    efficiency: chosenGrade.efficiency_mult
                };
                // --- FIM DA LÓGICA ---

                addLogMessage(`Os céus sorriram para si! Você despertou uma Raiz Espiritual de ${gameState.player.spiritualRoot.type} de Grau ${chosenGrade.name}!`, "milestone");

                gameState.cultivation = { realmId: 0, level: 1, qi: 0, maxQi: 100, isCultivating: true }; // Começa a cultivar automaticamente
                updateCultivationStats();
                startCultivationLoop(); // Inicia o ciclo de cultivo passivo

                showEvent({text: "Você sente o Qi do mundo a fluir para si. Um novo caminho cheio de perigos e glória estende-se à sua frente."});
                break;
            case 'show_sect_actions': showSectActions(); break;
            case 'show_technique_pavilion': showTechniquePavilion(); break;
            case 'try_promotion': tryPromotion(); break;
            case 'show_mission_board': showMissionBoard(); break;
            case 'show_sect_store': showSectStore(); break;
            case 'show_special_merchant': showSpecialMerchantStore(); break;
            case 'start_combat_rival':
                const rivalData = { id: gameState.rivalId, name: gameState.npcs[gameState.rivalId].name, combat: gameState.npcs[gameState.rivalId].combat, techniques: gameState.npcs[gameState.rivalId].techniques || [] };
                startCombat(rivalData);
                break;
            case 'start_combat_tournament_disciple':
                const tournamentDisciple = allGameData.enemies.find(e => e.id === 'tournament_disciple');
                if (tournamentDisciple) startCombat(JSON.parse(JSON.stringify(tournamentDisciple)));
                break;
            case 'start_combat_demonic_wolf':
                const demonicWolf = allGameData.enemies.find(e => e.id === 'demonic_wolf');
                if (demonicWolf) startCombat(JSON.parse(JSON.stringify(demonicWolf)));
                break;
            case 'start_combat_ancient_guardian':
                const ancientGuardian = allGameData.enemies.find(e => e.id === 'ancient_guardian');
                if (ancientGuardian) {
                    startCombat(JSON.parse(JSON.stringify(ancientGuardian)));
                }
                break;
            case 'face_tribulation': addLogMessage("Os céus rugem enquanto você enfrenta a tribulação!", "milestone"); break;

            // City Work Effects
            case 'random_alley_find':
                const randomMoney = Math.floor(Math.random() * 10) + 1; // 1 to 10 moedas
                addLogMessage(`Você encontrou ${randomMoney} moedas esquecidas num canto!`, 'reward');
                applyEffects({ resources: { money: randomMoney } });
                showEvent({ text: `Você vasculha os becos e encontra ${randomMoney} moedas esquecidas!` });
                break;
            case 'attempt_theft':
                if (Math.random() < 0.5) { // 50% success chance
                    const stolenMoney = Math.floor(Math.random() * 20) + 5; // 5 to 24 moedas
                    addLogMessage(`Você conseguiu roubar uma bolsa com ${stolenMoney} moedas!`, 'reward');
                    applyEffects({ resources: { money: stolenMoney } });
                    showEvent({ text: `Com sucesso, você pega uma bolsa com ${stolenMoney} moedas e desaparece na multidão.` });
                } else {
                    addLogMessage('Um guarda apanhou-o! Você levou uma surra e perdeu algum dinheiro na confusão.', 'notification');
                    applyEffects({ resources: { money: -5 }});
                     showEvent({ text: 'Você é apanhado por um guarda! Perde 5 moedas na confusão.' });
                }
                break;

            default: console.warn(`Efeito especial não implementado: ${effectKey}`);
        }
    }

function areConditionsMet(conditions) {
    if (!conditions) return true;
    const activeWorldEvent = getActiveWorldEvent();

    for (const key in conditions) {
        let value = conditions[key];
        switch (key) {
            case 'age': if (gameState.age !== value) return false; break;
            case 'min_age': if (gameState.age < value) return false; break;
            case 'min_cultivation_realm_id': if (gameState.cultivation.realmId < value) return false; break;
            case 'min_sect_rank': if (!gameState.sect.id || gameState.sect.rank < value) return false; break;
            case 'required_sect_id': if (!gameState.sect.id || gameState.sect.id !== value) return false; break;
            case 'rival_relationship_state':
                if (!gameState.relationships[gameState.rivalId] || gameState.relationships[gameState.rivalId].state !== value) return false;
                break;
            case 'rival_in_same_sect':
                const rival = gameState.npcs[gameState.rivalId];
                if ((gameState.player.sectId === rival.sectId && gameState.player.sectId !== null) !== value) return false;
                break;
            case 'player_stronger_than_rival':
                if ((getCharacterPowerLevel(gameState.player) > getCharacterPowerLevel(gameState.npcs[gameState.rivalId])) !== value) return false;
                break;
            case 'probability':
                let finalProbability = value;
                // Aplica o modificador de spawn rate a eventos de combate
                if (activeWorldEvent?.effects?.enemySpawnRate && (conditions.id === 'haunted_forest' || conditions.id === 'rival_ambush')) {
                    finalProbability *= (1 + activeWorldEvent.effects.enemySpawnRate);
                }
                if (Math.random() > finalProbability) return false;
                break;
        }
    }
    return true;
}

    // --- GAME LOOP & STATE MANAGEMENT ---

    /**
     * The main entry point for the yearly game loop.
     * Checks for and triggers a new event for the year.
     */
    function checkAndTriggerEvents() {
        // Prioritize story events
        const possibleStoryEvents = allGameData.events.filter(event => !gameState.triggeredEvents.includes(event.id) && areConditionsMet(event.conditions));
        if (possibleStoryEvents.length > 0) {
            const eventToTrigger = getRandomElement(possibleStoryEvents);
            if (eventToTrigger.type === 'once') gameState.triggeredEvents.push(eventToTrigger.id);
            showEvent(eventToTrigger);
            return true; // Event found and triggered
        }
        // If no story event, check for random events
        const possibleRandomEvents = allGameData.randomEvents.filter(event => areConditionsMet(event.conditions) && Math.random() < 0.2);
        if (possibleRandomEvents.length > 0) {
            showEvent(getRandomElement(possibleRandomEvents));
            return true; // Event found and triggered
        }
        return false; // No event triggered
    }

function startYear() {
    gameState.actionPoints = 2;
    updateUI();
}

function exploreLocation(locationId) {
    if (locationId === 'city') {
        showCityMenu(); // <-- NOVA LÓGICA
    } else {
        if (gameState.actionPoints <= 0) return;
        gameState.actionPoints--;

        let eventPool = [];
        if (gameState.isCultivator) {
            // Lógica de eventos para cultivadores (a que já tínhamos)
            eventPool = allGameData.events.filter(event =>
                (event.location === locationId || !event.location) &&
                areConditionsMet(event.conditions)
            );
        } else {
            // Lógica de eventos para mortais (trabalhos e oportunidades)
            eventPool = allGameData.mortalJobs.filter(event =>
                event.location === locationId && areConditionsMet(event.conditions)
            );
        }

        const possibleEvents = eventPool.filter(e => !gameState.triggeredEvents.includes(e.id) || e.type === 'repeatable');

        let eventToTrigger;
        if (possibleEvents.length > 0) {
            eventToTrigger = getRandomElement(possibleEvents);
            if (eventToTrigger.type === 'once') {
                gameState.triggeredEvents.push(eventToTrigger.id);
            }
        } else {
             eventToTrigger = { text: `Você passa algum tempo em "${locationId}", mas nada de extraordinário acontece.` };
        }

        showEvent(eventToTrigger);
        updateUI();
        saveGameState();
    }
}

function processSeclusionYear() {
    // 1. Grant a large amount of Qi
    const qiGainedInSeclusion = 200; // A significant boost
    gameState.cultivation.qi = Math.min(gameState.cultivation.qi + qiGainedInSeclusion, gameState.cultivation.maxQi);
    addLogMessage(`Em meditação profunda, você absorve o Qi do ambiente e ganha ${qiGainedInSeclusion} de Qi.`, 'reward');

    // 2. Chance for a special event
    const eventChance = 0.2; // 20% chance per year
    if (Math.random() < eventChance) {
        const eventType = getRandomElement(['insight', 'demons']);

        if (eventType === 'insight') {
            const statToBoost = getRandomElement(['body', 'mind']);
            const boostAmount = 1;
            applyEffects({ attributes: { [statToBoost]: boostAmount } });
            addLogMessage(`Você tem um insight sobre o Dao! Seu atributo ${statToBoost} aumentou em ${boostAmount}.`, 'milestone');
        } else if (eventType === 'demons') {
            const qiLost = 50;
            gameState.cultivation.qi = Math.max(0, gameState.cultivation.qi - qiLost);
            addLogMessage(`Seus demônios interiores o assombram, fazendo seu Qi vacilar! Você perdeu ${qiLost} de Qi.`, 'notification');
        }
    }

    // Check for breakthrough
    if (gameState.cultivation.qi >= gameState.cultivation.maxQi) {
        meditate(); // The meditate function already handles breakthroughs
    }
}

function endYear() {
    if (gameState.inSeclusion && gameState.seclusionTurnsLeft > 0) {
        processSeclusionYear();
        gameState.seclusionTurnsLeft--;
        gameState.age++;
        addLogMessage(`Você meditou em reclusão. Restam ${gameState.seclusionTurnsLeft} anos.`, 'event');

        // Check if seclusion ends
        if (gameState.seclusionTurnsLeft <= 0) {
            gameState.inSeclusion = false;
            addLogMessage('Você emerge da sua reclusão!', 'milestone');
            startYear(); // Start a new proper year immediately
            showEvent({ text: 'Sua longa meditação chegou ao fim. Você emerge, sentindo o mundo novamente.' });
        } else {
             elements.eventContent.innerHTML = `<p>Você está em reclusão. O tempo passa e o seu poder cresce. Restam ${gameState.seclusionTurnsLeft} anos.</p>`;
             updateUI();
        }
        saveGameState();
        return;
    }

    // --- LÓGICA DE EVENTOS MUNDIAIS ---
    if (gameState.world_event && gameState.world_event.duration > 0) {
        gameState.world_event.duration--;
        if (gameState.world_event.duration === 0) {
            const endedEvent = getActiveWorldEvent();
            addLogMessage(`O evento mundial "${endedEvent.name}" chegou ao fim. ${endedEvent.endText}`, 'milestone');
            gameState.world_event = null;
        }
    } else {
        // Chance de começar um novo evento mundial (ex: aos 20 anos, 25% de chance)
        if (gameState.age === 20 && Math.random() < 0.25) {
            const eventToStart = getRandomElement(allGameData.worldEvents);
            gameState.world_event = {
                id: eventToStart.id,
                duration: eventToStart.duration
            };
            addLogMessage(`Um evento mundial começou: "${eventToStart.name}"! ${eventToStart.startText}`, 'milestone');
        }
    }
    // --- FIM DA LÓGICA DE EVENTOS MUNDIAIS ---

    if (gameState.active_mission) {
        // A recompensa modificada já está guardada em active_mission
        const mission = allGameData.missions.find(m => m.id === gameState.active_mission.id);
        if (mission) {
            applyEffects(gameState.active_mission.reward); // Usa a recompensa guardada
            addLogMessage(`Missão concluída: "${mission.title}"! Você ganhou ${gameState.active_mission.reward.contribution} de contribuição.`, 'reward');
        }
        gameState.active_mission = null;
    }

    gameState.age++;
    addLogMessage(`Você envelheceu para ${gameState.age} anos.`, 'milestone');

    // --- LÓGICA DE BENEFÍCIOS DE SEITA APRIMORADA ---
    if (gameState.sect.id) {
        const sect = allGameData.sects.find(s => s.id === gameState.sect.id);
        if (sect) {
            const template = sect.benefit_template;
            const rank = gameState.sect.rank;
            let benefitValue = template.base_value + (template.value_per_rank * rank);

            switch (template.type) {
                case 'passive_qi_gain':
                    gameState.cultivation.qi = Math.min(gameState.cultivation.qi + benefitValue, gameState.cultivation.maxQi);
                    addLogMessage(`Sua seita lhe concedeu ${benefitValue} de Qi.`, 'reward');
                    break;
                case 'body_cultivation_boost':
                    if (gameState.age % 5 === 0) { // A cada 5 anos
                        gameState.player.attributes.body += benefitValue;
                        addLogMessage(`Graças aos métodos de sua seita, seu Corpo aumentou em ${benefitValue}.`, 'reward');
                    }
                    break;
                case 'passive_speed_gain':
                     if (gameState.age % 5 === 0) { // A cada 5 anos
                        gameState.player.combat.speed += benefitValue;
                        addLogMessage(`O treinamento da sua seita aprimorou sua Velocidade em ${benefitValue}.`, 'reward');
                    }
                    break;
                case 'passive_mind_gain':
                    if (gameState.age % 10 === 0) { // A cada 10 anos
                        gameState.player.attributes.mind += benefitValue;
                        addLogMessage(`O conhecimento de sua seita expandiu sua Mente em ${benefitValue}.`, 'reward');
                    }
                    break;
            }
        }
    }
    // --- FIM DA LÓGICA DE BENEFÍCIOS DE SEITA ---

    // Progressão de NPCs
    progressNpcs();
    processNpcTurns();
    updateRelationshipStates();

    // Checa morte por velhice
    if (gameState.age >= gameState.player.lifespan) {
        endGame("old_age");
        return;
    }

    startYear(); // Começa o próximo ano
    saveGameState();
}

function endGame(reason) {
    addLogMessage("Sua jornada chegou ao fim.", "milestone");
    const finalGameState = { ...gameState };

    let pointsEarned = 0;
    pointsEarned += Math.floor(finalGameState.age * 0.5);
    pointsEarned += (finalGameState.cultivation.realmId || 0) * 100;
    pointsEarned += (finalGameState.cultivation.level || 0) * 10;
    pointsEarned += Math.floor((finalGameState.resources.money || 0) / 10);
    pointsEarned += (finalGameState.resources.talentPoints || 0) * 2;
    pointsEarned += (finalGameState.player.techniques?.length || 0) * 25;

    // Anti-farming measure for the "End Journey" button.
    if (reason === 'ended_journey' && finalGameState.age < 18) {
        addLogMessage("Sua jornada foi muito curta para deixar um legado significativo.", "notification");
        pointsEarned = 0;
    }

    let legacyData = getLegacyData();
    legacyData.totalPoints += pointsEarned;
    saveLegacyData(legacyData);

    // Pass the fresh legacy data to the screen
    showLegacyScreen(finalGameState, pointsEarned, legacyData);
    localStorage.removeItem('immortalJourneySave');
}

// --- NEW AUTOMATIC COMBAT SYSTEM ---

/**
 * Inicia um encontro de combate automático.
 */
function startCombat(enemyData, options = {}) {
    elements.eventContent.innerHTML = '';
    elements.choicesContainer.innerHTML = '';
    elements.combatScreen.classList.remove('hidden');
    elements.eventImage.style.display = 'none';

    combatState = {
        player: {
            ...gameState.player.combat,
            hp: gameState.player.combat.maxHp,
            qi: gameState.cultivation.qi,
            techniques: gameState.player.combat.equipped_techniques.filter(t => t),
            cooldowns: {},
            statusEffects: {}
        },
        enemy: {
            ...enemyData.combat,
            name: enemyData.name,
            techniques: enemyData.techniques || [],
            cooldowns: {},
            statusEffects: {}
        },
        onWin: options,
        turn: 0,
        isPlayerTurn: true, // Player starts
        isAutoBattling: false,
    };

    elements.combatLog.innerHTML = `<p class="log-type-notification">Você encontrou ${combatState.enemy.name}!</p>`;

    // Create auto-battle button
    elements.combatControls.innerHTML = '';
    const autoBattleButton = document.createElement('button');
    autoBattleButton.id = 'auto-battle-btn';
    autoBattleButton.addEventListener('click', toggleAutoBattle);
    elements.combatControls.appendChild(autoBattleButton);

    // Initial UI setup, then prepare for the first turn.
    updateCombatUI();
    preparePlayerTurn();
}

/**
 * Prepara o turno do jogador, renderizando as ações possíveis.
 */
function preparePlayerTurn() {
    combatState.isPlayerTurn = true;
    addCombatLog(`--- Turno ${combatState.turn + 1}: Sua Vez ---`, 'system');
    updateCombatUI();
}

/**
 * Executa a ação escolhida pelo jogador e avança o combate.
 * @param {string} techId - O ID da técnica a ser usada.
 */
function executePlayerAction(techId) {
    if (!combatState.isPlayerTurn) return;
    combatState.isPlayerTurn = false;

    executeCharacterTurn(combatState.player, combatState.enemy, 'player', techId);

    if (combatState.enemy.hp <= 0) {
        endCombat(true);
        return;
    }

    updateCombatUI(); // Desativa os botões de ação
    setTimeout(executeEnemyTurn, 1500); // Inimigo ataca após um delay
}

/**
 * Executa o turno automático do inimigo.
 */
function executeEnemyTurn() {
    addCombatLog(`--- Turno ${combatState.turn + 1}: Vez de ${combatState.enemy.name} ---`, 'system');
    executeCharacterTurn(combatState.enemy, combatState.player, 'enemy');

    if (combatState.player.hp <= 0) {
        endCombat(false);
        return;
    }

    // A full cycle is complete, increment turn and prepare for next player turn
    combatState.turn++;
    preparePlayerTurn();
}


/**
 * Executa um único turno de combate para ambos, jogador e inimigo (usado para auto-battle).
 */
function runCombatTurn() {
    if (!combatState.isAutoBattling) {
        clearInterval(combatLoopInterval);
        combatLoopInterval = null;
        return;
    }

    combatState.turn++;
    addCombatLog(`--- Turno ${combatState.turn} (Auto) ---`, 'system');

    // Turno do Jogador
    executeCharacterTurn(combatState.player, combatState.enemy, 'player');
    if (combatState.enemy.hp <= 0) {
        endCombat(true);
        return;
    }

    // Turno do Inimigo
    executeCharacterTurn(combatState.enemy, combatState.player, 'enemy');
    if (combatState.player.hp <= 0) {
        endCombat(false);
        return;
    }

    updateCombatUI();
}

function toggleAutoBattle() {
    combatState.isAutoBattling = !combatState.isAutoBattling;

    if (combatState.isAutoBattling) {
        addCombatLog("Batalha automática ativada!", "system");
        combatState.isPlayerTurn = false; // No more manual turns

        // Run one turn immediately, then set the interval
        runCombatTurn();
        if (combatState.player.hp > 0 && combatState.enemy.hp > 0) {
            if (!combatLoopInterval) {
                combatLoopInterval = setInterval(runCombatTurn, 2000);
            }
        }
    } else {
        addCombatLog("Batalha automática desativada. Assumindo o controle.", "system");
        clearInterval(combatLoopInterval);
        combatLoopInterval = null;

        // Set up for the next manual player turn
        preparePlayerTurn();
    }
    updateCombatUI(); // Update button text etc.
}

/**
 * Lógica para um único personagem (jogador ou inimigo) realizar o seu turno.
 * @param {string} [forcedTechId=null] - Se um ID de técnica for fornecido, usa essa técnica. Senão, a IA escolhe a melhor.
 */
function executeCharacterTurn(attacker, defender, attackerType, forcedTechId = null) {
    // Reduz todos os cooldowns em 1 no início do turno do personagem
    for (const techId in attacker.cooldowns) {
        attacker.cooldowns[techId] = Math.max(0, attacker.cooldowns[techId] - 1);
    }

    let chosenTech;

    if (forcedTechId) {
        chosenTech = allGameData.techniques.find(t => t.id === forcedTechId);
    } else {
        // Lógica da IA: Encontra a melhor técnica disponível
        const availableTechniques = (attacker.techniques || [])
            .map(id => allGameData.techniques.find(t => t.id === id))
            .filter(tech => tech && tech.type === 'active_combat' && (!attacker.cooldowns[tech.id] || attacker.cooldowns[tech.id] === 0) && attacker.qi >= (tech.qi_cost || 0))
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));

        chosenTech = availableTechniques.length > 0 ? availableTechniques[0] : allGameData.techniques.find(t => t.id === 'basic_sword_form');
    }

    if (chosenTech) {
        const qiCost = chosenTech.qi_cost || 0;
        if (attacker.qi < qiCost) {
            const attackerName = attackerType === 'player' ? 'Você' : attacker.name;
            addCombatLog(`${attackerName} tenta usar ${chosenTech.name}, mas não tem Qi suficiente!`, 'system');
             // No modo manual, o turno não deve passar. No auto, sim.
            if(forcedTechId) {
                // Devolve o turno ao jogador se a ação falhar por falta de Qi
                preparePlayerTurn();
            }
            return;
        }

        attacker.qi -= qiCost;
        attacker.cooldowns[chosenTech.id] = chosenTech.cooldown || 1;

        let damage = Math.max(1, Math.floor((attacker.attack * (chosenTech.damage_multiplier || 1)) - defender.defense));
        defender.hp = Math.max(0, defender.hp - damage);

        const attackerName = attackerType === 'player' ? 'Você' : attacker.name;
        const damageClass = attackerType === 'player' ? 'damage-enemy' : 'damage';
        addCombatLog(`${attackerName} usa ${chosenTech.name} e causa <span class="${damageClass}">${damage}</span> de dano!`, 'combat');
    } else {
        const attackerName = attackerType === 'player' ? 'Você' : attacker.name;
        addCombatLog(`${attackerName} hesita, sem saber o que fazer.`, 'system');
    }
}


/**
 * Atualiza todos os elementos da UI relacionados com o combate.
 */
function updateCombatUI() {
    if (!combatState || !combatState.player) return;

    elements.combatPlayerHp.textContent = `${Math.ceil(combatState.player.hp)} / ${gameState.player.combat.maxHp} (Qi: ${Math.floor(combatState.player.qi)})`;
    elements.combatEnemyName.textContent = combatState.enemy.name;
    elements.combatEnemyHp.textContent = `${Math.ceil(combatState.enemy.hp)} / ${combatState.enemy.maxHp}`;

    // Update Auto-Battle Button
    const autoBattleButton = document.getElementById('auto-battle-btn');
    if (autoBattleButton) {
        if (combatState.isAutoBattling) {
            autoBattleButton.textContent = 'Desligar Batalha Automática';
            autoBattleButton.classList.add('danger-btn');
        } else {
            autoBattleButton.textContent = 'Ligar Batalha Automática';
            autoBattleButton.classList.remove('danger-btn');
        }
    }

    elements.combatActions.innerHTML = ''; // Limpa ações antigas

    if (combatState.isPlayerTurn && !combatState.isAutoBattling) {
        // Adiciona botões para cada técnica equipada
        combatState.player.techniques.forEach(techId => {
            const tech = allGameData.techniques.find(t => t.id === techId);
            if (!tech || tech.type !== 'active_combat') return;

            const button = document.createElement('button');
            const qiCost = tech.qi_cost || 0;
            const cooldown = combatState.player.cooldowns[techId] || 0;

            button.innerHTML = `${tech.name}<br><small>Custo: ${qiCost} Qi | CD: ${cooldown}</small>`;
            button.className = 'combat-action-btn tech';
            button.disabled = combatState.player.qi < qiCost || cooldown > 0;

            button.addEventListener('click', () => executePlayerAction(techId));
            elements.combatActions.appendChild(button);
        });

        // Adiciona botão de Fuga
        const fleeButton = document.createElement('button');
        fleeButton.textContent = 'Tentar Fugir';
        fleeButton.className = 'danger-btn';
        fleeButton.addEventListener('click', () => {
             addCombatLog("Você tenta fugir...", "system");
             if (Math.random() < 0.5) { // 50% chance de fugir
                addCombatLog("Você conseguiu escapar!", "reward");
                endCombat('fled');
             } else {
                addCombatLog("A fuga falhou!", "damage");
                combatState.isPlayerTurn = false;
                updateCombatUI();
                setTimeout(executeEnemyTurn, 1500);
             }
        });
        elements.combatActions.appendChild(fleeButton);
    } else if (combatState.isAutoBattling) {
         elements.combatActions.innerHTML = '<p>Batalha automática em andamento...</p>';
    } else {
        elements.combatActions.innerHTML = '<p>Aguardando ação do oponente...</p>';
    }
}

/**
 * Termina o combate e apresenta o resultado.
 */
function endCombat(result) {
    clearInterval(combatLoopInterval);
    combatLoopInterval = null;

    // Handle callbacks first, as they may have special logic
    if (result === true && combatState.onWin.onWinCallback) {
        combatState.onWin.onWinCallback();
        return; // Callback is responsible for the next steps
    }
    if (result === false && combatState.onWin.onLoseCallback) {
        combatState.onWin.onLoseCallback();
        return; // Callback is responsible for the next steps
    }

    // Default combat end logic
    if (result === true) {
        addCombatLog(`Você derrotou ${combatState.enemy.name}!`, 'reward');
        if (combatState.onWin.reward) applyEffects(combatState.onWin.reward);
        if (combatState.onWin.onWinEffect) handleSpecialEffects(combatState.onWin.onWinEffect);
        gameState.cultivation.qi = combatState.player.qi;
    } else if (result === false) {
        addLogMessage('Você foi derrotado...', 'death');
        endGame('combat');
        return;
    } else if (result === 'fled') {
        addLogMessage("Você fugiu da batalha, preservando sua vida.", "notification");
        gameState.cultivation.qi = combatState.player.qi;
    }

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Continuar Jornada';
    closeButton.addEventListener('click', () => {
        elements.combatScreen.classList.add('hidden');
        elements.mapContainer.classList.remove('hidden'); // Mostra o mapa
        updateUI();
        saveGameState();
        showEvent({ text: "Após a batalha, você recupera o fôlego e avalia o que fazer a seguir." });
    });
    elements.combatActions.innerHTML = '';
    elements.combatActions.appendChild(closeButton);
}

/**
 * Adiciona uma mensagem ao log de combate.
 */
function addCombatLog(message, type) {
    const p = document.createElement('p');
    p.innerHTML = message;
    p.className = `log-type-${type}`;
    elements.combatLog.appendChild(p);
    elements.combatLog.scrollTop = elements.combatLog.scrollHeight;
}


    // --- UI RENDERING & MANAGEMENT ---
    // SUBSTITUA a sua função showEvent pela versão abaixo.
    // (Esta é apenas uma pequena correção para garantir que a UI principal seja escondida ao mostrar a tela de legado)
    function showEvent(event) {
        // Esconde a tela de combate se estiver ativa
        elements.combatScreen.classList.add('hidden');
        // Esconde o mapa e o botão de fim de turno
        elements.mapContainer.classList.add('hidden');
        elements.endTurnBtn.classList.add('hidden');

        elements.eventContent.innerHTML = `<p>${processText(event.text)}</p>`;
        elements.choicesContainer.innerHTML = '';
        if (event.image) {
            elements.eventImage.src = event.image;
            elements.eventImage.style.display = 'block';
        } else {
            elements.eventImage.style.display = 'none';
        }
        if (event.choices && event.choices.length > 0) {
            event.choices.forEach(choice => {
                const button = document.createElement('button');
                button.textContent = processText(choice.text);
                button.addEventListener('click', () => {
                    const resultText = choice.resultKey ? allStrings[choice.resultKey] : "Sua escolha foi feita.";
                    if (resultText) {
                        elements.eventContent.innerHTML += `<p><em>${processText(resultText)}</em></p>`;
                        addLogMessage(resultText, 'event');
                    }
                    applyEffects(choice.effects);
                    elements.choicesContainer.innerHTML = ''; // Clear choices
                    updateUI();
                    saveGameState();
                }, { once: true });
                elements.choicesContainer.appendChild(button);
            });
        } else {
            // If no choices, show a continue button to return to the map
            const continueButton = document.createElement('button');
            continueButton.textContent = 'Continuar...';
            continueButton.addEventListener('click', () => {
                 elements.choicesContainer.innerHTML = '';
                 updateUI();
            });
            elements.choicesContainer.appendChild(continueButton);
        }
    }

// --- CITY ACTIONS ---

/**
 * Displays the main menu for the city.
 */
function showCityMenu() {
    elements.mapContainer.classList.add('hidden'); // Esconde o mapa
    elements.eventContent.innerHTML = `<p>Você está nas ruas movimentadas da cidade. O que deseja fazer?</p>`;
    elements.choicesContainer.innerHTML = '';

    allGameData.cityData.locations.forEach(location => {
        const button = document.createElement('button');
        button.innerHTML = `<b>${location.name}</b><br><small>${location.description}</small>`;
        button.addEventListener('click', () => {
            switch (location.id) {
                case 'shop':
                    showCityShop();
                    break;
                case 'work':
                    showWorkOptions();
                    break;
                case 'tavern':
                    showTavernOptions();
                    break;
                default:
                    showEvent({ text: `Você passa algum tempo em "${location.name}", mas nada de extraordinário acontece.` });
                    updateUI();
            }
        });
        elements.choicesContainer.appendChild(button);
    });

    const leaveButton = document.createElement('button');
    leaveButton.textContent = 'Sair da Cidade';
    leaveButton.className = 'danger-btn';
    leaveButton.addEventListener('click', () => {
        showEvent({text: 'Você deixa a cidade para trás e regressa ao mapa.'});
        updateUI();
    });
    elements.choicesContainer.appendChild(leaveButton);
}

/**
 * Displays the city's work options.
 */
function showWorkOptions() {
    elements.eventContent.innerHTML = `<p>Você procura por trabalhos temporários na cidade. As suas origens como <b>${allGameData.socialClasses.find(c => c.id === gameState.socialClass).name}</b> abrem-lhe certas portas.</p><p>Você tem ${gameState.actionPoints} pontos de ação restantes.</p>`;
    elements.choicesContainer.innerHTML = '';

    const playerSocialClass = gameState.socialClass;
    const availableJobs = allGameData.work_options[playerSocialClass] || [];

    if (availableJobs.length === 0) {
        elements.eventContent.innerHTML += `<p>Não parece haver trabalho para alguém como você hoje.</p>`;
    } else {
        availableJobs.forEach(job => {
            if (areConditionsMet(job.conditions)) {
                const button = document.createElement('button');
                const reward = job.effects.resources ? `${job.effects.resources.money} moedas` : 'Variável';
                button.innerHTML = `<b>${job.name}</b> (1 Ação)<br><small>${job.description} | Recompensa: ~${reward}</small>`;

                if (gameState.actionPoints <= 0) {
                    button.disabled = true;
                }

                button.addEventListener('click', () => {
                    if (gameState.actionPoints > 0) {
                        gameState.actionPoints--;
                        applyEffects(job.effects);
                        addLogMessage(job.resultText, 'event');
                        showEvent({ text: job.resultText });
                        saveGameState();
                    }
                });
                elements.choicesContainer.appendChild(button);
            }
        });
    }

    const backButton = document.createElement('button');
    backButton.textContent = 'Voltar para a Cidade';
    backButton.className = 'danger-btn';
    backButton.addEventListener('click', showCityMenu);
    elements.choicesContainer.appendChild(backButton);
}

/**
 * Displays the tavern options.
 */
function showTavernOptions() {
    elements.eventContent.innerHTML = `<p>A Taverna do Javali Bêbado está cheia de viajantes e locais. O barman acena-lhe com a cabeça.</p><p>Você tem ${gameState.actionPoints} pontos de ação e ${gameState.resources.money} moedas.</p>`;
    elements.choicesContainer.innerHTML = '';

    const listenButton = document.createElement('button');
    listenButton.innerHTML = 'Ouvir Rumores (1 Ação, 5 Moedas)';

    if (gameState.actionPoints <= 0 || gameState.resources.money < 5) {
        listenButton.disabled = true;
    }

    listenButton.addEventListener('click', () => {
        if (gameState.actionPoints > 0 && gameState.resources.money >= 5) {
            gameState.actionPoints--;
            gameState.resources.money -= 5;
            triggerTavernRumor();
            saveGameState();
        }
    });
    elements.choicesContainer.appendChild(listenButton);

    const backButton = document.createElement('button');
    backButton.textContent = 'Voltar para a Cidade';
    backButton.className = 'danger-btn';
    backButton.addEventListener('click', showCityMenu);
    elements.choicesContainer.appendChild(backButton);
}

/**
 * Triggers a random rumor and its effects.
 */
function triggerTavernRumor() {
    const rumor = getRandomElement(allGameData.tavern_rumors);
    let resultText = `Você paga ao barman e senta-se a um canto, a ouvir as conversas...<br><br><i>"${rumor.text}"</i>`;

    // Simple, hardcoded effects for demonstration
    switch (rumor.id) {
        case 'rumor_rare_herb':
            resultText += "<br><br>A informação parece valiosa. Você vende o local da erva a um mercador por 25 moedas.";
            applyEffects({ resources: { money: 25 } });
            break;
        case 'rumor_hidden_cave':
            resultText += "<br><br>Intrigado, você segue as indicações e encontra uma pequena bolsa de moedas escondida. Que sorte! (+15 moedas)";
            applyEffects({ resources: { money: 15 } });
            break;
        case 'rumor_noble_scandal':
            resultText += "<br><br>Uma fofoca interessante, mas inútil para si... por enquanto.";
            break;
        default:
             resultText += "<br><br>Você guarda a informação, sem saber se será útil no futuro.";
    }

    addLogMessage(resultText, 'event');
    showEvent({ text: resultText });
}

/**
 * Displays the city's general store.
 */
function showCityShop() {
    elements.eventContent.innerHTML = `<p>O lojista cumprimenta-o. "Dê uma olhada," ele diz.</p><p>Você tem ${gameState.resources.money} moedas.</p>`;
    elements.choicesContainer.innerHTML = '';

    allGameData.cityData.shop_items.forEach(shopItem => {
        const itemDetails = allGameData.items.find(i => i.id === shopItem.id) || shopItem;

        const button = document.createElement('button');
        button.innerHTML = `<b>${itemDetails.name}</b> - ${shopItem.cost_money} Moedas<br><small>${itemDetails.description}</small>`;

        if (gameState.resources.money < shopItem.cost_money) {
            button.disabled = true;
        }

        button.addEventListener('click', () => {
            if (gameState.resources.money >= shopItem.cost_money) {
                gameState.resources.money -= shopItem.cost_money;
                applyEffects(itemDetails.effects);
                addLogMessage(`Você comprou ${itemDetails.name}.`, 'reward');
                showCityShop(); // Atualiza a interface da loja
            }
        });
        elements.choicesContainer.appendChild(button);
    });

    const backButton = document.createElement('button');
    backButton.textContent = 'Voltar para a Cidade';
    backButton.className = 'danger-btn';
    backButton.addEventListener('click', showCityMenu);
    elements.choicesContainer.appendChild(backButton);
}

function updateUI() {
    if (!gameState || !gameState.player) return;

    // --- LÓGICA DE VISIBILIDADE DOS PAINÉIS ---
    const cultivatorPanels = document.getElementById('cultivator-only-panels');
    if (gameState.isCultivator) {
        cultivatorPanels.classList.remove('hidden');
        elements.talentsBtn.classList.remove('hidden');
        elements.manageTechniquesBtn.classList.remove('hidden');
        elements.cultivationPanel.style.display = 'block';

        // Update cultivation stats only if cultivator
        const realm = allGameData.realms?.[gameState.cultivation.realmId] || { name: 'Mortal' };
        elements.realm.textContent = realm.name;
        elements.level.textContent = gameState.cultivation.level;
        elements.qi.textContent = Math.floor(gameState.cultivation.qi);
        elements.maxQi.textContent = gameState.cultivation.maxQi;

        // Update spiritual root info
        const root = gameState.player.spiritualRoot;
        const gradeInfo = allGameData.spiritualRoots.grades.find(g => g.id === root.grade);
        elements.cultRootName.textContent = root.type;
        elements.cultRootGrade.textContent = gradeInfo.name;

        elements.cultivateBtn.textContent = gameState.cultivation.isCultivating ? 'Parar Cultivo' : 'Retomar Cultivo';
        elements.cultivateBtn.style.display = 'block';

        // Update sect info and exploration buttons
        if (gameState.sect.id) {
            elements.sectInfo.classList.remove('hidden');
            const sect = allGameData.sects.find(s => s.id === gameState.sect.id);
            const rank = sect.ranks[gameState.sect.rank];
            elements.sectName.textContent = sect.name;
            elements.sectRank.textContent = rank.name;
            let benefitValue = sect.benefit_template.base_value + (sect.benefit_template.value_per_rank * gameState.sect.rank);
            elements.sectBenefit.textContent = sect.benefit_template.description.replace('{value}', benefitValue);
            elements.exploreSectBtn.classList.remove('hidden');
        } else {
            elements.sectInfo.classList.add('hidden');
            elements.exploreSectBtn.classList.add('hidden');
        }
        elements.seclusionBtn.classList.remove('hidden');

        // Update techniques list
        elements.techniquesList.innerHTML = '';
        if (gameState.player.techniques && gameState.player.techniques.length > 0) {
            gameState.player.techniques.forEach(techId => {
                const tech = allGameData.techniques.find(t => t.id === techId);
                if (tech) {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong data-tooltip="${tech.description}">${tech.name}</strong>`;
                    elements.techniquesList.appendChild(li);
                }
            });
        } else {
            elements.techniquesList.innerHTML = '<li>Nenhuma técnica aprendida.</li>';
        }

    } else {
        if (cultivatorPanels) cultivatorPanels.classList.add('hidden');
        elements.talentsBtn.classList.add('hidden');
        elements.manageTechniquesBtn.classList.add('hidden');
        elements.cultivationPanel.style.display = 'none';
        elements.cultivateBtn.style.display = 'none';
        elements.seclusionBtn.classList.add('hidden');
    }

    // Update character stats
    elements.playerName.textContent = gameState.player.name;
    elements.age.textContent = gameState.age;
    elements.actions.textContent = gameState.actionPoints;
    elements.lifespan.textContent = gameState.player.lifespan;
    elements.body.textContent = gameState.player.attributes.body;
    elements.mind.textContent = gameState.player.attributes.mind;

    // Update resources
    elements.money.textContent = gameState.resources.money;
    elements.talentPoints.textContent = gameState.resources.talentPoints;
    elements.contribution.textContent = gameState.resources.contribution;
    elements.spiritStones.textContent = gameState.resources.spirit_stones || 0;

    // Update relationships
    elements.relationshipsList.innerHTML = '';
    for (const npcId in gameState.npcs) {
        const npc = gameState.npcs[npcId];
        const relationship = gameState.relationships[npcId];
        const li = document.createElement('li');
        const rivalTag = npcId === gameState.rivalId ? ' <span class="rival-tag">[RIVAL]</span>' : '';
        const npcRealm = npc.cultivation ? allGameData.realms?.[npc.cultivation.realmId] || { name: 'Mortal' } : { name: 'Mortal' };
        const npcLevel = npc.cultivation ? npc.cultivation.level : 1;
        li.innerHTML = `<strong>${npc.name}${rivalTag}</strong><br><span class="npc-details">Idade: ${npc.age} | ${npcRealm.name} Nv. ${npcLevel} | Relação: ${relationship.score} (${relationship.state})</span>`;
        elements.relationshipsList.appendChild(li);
    }

    // Update life log
    elements.lifeLogList.innerHTML = '';
    if (gameState.life_log) {
        const recentLogs = gameState.life_log.slice(-15).reverse();
        recentLogs.forEach(log => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>Ano ${log.age}:</strong> ${log.message}`;
            li.classList.add(`log-type-${log.type}`);
            elements.lifeLogList.appendChild(li);
        });
    }

    // Update world event status
    const activeWorldEvent = getActiveWorldEvent();
    if (activeWorldEvent) {
        elements.worldEventStatus.classList.remove('hidden');
        elements.worldEventName.textContent = activeWorldEvent.name;
        elements.worldEventDuration.textContent = gameState.world_event.duration;
    } else {
        elements.worldEventStatus.classList.add('hidden');
    }

    // Show/hide map vs end turn button
    if (gameState.actionPoints > 0) {
        elements.mapContainer.classList.remove('hidden');
        elements.endTurnBtn.classList.add('hidden');
    } else {
        elements.mapContainer.classList.add('hidden');
        elements.endTurnBtn.classList.remove('hidden');
    }
}

    function flashElement(element, highlightClass) {
        element.classList.add(highlightClass);
        setTimeout(() => {
            element.classList.remove(highlightClass);
        }, 500);
    }


// Adicione esta nova função para renderizar a tela de legado.
// Ela será chamada pela showLegacyScreen
function renderLegacyBonuses(legacyData) {
    elements.legacyBonusesContainer.innerHTML = ''; // Limpa o conteúdo anterior

    LEGACY_BONUSES.forEach(bonus => {
        const bonusDiv = document.createElement('div');
        bonusDiv.className = 'legacy-bonus';

        const bonusInfo = document.createElement('div');
        bonusInfo.innerHTML = `<strong>${bonus.name}</strong><p>${bonus.description}</p>`;

        const bonusButton = document.createElement('button');
        const isPurchased = legacyData.purchased && legacyData.purchased[bonus.id];

        if (isPurchased) {
            bonusButton.textContent = 'Comprado';
            bonusButton.disabled = true;
        } else {
            bonusButton.textContent = `Comprar (${bonus.cost} Pts)`;
            if (legacyData.totalPoints < bonus.cost) {
                bonusButton.disabled = true;
            }
            bonusButton.addEventListener('click', () => {
                if (legacyData.totalPoints >= bonus.cost) {
                    legacyData.totalPoints -= bonus.cost;
                    if (!legacyData.purchased) {
                        legacyData.purchased = {};
                    }
                    legacyData.purchased[bonus.id] = true;
                    saveLegacyData(legacyData);
                    // Atualiza a UI da loja de legado
                    elements.legacyPoints.textContent = legacyData.totalPoints;
                    renderLegacyBonuses(legacyData);
                }
            });
        }

        bonusDiv.appendChild(bonusInfo);
        bonusDiv.appendChild(bonusButton);
        elements.legacyBonusesContainer.appendChild(bonusDiv);
    });
}

/**
 * Renders and displays the technique management screen.
 */
function showTechniqueManagement() {
    elements.techniquesScreen.classList.remove('hidden');
    const learned = gameState.player.techniques;
    const equipped = gameState.player.combat.equipped_techniques;

    // Coluna da Esquerda: Técnicas Aprendidas
    elements.learnedTechniquesList.innerHTML = '';
    const unequippedTechniques = learned.filter(techId => !equipped.includes(techId));

    unequippedTechniques.forEach(techId => {
        const tech = allGameData.techniques.find(t => t.id === techId);
        if (tech.type !== 'active_combat') return; // Mostra apenas técnicas ativas

        const li = document.createElement('li');
        li.textContent = tech.name;
        li.dataset.techId = techId;
        li.addEventListener('click', () => {
            const emptySlotIndex = equipped.findIndex(slot => slot === null);
            if (emptySlotIndex !== -1) {
                gameState.player.combat.equipped_techniques[emptySlotIndex] = techId;
                showTechniqueManagement(); // Re-renderiza o ecrã
                saveGameState();
            } else {
                addLogMessage("Não há espaços livres para equipar mais técnicas.", "notification");
            }
        });
        elements.learnedTechniquesList.appendChild(li);
    });

    // Coluna da Direita: Técnicas Equipadas
    elements.equippedTechniquesList.innerHTML = '';
    equipped.forEach((techId, index) => {
        const li = document.createElement('li');
        if (techId) {
            const tech = allGameData.techniques.find(t => t.id === techId);
            li.textContent = tech.name;
            li.dataset.techId = techId;
            li.classList.add('filled');
            li.addEventListener('click', () => {
                gameState.player.combat.equipped_techniques[index] = null;
                showTechniqueManagement(); // Re-renderiza o ecrã
                saveGameState();
            });
        } else {
            li.textContent = '[ Espaço Vazio ]';
            li.classList.add('empty');
        }
        elements.equippedTechniquesList.appendChild(li);
    });
}

// Adicione esta função completa para mostrar a tela de legado.
function showLegacyScreen(finalGameState, pointsEarned, legacyData) {
    elements.legacyScreen.classList.remove('hidden');
    document.getElementById('legacy-points-earned').textContent = pointsEarned;
    document.getElementById('legacy-points-total').textContent = legacyData.totalPoints;

    // Popula as estatísticas finais
    const finalStatsList = document.getElementById('final-stats-list');
    finalStatsList.innerHTML = `
        <li><strong>Idade Final:</strong> ${finalGameState.age}</li>
        <li><strong>Reino:</strong> ${allGameData.realms?.[finalGameState.cultivation.realmId]?.name || 'Mortal'} (Nv. ${finalGameState.cultivation.level})</li>
        <li><strong>Corpo:</strong> ${finalGameState.player.attributes.body}</li>
        <li><strong>Mente:</strong> ${finalGameState.player.attributes.mind}</li>
        <li><strong>Dinheiro:</strong> ${finalGameState.resources.money}</li>
    `;

    // Popula a crônica final
    const finalChronicleList = document.getElementById('final-chronicle-list');
    finalChronicleList.innerHTML = '';
    if (finalGameState.life_log) {
        finalGameState.life_log.forEach(log => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>Ano ${log.age}:</strong> ${log.message}`;
            finalChronicleList.appendChild(li);
        });
    }

    // Renderiza a loja de bônus
    renderLegacyBonuses(legacyData);
}

function startNewGame() {
    elements.legacyScreen.classList.add('hidden');
    const playerGender = Math.random() < 0.5 ? 'masculino' : 'feminino';
    const player = generateCharacter('player', playerGender, true);

    // Cria o Rival
    const rivalGender = Math.random() < 0.5 ? 'masculino' : 'feminino';
    const rival = generateCharacter('rival_1', rivalGender, false);

    // Cria o Discípulo Sênior
    const seniorGender = Math.random() < 0.5 ? 'masculino' : 'feminino';
    const seniorDisciple = generateCharacter('senior_disciple_1', seniorGender, false);

    // Torna o discípulo sênior mais forte e mais velho
    seniorDisciple.age = 16;
    seniorDisciple.cultivation = { realmId: 1, level: 3, qi: 50, maxQi: 250 };
    seniorDisciple.personality = 'Arrogante';
    seniorDisciple.attributes = { body: 25, mind: 25, luck: 2 };
    seniorDisciple.combat.attack = 20;
    seniorDisciple.combat.defense = 15;

    const chosenClass = getRandomElement(allGameData.socialClasses);
    player.attributes.body += chosenClass.effects?.attributes?.body || 0;
    player.attributes.mind += chosenClass.effects?.attributes?.mind || 0;

    player.combat.equipped_techniques = [null, null, null, null];

    gameState = {
        player: player,
        isCultivator: false,
        socialClass: chosenClass.id,
        npcs: {
            'rival_1': rival,
            'senior_disciple_1': seniorDisciple
        },
        rivalId: 'rival_1',
        age: 6,
        resources: {
            money: chosenClass.start_money,
            talentPoints: 0,
            contribution: 0,
            spirit_stones: 0
        },
        cultivation: null,
        sect: { id: null, rank: 0 },
        triggeredEvents: [],
        active_mission: null,
        life_log: [],
        relationships: {
            'rival_1': { score: 0, state: 'Neutro' },
            'senior_disciple_1': { score: -20, state: 'Neutro' } // Começa com uma relação ligeiramente negativa
        },
        world_event: null,
        actionPoints: 0,
    };

    addLogMessage(`Você nasceu como um(a) ${chosenClass.name}. ${chosenClass.description}`, "milestone");
    // Adiciona uma nota sobre encontrar o discípulo sênior mais tarde
    addLogMessage("Em sua juventude, você ouve histórias sobre um discípulo talentoso, mas arrogante, nas seitas próximas.", "notification");

    startYear();
    saveGameState();
}

    function initializeGame() {
        const savedGame = localStorage.getItem('immortalJourneySave');
        if (savedGame) {
            gameState = JSON.parse(savedGame);
            if (!gameState.life_log) gameState.life_log = [];
        } else {
            startNewGame();
        }

        // Attach event listeners for main UI buttons
        elements.exploreSectBtn.addEventListener('click', () => exploreLocation('sect'));
        elements.exploreCityBtn.addEventListener('click', () => exploreLocation('city'));
        elements.exploreWildsBtn.addEventListener('click', () => exploreLocation('wilds'));
        elements.seclusionBtn.addEventListener('click', showSeclusionChoices);
        elements.endTurnBtn.addEventListener('click', endYear);

        elements.talentsBtn.addEventListener('click', () => {
            showTalents();
            elements.talentsScreen.classList.remove('hidden');
        });
        elements.closeTalentsBtn.addEventListener('click', () => elements.talentsScreen.classList.add('hidden'));
        elements.cultivateBtn.addEventListener('click', toggleCultivation);

        elements.startNewJourneyBtn.addEventListener('click', () => {
             elements.legacyScreen.classList.add('hidden');
             startNewGame();
        });
        elements.resetProgressBtn.addEventListener('click', () => {
            if (confirm("TEM CERTEZA? Todo o seu progresso, incluindo Pontos de Legado e bônus comprados, será permanentemente apagado.")) {
                localStorage.clear();
                window.location.reload();
            }
        });

        elements.manageTechniquesBtn.addEventListener('click', showTechniqueManagement);
        elements.closeTechniquesBtn.addEventListener('click', () => {
            elements.techniquesScreen.classList.add('hidden');
        });

        // Resume cultivation loop if loading a game with a cultivator
        if (gameState.isCultivator) {
            startCultivationLoop();
        }

        updateUI();
    }

    // --- START THE GAME ---
    loadGameData();

    function showSeclusionChoices() {
        elements.eventContent.innerHTML = `<p>Você contempla a possibilidade de entrar em cultivo de portas fechadas. O mundo exterior será esquecido, mas o seu poder poderá crescer exponencialmente. Quanto tempo você deseja meditar?</p>`;
        elements.choicesContainer.innerHTML = '';

        const durations = [
            { years: 1, description: "Um breve retiro para consolidar o seu reino." },
            { years: 5, description: "Um período de isolamento para buscar um avanço." },
            { years: 10, description: "Uma longa reclusão para tentar tocar os mistérios do Dao." }
        ];

        durations.forEach(duration => {
            const button = document.createElement('button');
            button.innerHTML = `<b>${duration.years} Ano(s)</b><br><small>${duration.description}</small>`;
            button.addEventListener('click', () => {
                startClosedDoorCultivation(duration.years);
            });
            elements.choicesContainer.appendChild(button);
        });

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancelar';
        cancelButton.className = 'danger-btn';
        cancelButton.addEventListener('click', () => {
            showEvent({ text: "Você decide que ainda não é a hora de se isolar do mundo." });
        });
        elements.choicesContainer.appendChild(cancelButton);
    }

    function startClosedDoorCultivation(years) {
    gameState.inSeclusion = true;
    gameState.seclusionTurnsLeft = years;
    addLogMessage(`Você se isola do mundo para se concentrar no seu cultivo por ${years} ano(s).`, 'milestone');

    // Hide the action buttons and show the 'End Year' button
    elements.mapContainer.classList.add('hidden');
    elements.endTurnBtn.classList.remove('hidden');
    elements.eventContent.innerHTML = `<p>Você está em reclusão. O tempo passa e o seu poder cresce. Restam ${gameState.seclusionTurnsLeft} anos.</p>`;
    elements.choicesContainer.innerHTML = '';

    updateUI();
    saveGameState();
    }
});
