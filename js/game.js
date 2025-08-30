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

    // --- UI ELEMENT CACHE ---
    // Caching all DOM element lookups for performance and easier access.
    const elements = {
        eventContent: document.getElementById('event-content'),
        choicesContainer: document.getElementById('choices-container'),
        actionsContainer: document.getElementById('actions-container'),
        combatScreen: document.getElementById('combat-screen'),
        playerName: document.getElementById('player-name'),
        age: document.getElementById('char-age'),
        body: document.getElementById('attr-body'),
        mind: document.getElementById('attr-mind'),
        realm: document.getElementById('cult-realm'),
        level: document.getElementById('cult-level'),
        qi: document.getElementById('cult-qi'),
        maxQi: document.getElementById('cult-max-qi'),
        money: document.getElementById('res-money'),
        talentPoints: document.getElementById('talent-points'),
        contribution: document.getElementById('res-contribution'),
        spiritStones: document.getElementById('res-spirit-stones'),
        meditateBtn: document.getElementById('meditate-btn'),
        nextYearBtn: document.getElementById('next-year-btn'),
        endJourneyBtn: document.getElementById('end-journey-btn'),
        talentsBtn: document.getElementById('talents-btn'),
        sectActionsBtn: document.getElementById('sect-actions-btn'),
        combatPlayerHp: document.getElementById('combat-player-hp'),
        combatEnemyName: document.getElementById('combat-enemy-name'),
        combatEnemyHp: document.getElementById('combat-enemy-hp'),
        combatLog: document.getElementById('combat-log'),
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
        closeTalentsBtn: document.getElementById('close-talents-btn')
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
 * (Versão de depuração para identificar falhas de carregamento)
 */
async function loadGameData() {
    const filesToLoad = [
        'data/events.json', 'data/items.json', 'data/sects.json',
        'data/enemies.json', 'data/talents.json', 'data/strings.json',
        'data/random_events.json', 'data/nomes.json', 'data/personalidades.json',
        'data/world_events.json', 'data/realms.json', 'data/missions.json',
        'data/techniques.json'
    ];

    try {
        const responses = [];
        for (const file of filesToLoad) {
            console.log(`Tentando carregar: ${file}`); // Log para o console
            const res = await fetch(file);
            if (!res.ok) {
                // Se um arquivo falhar, lança um erro específico
                throw new Error(`Não foi possível carregar o arquivo: ${file} (Status: ${res.status})`);
            }
            responses.push(res);
        }

        const jsonData = await Promise.all(responses.map(res => res.json()));

        const [events, items, sects, enemies, talents, strings, randomEvents, nomes, personalidades, worldEvents, realms, missions, techniques] = jsonData;

        // Armazena todos os dados carregados em um único objeto global para fácil acesso.
        allGameData = { events, items, sects, enemies, talents, randomEvents, nomes, personalidades, worldEvents, realms, missions, techniques };
        allStrings = strings;

        initializeGame();
    } catch (error) {
        console.error("Fatal error loading game data:", error);
        // Exibe o erro mais específico para o usuário
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
        switch (effectKey) {
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
            default: console.warn(`Efeito especial não implementado: ${effectKey}`);
        }
    }

    /**
     * Checks if the current game state meets a set of conditions.
     * @param {object} conditions - An object of conditions to check against the game state.
     * @returns {boolean} True if all conditions are met, false otherwise.
     */
    function areConditionsMet(conditions) {
        if (!conditions) return true;
        for (const key in conditions) {
            const value = conditions[key];
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
                case 'probability': if (Math.random() > value) return false; break;
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

    /**
     * Advances the game by one year, updating player stats and triggering events.
     */
    function advanceYear() {
        gameState.age++;
        addLogMessage(`Você envelheceu para ${gameState.age} anos.`, 'milestone');

        // Passive stat gains
        gameState.player.attributes.body++;
        gameState.player.attributes.mind++;

        // NPC progression
        progressNpcs();
        updateRelationshipStates();

        // Sect benefits
        if (gameState.sect.id) {
            const sect = allGameData.sects.find(s => s.id === gameState.sect.id);
            if (sect && sect.benefit_template.type === 'passive_qi_gain') {
                let benefitValue = sect.benefit_template.base_value + (sect.benefit_template.value_per_rank * gameState.sect.rank);
                gameState.cultivation.qi = Math.min(gameState.cultivation.qi + benefitValue, gameState.cultivation.maxQi);
                addLogMessage(`Sua seita lhe concedeu ${benefitValue} de Qi.`, 'reward');
            }
        }

        // Check for death by old age
        if (gameState.age >= gameState.player.lifespan) {
            endGame("old_age");
            return;
        }

        // Trigger a new event for the year
        const eventTriggered = checkAndTriggerEvents();
        if (!eventTriggered) {
            elements.eventContent.innerHTML = "<p>Um ano tranquilo se passa.</p>";
            elements.choicesContainer.innerHTML = '';
            elements.eventImage.style.display = 'none';
        }

        updateUI();
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

// --- COMBAT SYSTEM ---
// SUBSTITUA TODAS AS SUAS FUNÇÕES DE COMBATE POR ESTE BLOCO ATUALIZADO

/**
 * Starts a combat encounter.
 * @param {object} enemyData - The enemy object from allGameData.enemies.
 * @param {object} [options={}] - Optional parameters for the combat.
 * @param {string} options.onWinEffect - A special effect key to trigger on victory.
 * @param {object} options.reward - A reward object to grant on victory.
 */
function startCombat(enemyData, options = {}) {
    elements.eventContent.innerHTML = '';
    elements.choicesContainer.innerHTML = '';
    elements.actionsContainer.classList.add('hidden'); // Esconde ações normais
    elements.combatScreen.classList.remove('hidden');   // Mostra a tela de combate
    elements.eventImage.style.display = 'none';

    combatState = {
        player: {
            ...gameState.player.combat,
            hp: gameState.player.combat.maxHp,
            qi: gameState.cultivation.qi,
            statusEffects: {} // Para futuros efeitos como veneno, etc.
        },
        enemy: {
            ...enemyData.combat,
            name: enemyData.name,
            techniques: enemyData.techniques || [],
            statusEffects: {}
        },
        onWin: options
    };

    elements.combatLog.innerHTML = `<p class="log-type-notification">Você encontrou ${combatState.enemy.name}!</p>`;
    updateCombatUI();
    renderCombatActions(); // Gera os botões de ação do jogador
}

/**
 * Updates all combat-related UI elements with the current combatState.
 */
function updateCombatUI() {
    elements.combatPlayerHp.textContent = `${combatState.player.hp} / ${gameState.player.combat.maxHp} (Qi: ${combatState.player.qi})`;
    elements.combatEnemyName.textContent = combatState.enemy.name;
    elements.combatEnemyHp.textContent = `${combatState.enemy.hp} / ${combatState.enemy.maxHp}`;
}

/**
 * Dynamically creates the action buttons for the player's turn.
 */
function renderCombatActions() {
    elements.combatActions.innerHTML = ''; // Limpa ações antigas

    // Botão de Ataque Básico
    const basicAttackBtn = document.createElement('button');
    basicAttackBtn.textContent = 'Ataque Básico';
    basicAttackBtn.className = 'combat-action-btn';
    basicAttackBtn.addEventListener('click', () => executePlayerTurn(null));
    elements.combatActions.appendChild(basicAttackBtn);

    // Botões de Técnicas
    gameState.player.techniques.forEach(techId => {
        const tech = allGameData.techniques.find(t => t.id === techId);
        if (tech && tech.type === 'active_combat') {
            const techBtn = document.createElement('button');
            techBtn.textContent = `${tech.name} (${tech.qi_cost} Qi)`;
            techBtn.className = 'combat-action-btn tech';
            if (combatState.player.qi < tech.qi_cost) {
                techBtn.disabled = true;
            }
            techBtn.addEventListener('click', () => executePlayerTurn(techId));
            elements.combatActions.appendChild(techBtn);
        }
    });
}

/**
 * Executes the player's chosen action and transitions to the enemy's turn.
 * @param {string|null} techId - The ID of the technique used, or null for a basic attack.
 */
function executePlayerTurn(techId) {
    let damage = 0;
    let attackLog = '';
    const tech = techId ? allGameData.techniques.find(t => t.id === techId) : null;

    if (tech) {
        // Ataque com Técnica
        combatState.player.qi -= tech.qi_cost;
        damage = Math.max(1, Math.floor((combatState.player.attack * (tech.damage_multiplier || 1)) - combatState.enemy.defense));
        attackLog = `Você usa <span class="log-tech-name">${tech.name}</span> e causa <span class="damage-enemy">${damage}</span> de dano!`;

        // Lógica de Efeitos Especiais
        if (tech.special_effect && tech.special_effect.type === 'stun' && Math.random() < tech.special_effect.chance) {
            combatState.enemy.statusEffects.stunned = 1; // Atordoa por 1 turno
            attackLog += ` O inimigo está atordoado!`;
        }
    } else {
        // Ataque Básico
        damage = Math.max(1, combatState.player.attack - combatState.enemy.defense);
        attackLog = `Você ataca e causa <span class="damage-enemy">${damage}</span> de dano.`;
    }

    combatState.enemy.hp -= damage;
    addCombatLog(attackLog, 'player');

    updateCombatUI();

    if (combatState.enemy.hp <= 0) {
        endCombat(true);
        return;
    }

    // Atraso para o turno do inimigo para dar tempo de ler o log
    setTimeout(executeEnemyTurn, 1000);
}

/**
 * Executes the enemy's turn.
 */
function executeEnemyTurn() {
    // Verifica se o inimigo está atordoado
    if (combatState.enemy.statusEffects.stunned > 0) {
        addCombatLog(`${combatState.enemy.name} está atordoado e não pode se mover!`, 'system');
        combatState.enemy.statusEffects.stunned--;
        renderCombatActions(); // Re-renderiza as ações para o próximo turno do jogador
        return;
    }

    let damage = 0;
    let attackLog = '';
    const enemyAttack = combatState.enemy;

    // IA Inimiga Simples: 40% de chance de usar uma técnica, se tiver alguma
    const usableTechniques = enemyAttack.techniques.map(id => allGameData.techniques.find(t => t.id === id)).filter(Boolean);
    const techToUse = usableTechniques.length > 0 && Math.random() < 0.4 ? usableTechniques[0] : null;

    if (techToUse) {
        // Ataque com Técnica Inimiga
        damage = Math.max(1, Math.floor((enemyAttack.attack * (techToUse.damage_multiplier || 1)) - combatState.player.defense));
        attackLog = `${enemyAttack.name} usa <span class="log-tech-name">${techToUse.name}</span> e lhe causa <span class="damage">${damage}</span> de dano!`;
    } else {
        // Ataque Básico Inimigo
        damage = Math.max(1, enemyAttack.attack - combatState.player.defense);
        attackLog = `${enemyAttack.name} ataca e lhe causa <span class="damage">${damage}</span> de dano.`;
    }

    combatState.player.hp -= damage;
    addCombatLog(attackLog, 'enemy');
    updateCombatUI();

    if (combatState.player.hp <= 0) {
        endCombat(false);
        return;
    }

    renderCombatActions(); // Habilita os botões para o turno do jogador
}

/**
 * Ends the combat and displays the result.
 * @param {boolean} playerWon - True if the player won, false otherwise.
 */
function endCombat(playerWon) {
    elements.combatActions.innerHTML = ''; // Limpa os botões de ação

    if (playerWon) {
        addCombatLog(`Você derrotou ${combatState.enemy.name}!`, 'reward');
        if (combatState.onWin.reward) {
            applyEffects(combatState.onWin.reward);
            addCombatLog('Você recebeu uma recompensa!', 'reward');
        }
        if (combatState.onWin.onWinEffect) {
            handleSpecialEffects(combatState.onWin.onWinEffect);
        }
        // Recupera o Qi gasto no combate e atualiza o estado global
        gameState.cultivation.qi = combatState.player.qi;

    } else {
        addCombatLog('Você foi derrotado...', 'death');
        endGame('combat'); // Acaba o jogo se o jogador for derrotado
        return;
    }

    // Botão para fechar a tela de combate
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Continuar Jornada';
    closeButton.addEventListener('click', () => {
        elements.combatScreen.classList.add('hidden');
        elements.actionsContainer.classList.remove('hidden');
        updateUI();
        saveGameState();
        // Dispara um evento vazio para o jogador ter algo para fazer após o combate
        showEvent({ text: "Após a batalha, você recupera o fôlego e avalia o que fazer a seguir." });
    });
    elements.combatActions.appendChild(closeButton);
}

/**
 * Adds a message to the combat log.
 * @param {string} message - The message to log.
 * @param {string} type - 'player', 'enemy', 'system', 'reward', 'death'.
 */
function addCombatLog(message, type) {
    const p = document.createElement('p');
    p.innerHTML = message;
    p.className = `log-type-${type}`;
    elements.combatLog.appendChild(p);
    // Auto-scroll para a mensagem mais recente
    elements.combatLog.scrollTop = elements.combatLog.scrollHeight;
}

    // --- UI RENDERING & MANAGEMENT ---
    // SUBSTITUA a sua função showEvent pela versão abaixo.
    // (Esta é apenas uma pequena correção para garantir que a UI principal seja escondida ao mostrar a tela de legado)
    function showEvent(event) {
        // Esconde a tela de combate se estiver ativa
        elements.combatScreen.classList.add('hidden');
        // Mostra as ações principais
        elements.actionsContainer.classList.remove('hidden');

        elements.eventContent.innerHTML = `<p>${processText(event.text)}</p>`;
        elements.choicesContainer.innerHTML = '';
        if (event.image) {
            elements.eventImage.src = event.image;
            elements.eventImage.style.display = 'block';
        } else {
            elements.eventImage.style.display = 'none';
        }
        if (event.choices) {
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
                    while (elements.choicesContainer.firstChild) elements.choicesContainer.removeChild(elements.choicesContainer.firstChild);
                    updateUI();
                    saveGameState();
                }, { once: true });
                elements.choicesContainer.appendChild(button);
            });
        }
    }

    function updateUI() {
        if (!gameState || !gameState.player) return;
        const oldBody = parseInt(elements.body.textContent);
        const oldMind = parseInt(elements.mind.textContent);
        if (gameState.player.attributes.body > oldBody) flashElement(elements.body, 'highlight-green');
        if (gameState.player.attributes.body < oldBody) flashElement(elements.body, 'highlight-red');
        if (gameState.player.attributes.mind > oldMind) flashElement(elements.mind, 'highlight-green');
        if (gameState.player.attributes.mind < oldMind) flashElement(elements.mind, 'highlight-red');

        const oldMoney = parseInt(elements.money.textContent || '0');
        const oldContribution = parseInt(elements.contribution.textContent || '0');
        const oldSpiritStones = parseInt(elements.spiritStones.textContent || '0');
        if (gameState.resources.money > oldMoney) flashElement(elements.money, 'highlight-green');
        if (gameState.resources.money < oldMoney) flashElement(elements.money, 'highlight-red');
        if (gameState.resources.contribution > oldContribution) flashElement(elements.contribution, 'highlight-green');
        if (gameState.resources.contribution < oldContribution) flashElement(elements.contribution, 'highlight-red');
        if ((gameState.resources.spirit_stones || 0) > oldSpiritStones) flashElement(elements.spiritStones, 'highlight-green');
        if ((gameState.resources.spirit_stones || 0) < oldSpiritStones) flashElement(elements.spiritStones, 'highlight-red');

        elements.playerName.textContent = gameState.player.name;
        elements.age.textContent = gameState.age;
        elements.lifespan.textContent = gameState.player.lifespan;
        elements.body.textContent = gameState.player.attributes.body;
        elements.mind.textContent = gameState.player.attributes.mind;

        const realm = allGameData.realms?.[gameState.cultivation.realmId] || { name: 'Mortal' };
        elements.realm.textContent = realm.name;
        elements.level.textContent = gameState.cultivation.level;
        elements.qi.textContent = gameState.cultivation.qi;
        elements.maxQi.textContent = gameState.cultivation.maxQi;

        elements.money.textContent = gameState.resources.money;
        elements.talentPoints.textContent = gameState.resources.talentPoints;
        elements.contribution.textContent = gameState.resources.contribution;
        elements.spiritStones.textContent = gameState.resources.spirit_stones || 0;

        if (gameState.sect.id) {
            elements.sectInfo.classList.remove('hidden');
            const sect = allGameData.sects.find(s => s.id === gameState.sect.id);
            const rank = sect.ranks[gameState.sect.rank];
            elements.sectName.textContent = sect.name;
            elements.sectRank.textContent = rank.name;
            let benefitValue = sect.benefit_template.base_value + (sect.benefit_template.value_per_rank * gameState.sect.rank);
            elements.sectBenefit.textContent = sect.benefit_template.description.replace('{value}', benefitValue);
        } else {
            elements.sectInfo.classList.add('hidden');
        }

        if (gameState.cultivation.qi >= gameState.cultivation.maxQi) {
            elements.meditateBtn.textContent = "Tentar Breakthrough!";
            elements.meditateBtn.classList.add('breakthrough-ready');
        } else {
            elements.meditateBtn.textContent = "Meditar";
            elements.meditateBtn.classList.remove('breakthrough-ready');
        }

        elements.relationshipsList.innerHTML = '';
        for (const npcId in gameState.npcs) {
            const npc = gameState.npcs[npcId];
            const relationship = gameState.relationships[npcId];
            const li = document.createElement('li');
            const rivalTag = npcId === gameState.rivalId ? ' <span class="rival-tag">[RIVAL]</span>' : '';
            const npcRealm = allGameData.realms?.[npc.cultivation.realmId] || { name: 'Mortal' };
            li.innerHTML = `<strong>${npc.name}${rivalTag}</strong><br><span class="npc-details">Idade: ${npc.age} | ${npcRealm.name} Nv. ${npc.cultivation.level} | Relação: ${relationship.score} (${relationship.state})</span>`;
            elements.relationshipsList.appendChild(li);
        }

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

// SUBSTITUA a sua função startNewGame pela versão abaixo.
function startNewGame() {
    elements.legacyScreen.classList.add('hidden'); // Garante que a tela de legado seja escondida
    const playerGender = Math.random() < 0.5 ? 'masculino' : 'feminino';
    const player = generateCharacter('player', playerGender, true);
    const rivalGender = Math.random() < 0.5 ? 'masculino' : 'feminino';
    const rival = generateCharacter('rival_1', rivalGender, false);

    // --- APLICAÇÃO DOS BÔNUS DE LEGADO ---
    const baseResources = { money: 20, talentPoints: 5, contribution: 0, spirit_stones: 0 };
    const legacyData = getLegacyData();
    if (legacyData.purchased) {
        for (const bonusId in legacyData.purchased) {
            if (legacyData.purchased[bonusId]) {
                const bonus = LEGACY_BONUSES.find(b => b.id === bonusId);
                if (bonus) {
                    // Aplica efeitos diretamente nos objetos base
                    if (bonus.effects.resources) {
                        for (const res in bonus.effects.resources) {
                            baseResources[res] = (baseResources[res] || 0) + bonus.effects.resources[res];
                        }
                    }
                    if (bonus.effects.attributes) {
                        for (const attr in bonus.effects.attributes) {
                            player.attributes[attr] = (player.attributes[attr] || 0) + bonus.effects.attributes[attr];
                        }
                    }
                    if (bonus.effects.techniques) {
                        player.techniques.push(...bonus.effects.techniques);
                    }
                }
            }
        }
    }
    // --- FIM DA APLICAÇÃO DOS BÔNUS ---

    gameState = {
        player: player,
        npcs: { 'rival_1': rival },
        rivalId: 'rival_1',
        age: 6,
        resources: baseResources,
        cultivation: { realmId: 0, level: 1, qi: 0, maxQi: 10 },
        sect: { id: null, rank: 0 },
        triggeredEvents: [],
        active_mission: null,
        life_log: [],
        relationships: { 'rival_1': { score: 0, state: 'neutral' } }
    };

    addLogMessage("Você nasceu. O mundo aguarda para testemunhar sua lenda.", "milestone");

    checkAndTriggerEvents(); // Dispara o primeiro evento
    updateUI();
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
        elements.nextYearBtn.addEventListener('click', advanceYear);
        elements.meditateBtn.addEventListener('click', meditate);
        elements.talentsBtn.addEventListener('click', () => {
            showTalents();
            elements.talentsScreen.classList.remove('hidden');
        });
        elements.closeTalentsBtn.addEventListener('click', () => elements.talentsScreen.classList.add('hidden'));
        elements.sectActionsBtn.addEventListener('click', () => handleSpecialEffects('show_sect_actions'));
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
        elements.endJourneyBtn.addEventListener('click', () => {
            if (confirm("Tem certeza de que deseja terminar sua jornada atual? Todo o progresso desta vida será convertido em Pontos de Legado.")) {
                endGame('ended_journey');
            }
        });

        updateUI();
    }

    // --- START THE GAME ---
    loadGameData();
});
