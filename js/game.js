document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL VARIABLES ---
    let gameState = {};
    let allGameData = {};
    let allStrings = {};
    let combatState = {};

    // --- UI ELEMENTS ---
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
        meditateBtn: document.getElementById('meditate-btn'),
        nextYearBtn: document.getElementById('next-year-btn'),
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
            allGameData = { events, items, sects, enemies, talents, randomEvents, nomes, personalidades, worldEvents, realms, missions, techniques };
            allStrings = strings;
            initializeGame();
        } catch (error) {
            console.error("Fatal error loading game data:", error);
            elements.eventContent.innerHTML = "<p>CRITICAL ERROR: Could not load data files.</p>";
        }
    }

    // --- LIFE CHRONICLE ---
    function addLogMessage(message, type = 'event', important = false) {
        if (!gameState.life_log) {
            gameState.life_log = [];
        }
        const logEntry = {
            age: gameState.age,
            message: processText(message),
            type: type, // 'milestone', 'reward', 'notification', 'combat'
        };
        gameState.life_log.push(logEntry);

        if (gameState.life_log.length > 150) { // Performance cap
            gameState.life_log.shift();
        }

        // A small visual cue for important messages can be added here later
        if (important) {
            // e.g., showNotification(logEntry.message, type);
        }
    }

    // --- PROCEDURAL GENERATION ---
    function getRandomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function generateCharacter(id, gender) {
        const { nomes, personalidades } = allGameData;
        const firstName = getRandomElement(nomes[gender]);
        const lastName = getRandomElement(nomes.apelidos);
        const personality = getRandomElement(personalidades);
        const baseAttributes = { body: 10, mind: 10, soul: 10, luck: 5 };

        // Legacy bonuses would be applied here if they existed
        return {
            id, name: `${firstName} ${lastName}`, gender, personality,
            attributes: { ...baseAttributes },
            lifespan: 80,
            sectId: null, sectRank: 0, contribution: 0,
            cultivation: { realmId: 0, level: 1 },
            techniques: [],
            combat: {
                maxHp: baseAttributes.body * 5, hp: baseAttributes.body * 5,
                attack: 5 + Math.floor(baseAttributes.body / 2),
                defense: 2 + Math.floor(baseAttributes.mind / 5),
                speed: 10 + Math.floor(baseAttributes.mind / 2)
            }
        };
    }

    // --- EVENT LOGIC ---
    function areConditionsMet(conditions) {
        if (!conditions) return true;
        for (const key in conditions) {
            const value = conditions[key];
            switch (key) {
                case 'age': if (gameState.age !== value) return false; break;
                case 'min_age': if (gameState.age < value) return false; break;
                // ... other conditions
            }
        }
        return true;
    }

    function checkAndTriggerEvents() {
        const allEvents = [...allGameData.events, ...allGameData.randomEvents];
        const possibleEvents = allEvents.filter(event => {
            if (event.type === 'once' && gameState.triggeredEvents.includes(event.id)) return false;
            return areConditionsMet(event.conditions);
        });

        if (possibleEvents.length > 0) {
            const eventToTrigger = getRandomElement(possibleEvents);
            showEvent(eventToTrigger);
            if (eventToTrigger.type === 'once') gameState.triggeredEvents.push(eventToTrigger.id);
            return true;
        }
        return false;
    }

    // --- CORE GAME LOGIC ---
    function saveGameState() {
        if (Object.keys(gameState).length > 0) localStorage.setItem('immortalJourneySave', JSON.stringify(gameState));
    }

    function processText(text) {
        if (!text) return '';
        const rival = gameState.rivalId ? gameState.npcs[gameState.rivalId] : null;
        let processedText = text.replace(/\[RIVAL\]/g, rival ? rival.name : 'Rival');
        return processedText.replace(/\[PLAYER_NAME\]/g, gameState.player.name);
    }

    function applyEffects(effects) {
        // ... (implementation from original file)
    }

    function handleSpecialEffects(effect) {
        const joinSectMatch = effect.match(/^join_sect_(.+)/);
        if (joinSectMatch) {
            gameState.sect.id = joinSectMatch[1];
            addLogMessage(`Você se juntou à ${allGameData.sects.find(s => s.id === gameState.sect.id).name}.`, 'milestone', true);
            return;
        }
        // ... (other special effects)
    }

    function showEvent(event) {
        elements.eventContent.innerHTML = `<p>${processText(event.text)}</p>`;
        elements.choicesContainer.innerHTML = '';
        elements.eventImage.src = event.image || 'img/events/default.png';
        elements.eventImage.style.display = event.image ? 'block' : 'none';

        if (event.choices) {
            event.choices.forEach(choice => {
                const button = document.createElement('button');
                button.textContent = processText(choice.text);
                button.addEventListener('click', () => {
                    const resultText = choice.resultKey ? allStrings.results[choice.resultKey] : "Sua escolha foi feita.";
                    if (resultText) {
                        elements.eventContent.innerHTML += `<p><em>${processText(resultText)}</em></p>`;
                        addLogMessage(resultText, 'event');
                    }
                    applyEffects(choice.effects);
                    elements.choicesContainer.innerHTML = '';
                    updateUI();
                    saveGameState();
                }, { once: true });
                elements.choicesContainer.appendChild(button);
            });
        }
    }

    function meditate() {
        // Simple meditation logic
        const qiGained = gameState.player.attributes.mind;
        gameState.cultivation.qi = Math.min(gameState.cultivation.qi + qiGained, gameState.cultivation.maxQi);
        addLogMessage(`Você meditou e ganhou ${qiGained} Qi.`, 'notification');
        updateUI();
        saveGameState();
    }

    function advanceYear() {
        gameState.age++;
        addLogMessage(`Você envelheceu para ${gameState.age} anos.`, 'milestone');

        // Basic progression
        gameState.player.attributes.body++;
        gameState.player.attributes.mind++;

        if (gameState.age >= gameState.player.lifespan) {
            endGame("old_age");
            return;
        }

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
        addLogMessage("Sua jornada chegou ao fim.", "milestone", true);

        // --- 1. Calculate Legacy Points ---
        let pointsEarned = 0;
        pointsEarned += Math.floor(gameState.age * 0.5);
        pointsEarned += (gameState.cultivation.realmId || 0) * 100;
        pointsEarned += (gameState.cultivation.level || 0) * 10;
        pointsEarned += Math.floor((gameState.resources.money || 0) / 10);
        pointsEarned += (gameState.resources.talentPoints || 0) * 2;
        pointsEarned += (gameState.player.techniques?.length || 0) * 25;

        // --- 2. Update and Save Legacy Data ---
        let legacyData = JSON.parse(localStorage.getItem('immortalJourneyLegacy')) || { totalPoints: 0, bonuses: {} };
        legacyData.totalPoints += pointsEarned;
        localStorage.setItem('immortalJourneyLegacy', JSON.stringify(legacyData));

        // --- 3. Get UI Elements ---
        const finalStatsList = document.getElementById('final-stats-list');
        const finalChronicleList = document.getElementById('final-chronicle-list');
        const legacyPointsEarnedEl = document.getElementById('legacy-points-earned');
        const legacyPointsTotalEl = document.getElementById('legacy-points-total');

        // --- 4. Populate Final Stats ---
        finalStatsList.innerHTML = ''; // Clear previous stats
        const realmName = allGameData.realms?.[gameState.cultivation.realmId]?.name || 'Mortal';
        const finalStats = {
            "Causa da Morte": allStrings.death_reasons[reason] || allStrings.death_reasons.unknown,
            "Idade Final": gameState.age,
            "Reino de Cultivo": `${realmName} (Nível ${gameState.cultivation.level})`,
            "Dinheiro": gameState.resources.money,
            "Técnicas Aprendidas": gameState.player.techniques?.length || 0
        };
        for (const [key, value] of Object.entries(finalStats)) {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${key}:</strong> ${value}`;
            finalStatsList.appendChild(li);
        }

        // --- 5. Populate Final Chronicle ---
        finalChronicleList.innerHTML = ''; // Clear previous log
        if (gameState.life_log) {
            gameState.life_log.forEach(log => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>Ano ${log.age}:</strong> ${log.message}`;
                li.classList.add(`log-type-${log.type}`);
                finalChronicleList.appendChild(li);
            });
        }

        // --- 6. Display Legacy Points ---
        legacyPointsEarnedEl.textContent = pointsEarned;
        legacyPointsTotalEl.textContent = legacyData.totalPoints;

        // --- 7. Show Screen & Clean Up ---
        elements.legacyScreen.classList.remove('hidden');
        localStorage.removeItem('immortalJourneySave');
    }

    function updateUI() {
        if (!gameState || !gameState.player) return;

        elements.playerName.textContent = gameState.player.name;
        elements.age.textContent = gameState.age;
        elements.lifespan.textContent = gameState.player.lifespan;
        // ... (update all other UI elements) ...

        if (gameState.life_log) {
            elements.lifeLogList.innerHTML = '';
            const recentLogs = gameState.life_log.slice(-15).reverse();
            recentLogs.forEach(log => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>Ano ${log.age}:</strong> ${log.message}`;
                li.classList.add(`log-type-${log.type}`);
                elements.lifeLogList.appendChild(li);
            });
        }
    }

    function startNewGame() {
        const playerGender = Math.random() < 0.5 ? 'masculino' : 'feminino';
        const player = generateCharacter('player', playerGender);

        const rivalGender = Math.random() < 0.5 ? 'masculino' : 'feminino';
        const rival = generateCharacter('rival_1', rivalGender);

        gameState = {
            player: player,
            npcs: { 'rival_1': rival },
            rivalId: 'rival_1',
            age: 6,
            resources: { money: 20, talentPoints: 5, contribution: 0 },
            cultivation: { realmId: 0, level: 1, qi: 0, maxQi: 10 },
            sect: { id: null, rank: 0 },
            triggeredEvents: [],
            active_mission: null,
            life_log: [],
            relationships: {
                'rival_1': { score: 0, state: 'neutral' }
            }
        };

        addLogMessage("Você nasceu. O mundo aguarda para testemunhar sua lenda.", "milestone", true);
        updateUI();
        saveGameState();
        checkAndTriggerEvents();
    }

    function initializeGame() {
        const savedGame = localStorage.getItem('immortalJourneySave');
        if (savedGame) {
            gameState = JSON.parse(savedGame);
            if (!gameState.life_log) gameState.life_log = []; // Backwards compatibility
        } else {
            startNewGame();
        }

        // This space intentionally left blank after removing testing code.

        // Attach event listeners
        elements.nextYearBtn.addEventListener('click', advanceYear);
        elements.meditateBtn.addEventListener('click', meditate);
        elements.talentsBtn.addEventListener('click', () => elements.talentsScreen.style.display = 'block');
        elements.closeTalentsBtn.addEventListener('click', () => elements.talentsScreen.style.display = 'none');
        elements.sectActionsBtn.addEventListener('click', () => handleSpecialEffects('show_sect_actions'));
        elements.startNewJourneyBtn.addEventListener('click', () => {
             localStorage.removeItem('immortalJourneySave');
             elements.legacyScreen.style.display = 'none';
             startNewGame();
        });
        elements.resetProgressBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.reload();
        });

        updateUI();
    }

    // --- START ---
    loadGameData();
});
