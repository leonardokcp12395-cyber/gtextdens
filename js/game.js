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

    // --- DATA LOADING ---
    /**
     * Asynchronously loads all necessary game data from JSON files.
     * This is the first function called to bootstrap the game.
     */
    async function loadGameData() {
        try {
            const responses = await Promise.all([
                fetch('data/events.json'), fetch('data/items.json'), fetch('data/sects.json'),
                fetch('data/enemies.json'), fetch('data/talents.json'), fetch('data/strings.json'),
                fetch('data/random_events.json'), fetch('data/nomes.json'), fetch('data/personalidades.json'),
                fetch('data/world_events.json'), fetch('data/realms.json'), fetch('data/missions.json'),
                fetch('data/techniques.json')
            ]);
            for (const res of responses) {
                if (!res.ok) throw new Error(`Failed to load ${res.url}`);
            }
            const [events, items, sects, enemies, talents, strings, randomEvents, nomes, personalidades, worldEvents, realms, missions, techniques] = await Promise.all(responses.map(res => res.json()));

            // Store all loaded data in a single global object for easy access.
            allGameData = { events, items, sects, enemies, talents, randomEvents, nomes, personalidades, worldEvents, realms, missions, techniques };
            allStrings = strings;

            initializeGame();
        } catch (error) {
            console.error("Fatal error loading game data:", error);
            elements.eventContent.innerHTML = "<p>CRITICAL ERROR: Could not load data files.</p>";
        }
    }

    // --- CORE SYSTEMS ---

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
                    const rewards = { resources: { spirit_stones: 5, money: 1000 } };
                    startCombat(JSON.parse(JSON.stringify(ancientGuardian)), rewards);
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

    /**
     * Ends the current game, calculates legacy points, and shows the legacy screen.
     * @param {string} reason - The reason for the game ending (e.g., 'old_age', 'combat').
     */
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

        showLegacyScreen(finalGameState, pointsEarned, legacyData);
        localStorage.removeItem('immortalJourneySave');
    }

    // --- UI RENDERING & MANAGEMENT ---

    /**
     * Displays a specific event in the event panel.
     * @param {object} event - The event object to display.
     */
    function showEvent(event) {
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

    /**
     * Renders all the UI elements with the current game state data.
     * This function is called after any state change to keep the UI in sync.
     */
    function updateUI() {
        if (!gameState || !gameState.player) return;

        // --- Attribute Flashing ---
        // Store old values before updating the text, then compare and flash if changed.
        const oldBody = parseInt(elements.body.textContent);
        const oldMind = parseInt(elements.mind.textContent);
        if (gameState.player.attributes.body > oldBody) flashElement(elements.body, 'highlight-green');
        if (gameState.player.attributes.body < oldBody) flashElement(elements.body, 'highlight-red');
        if (gameState.player.attributes.mind > oldMind) flashElement(elements.mind, 'highlight-green');
        if (gameState.player.attributes.mind < oldMind) flashElement(elements.mind, 'highlight-red');

        // --- Resource Flashing ---
        const oldMoney = parseInt(elements.money.textContent || '0');
        const oldContribution = parseInt(elements.contribution.textContent || '0');
        const oldSpiritStones = parseInt(elements.spiritStones.textContent || '0');
        if (gameState.resources.money > oldMoney) flashElement(elements.money, 'highlight-green');
        if (gameState.resources.money < oldMoney) flashElement(elements.money, 'highlight-red');
        if (gameState.resources.contribution > oldContribution) flashElement(elements.contribution, 'highlight-green');
        if (gameState.resources.contribution < oldContribution) flashElement(elements.contribution, 'highlight-red');
        if ((gameState.resources.spirit_stones || 0) > oldSpiritStones) flashElement(elements.spiritStones, 'highlight-green');
        if ((gameState.resources.spirit_stones || 0) < oldSpiritStones) flashElement(elements.spiritStones, 'highlight-red');

        // --- Update All Text Content ---
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

        // --- Update Conditional UI ---
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

        // --- Update Lists ---
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

    /**
     * Flashes an element with a temporary highlight class.
     * @param {HTMLElement} element - The DOM element to flash.
     * @param {string} highlightClass - The CSS class to apply for the flash.
     */
    function flashElement(element, highlightClass) {
        element.classList.add(highlightClass);
        setTimeout(() => {
            element.classList.remove(highlightClass);
        }, 500);
    }

    // --- INITIALIZATION ---
    /**
     * Starts a new game, either from scratch or by applying legacy bonuses.
     */
    function startNewGame() {
        const playerGender = Math.random() < 0.5 ? 'masculino' : 'feminino';
        const player = generateCharacter('player', playerGender, true);
        const rivalGender = Math.random() < 0.5 ? 'masculino' : 'feminino';
        const rival = generateCharacter('rival_1', rivalGender, false);
        const baseResources = { money: 20, talentPoints: 5, contribution: 0, spirit_stones: 0 };

        const legacyData = getLegacyData();
        for (const bonusId in legacyData.purchased) {
            if (legacyData.purchased[bonusId]) {
                const bonus = LEGACY_BONUSES.find(b => b.id === bonusId);
                if (bonus && bonus.effects.resources) {
                    for (const res in bonus.effects.resources) {
                        baseResources[res] += bonus.effects.resources[res];
                    }
                }
            }
        }

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
        updateUI();
        saveGameState();
        checkAndTriggerEvents();
    }

    /**
     * Initializes the game.
     * It either loads a saved game from localStorage or starts a new one.
     * It also attaches all the main event listeners for the UI.
     */
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
