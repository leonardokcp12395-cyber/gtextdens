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
            case 'min_sect_rank':
                if (!gameState.sect.id || gameState.sect.rank < value) return false;
                break;
            case 'rival_relationship_state':
                const rivalRelationship = gameState.relationships[gameState.rivalId];
                if (!rivalRelationship || rivalRelationship.state !== value) return false;
                break;
            case 'rival_in_same_sect':
                const rival = gameState.npcs[gameState.rivalId];
                const player = gameState.player;
                if(value === true && player.sectId !== rival.sectId) return false;
                if(value === false && player.sectId === rival.sectId && player.sectId !== null) return false;
                break;
            case 'probability':
                if (Math.random() > value) return false;
                break;
            // Adiciona mais condições aqui conforme precisares
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
    if (!effects) return;

    // Atributos do Jogador
    if (effects.attributes) {
        for (const attr in effects.attributes) {
            gameState.player.attributes[attr] = (gameState.player.attributes[attr] || 0) + effects.attributes[attr];
        }
    }
    // Recursos
    if (effects.resources) {
        for (const res in effects.resources) {
            gameState.resources[res] = (gameState.resources[res] || 0) + effects.resources[res];
        }
    }
    // Cultivo
    if (effects.cultivation) {
        for (const cult in effects.cultivation) {
            gameState.cultivation[cult] = (gameState.cultivation[cult] || 0) + effects.cultivation[cult];
        }
    }
    // Combate (bónus passivos)
    if (effects.combat) {
        for (const stat in effects.combat) {
            gameState.player.combat[stat] = (gameState.player.combat[stat] || 0) + effects.combat[stat];
        }
    }
    // Relações
    if (effects.relationships) {
        for (const npcKey in effects.relationships) { // ex: "rival"
            const npcId = npcKey === 'rival' ? gameState.rivalId : npcKey;
            if (gameState.relationships[npcId]) {
                gameState.relationships[npcId].score += effects.relationships[npcKey];
            }
        }
    }
     // Efeitos especiais são tratados à parte
    if (effects.special) {
        handleSpecialEffects(effects.special);
    }
}

// Adiciona esta função (podes expandi-la depois)
function handleSpecialEffects(effectKey) {
    addLogMessage(`Efeito especial ativado: ${effectKey}`, 'notification');

    if (effectKey.startsWith('learn_technique_')) {
        const techId = effectKey.replace('learn_technique_', '');
        if (!gameState.player.techniques.includes(techId)) {
            gameState.player.techniques.push(techId);
            const tech = allGameData.techniques.find(t => t.id === techId);
            if(tech.effects) applyEffects(tech.effects); // Aplica efeitos passivos da técnica
            addLogMessage(`Você aprendeu a técnica: ${tech.name}!`, 'milestone', true);
        }
        return;
    }

    switch (effectKey) {
        case 'start_combat_rival':
            // Esta função vai buscar os dados atualizados do rival em vez de um inimigo genérico
            const rivalData = {
                id: gameState.rivalId,
                name: gameState.npcs[gameState.rivalId].name,
                combat: gameState.npcs[gameState.rivalId].combat,
                techniques: gameState.npcs[gameState.rivalId].techniques || []
            };
            startCombat(rivalData);
            break;
        case 'face_tribulation':
            // Lógica para a tribulação aqui...
            addLogMessage("Os céus rugem enquanto você enfrenta a tribulação!", "milestone", true);
            // ... um combate especial ou uma série de testes de atributos poderiam acontecer aqui.
            break;
        // Adiciona mais 'cases' para os outros efeitos especiais do teu events.json
        default:
            console.warn(`Efeito especial não implementado: ${effectKey}`);
    }
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

    function addCombatLog(message) {
        const logEntry = document.createElement('p');
        logEntry.textContent = message;
        elements.combatLog.appendChild(logEntry);
        // Scroll to the bottom
        elements.combatLog.scrollTop = elements.combatLog.scrollHeight;
    }

    function startCombat(enemyData) {
        combatState = {
            player: { ...gameState.player.combat },
            enemy: { ...enemyData.combat },
            enemyInfo: enemyData,
            turn: 'player'
        };
        elements.combatLog.innerHTML = ''; // Clear previous combat logs
        elements.combatScreen.classList.remove('hidden');
        elements.actionsContainer.classList.add('hidden');
        updateCombatUI();
        addLogMessage(`Você entrou em combate com ${enemyData.name}!`, 'event', true);
        addCombatLog(`Você enfrenta ${enemyData.name}!`);
    }

    function updateCombatUI() {
        elements.combatPlayerHp.textContent = `${combatState.player.hp} / ${combatState.player.maxHp}`;
        elements.combatEnemyName.textContent = combatState.enemyInfo.name;
        elements.combatEnemyHp.textContent = `${combatState.enemy.hp} / ${combatState.enemy.maxHp}`;

        // Gera as ações do jogador
        elements.combatActions.innerHTML = '';
        const attackBtn = document.createElement('button');
        attackBtn.textContent = 'Ataque Físico';
        attackBtn.className = 'combat-action-btn';
        attackBtn.onclick = () => takeCombatTurn('attack');
        elements.combatActions.appendChild(attackBtn);

        // Adiciona botões para técnicas de combate ativas aqui no futuro
    }

    function takeCombatTurn(action) {
        // Lógica do turno do jogador
        let playerDamage = Math.max(1, combatState.player.attack - combatState.enemy.defense);
        combatState.enemy.hp -= playerDamage;
        addCombatLog(`Você ataca e causa ${playerDamage} de dano!`);

        updateCombatUI();
        if (combatState.enemy.hp <= 0) {
            endCombat(true);
            return;
        }

        // Lógica do turno do inimigo (simples por agora)
        setTimeout(() => {
            let enemyDamage = Math.max(1, combatState.enemy.attack - combatState.player.defense);
            combatState.player.hp -= enemyDamage;
            addCombatLog(`${combatState.enemyInfo.name} ataca e causa ${enemyDamage} de dano!`);

            updateCombatUI();
            if (combatState.player.hp <= 0) {
                endCombat(false);
                return;
            }
        }, 1000); // Pequeno atraso para dar tempo de ler
    }

    function endCombat(playerWon) {
        elements.combatScreen.classList.add('hidden');
        elements.actionsContainer.classList.remove('hidden');

        if (playerWon) {
            addLogMessage(`Você derrotou ${combatState.enemyInfo.name}!`, 'reward', true);
            // Adiciona recompensas de combate aqui (dinheiro, itens, etc.)
        } else {
            addLogMessage(`Você foi derrotado por ${combatState.enemyInfo.name}...`, 'combat', true);
            gameState.player.combat.hp = 1; // Sobrevive por pouco
            endGame('combat'); // Ou termina o jogo
        }
        updateUI();
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
