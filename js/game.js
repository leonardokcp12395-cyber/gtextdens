document.addEventListener('DOMContentLoaded', () => {
    // --- VARIÁVEIS GLOBAIS ---
    let gameState = {};
    let allGameData = {};
    let allStrings = {};
    let combatState = {};

    // --- ELEMENTOS DA UI ---
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
        relationshipsList: document.getElementById('relationships-list')
    };

    // --- CARREGAMENTO DE DADOS ---
    async function loadGameData() {
        try {
            const responses = await Promise.all([
                fetch('data/events.json'), fetch('data/items.json'), fetch('data/sects.json'),
                fetch('data/enemies.json'), fetch('data/talents.json'), fetch('data/strings.json'),
                fetch('data/random_events.json'), fetch('data/nomes.json'), fetch('data/personalidades.json')
            ]);
            for (const res of responses) {
                if (!res.ok) throw new Error(`Falha ao carregar ${res.url}`);
            }
            const [events, items, sects, enemies, talents, strings, randomEvents, nomes, personalidades] = await Promise.all(responses.map(res => res.json()));
            allGameData = { events, items, sects, enemies, talents, randomEvents, nomes, personalidades };
            allStrings = strings;
            initializeGame();
        } catch (error) {
            console.error("Falha fatal ao carregar os dados do jogo:", error);
            elements.eventContent.innerHTML = "<p>ERRO CRÍTICO: Não foi possível carregar os ficheiros de dados.</p>";
        }
    }

    // --- LÓGICA DE GERAÇÃO PROCESSUAL ---
    function getRandomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function generateCharacter(id, gender) {
        const { nomes, personalidades } = allGameData;
        const firstName = getRandomElement(nomes[gender]);
        const lastName = getRandomElement(nomes.apelidos);
        const personality = getRandomElement(personalidades);
        const baseAttributes = { body: 10, mind: 10, soul: 10, luck: 5 };
        return {
            id, name: `${firstName} ${lastName}`, gender, personality,
            attributes: { ...baseAttributes },
            combat: {
                maxHp: baseAttributes.body * 5, hp: baseAttributes.body * 5,
                attack: 5 + Math.floor(baseAttributes.body / 2),
                defense: 2 + Math.floor(baseAttributes.mind / 5)
            }
        };
    }

    // --- LÓGICA DE JOGO PRINCIPAL ---
    function processText(text) {
        if (!text) return '';
        const rival = gameState.npcs.rival;
        let processedText = text.replace(/\[RIVAL\]/g, rival ? rival.name : 'Rival');
        return processedText.replace(/\[PLAYER_NAME\]/g, gameState.player.name);
    }

    function applyEffects(effects) {
        if (!effects) return;
        if (effects.attributes) {
            for (const attr in effects.attributes) if (gameState.player.attributes.hasOwnProperty(attr)) gameState.player.attributes[attr] += effects.attributes[attr];
        }
        if (effects.resources) {
            for (const res in effects.resources) if (gameState.resources.hasOwnProperty(res)) gameState.resources[res] += effects.resources[res];
        }
        if (effects.combat) {
            for (const stat in effects.combat) if (gameState.player.combat.hasOwnProperty(stat)) gameState.player.combat[stat] += effects.combat[stat];
        }
        if (effects.relationships) {
            for (const npcId in effects.relationships) if (gameState.relationships.hasOwnProperty(npcId)) gameState.relationships[npcId].score += effects.relationships[npcId];
        }
        if (effects.special) handleSpecialEffects(effects.special);
    }

    function handleSpecialEffects(effect) {
        const combatMatch = effect.match(/^start_combat_(.+)/);
        if (combatMatch) { startCombat(combatMatch[1]); return; }
        const joinSectMatch = effect.match(/^join_sect_(.+)/);
        if (joinSectMatch) { gameState.sect.id = joinSectMatch[1]; return; }

        switch (effect) {
            case 'show_sect_actions': showSectActions(); break;
            case 'show_sect_store': showSectStore(); break;
            case 'try_promotion': tryPromotion(); break;
            // ... outros casos
            default: console.warn(`Efeito especial não reconhecido: ${effect}`);
        }
    }

    function showEvent(event) {
        elements.eventContent.innerHTML = `<p>${processText(event.text)}</p>`;
        elements.choicesContainer.innerHTML = '';
        event.choices.forEach(choice => {
            const button = document.createElement('button');
            button.textContent = processText(choice.text);
            button.onclick = () => {
                if (choice.effects && choice.effects.special) {
                    applyEffects(choice.effects);
                    // Efeitos especiais cuidam da sua própria UI
                } else {
                    applyEffects(choice.effects);
                    const resultText = allStrings[choice.resultKey] || "Chave de texto não encontrada.";
                    elements.eventContent.innerHTML = `<p>${processText(resultText)}</p>`;
                    elements.choicesContainer.innerHTML = '';
                    elements.actionsContainer.classList.remove('hidden');
                    updateUI();
                }
            };
            elements.choicesContainer.appendChild(button);
        });
        elements.actionsContainer.classList.add('hidden');
    }

    function updateUI() {
        elements.playerName.textContent = gameState.player.name;
        elements.age.textContent = gameState.age;
        elements.body.textContent = gameState.player.attributes.body;
        elements.mind.textContent = gameState.player.attributes.mind;
        elements.money.textContent = gameState.resources.money;
        elements.talentPoints.textContent = gameState.resources.talentPoints;
        elements.contribution.textContent = gameState.resources.contribution;

        elements.sectActionsBtn.classList.toggle('hidden', !gameState.sect.id);

        if (gameState.cultivation) {
            elements.realm.textContent = gameState.cultivation.realm;
            elements.level.textContent = gameState.cultivation.level;
            elements.qi.textContent = gameState.cultivation.qi;
            elements.maxQi.textContent = gameState.cultivation.maxQi;
            if (gameState.cultivation.qi >= gameState.cultivation.maxQi) {
                elements.meditateBtn.textContent = `Tentar Avanço`;
                elements.meditateBtn.classList.add('breakthrough-ready');
            } else {
                elements.meditateBtn.textContent = 'Meditar';
                elements.meditateBtn.classList.remove('breakthrough-ready');
            }
        }
        elements.relationshipsList.innerHTML = '';
        for (const npcId in gameState.relationships) {
            const npc = gameState.npcs[npcId];
            const rel = gameState.relationships[npcId];
            if (npc) {
                const li = document.createElement('li');
                li.textContent = `${npc.name}: ${rel.state} (${rel.score})`;
                elements.relationshipsList.appendChild(li);
            }
        }
    }

    function advanceYear() {
        if (gameState.sect.id) {
            const sectData = allGameData.sects.find(s => s.id === gameState.sect.id);
            if (sectData && sectData.benefit) {
                if (sectData.benefit.type === 'passive_qi_gain') gameState.cultivation.qi = Math.min(gameState.cultivation.maxQi, gameState.cultivation.qi + sectData.benefit.value);
                if (sectData.benefit.type === 'body_cultivation_boost' && (gameState.age % 5 === 0)) gameState.player.attributes.body += sectData.benefit.value;
            }
        }
        gameState.age++;
        const eventForAge = allGameData.events.find(event => {
            if (event.age !== gameState.age) return false;
            if (event.condition) {
                if (event.condition.failedSpecial && gameState.lastFailedSpecial === event.condition.failedSpecial) return true;
                return false;
            }
            return true;
        });
        if (eventForAge) {
            showEvent(eventForAge);
            if (eventForAge.condition) gameState.lastFailedSpecial = null;
        } else {
            if (Math.random() < 0.25 && allGameData.randomEvents && allGameData.randomEvents.length > 0) {
                const randomEvent = allGameData.randomEvents[Math.floor(Math.random() * allGameData.randomEvents.length)];
                showEvent(randomEvent);
            } else {
                elements.eventContent.innerHTML = `<p>${processText(`Você completou ${gameState.age} anos. O tempo passa em meditação e treino.`)}</p>`;
                elements.actionsContainer.classList.remove('hidden');
            }
        }
        updateUI();
        updateRelationshipStates();
    }

    // --- LÓGICA DE SEITA ---
    function showSectActions() {
        const sectEvent = {
            text: "Você está no pátio da sua seita. O que deseja fazer?",
            choices: [
                { text: "Ver Loja", effects: { special: 'show_sect_store' } },
                { text: "Tentar Promoção", effects: { special: 'try_promotion' } },
                { text: "Sair", effects: {}, resultKey: "sect_actions_leave" }
            ]
        };
        showEvent(sectEvent);
    }

    function showSectStore() {
        const sectData = allGameData.sects.find(s => s.id === gameState.sect.id);
        elements.eventContent.innerHTML = `<h2>Loja da Seita</h2><p>Sua Contribuição: ${gameState.resources.contribution}</p>`;
        elements.choicesContainer.innerHTML = '';
        sectData.store.forEach(storeItem => {
            const itemData = allGameData.items.find(i => i.id === storeItem.id);
            const button = document.createElement('button');
            button.innerHTML = `${itemData.name} <br><small>${itemData.description} (Custo: ${storeItem.cost_contribution})</small>`;
            if (gameState.resources.contribution < storeItem.cost_contribution) {
                button.disabled = true;
            }
            button.onclick = () => {
                gameState.resources.contribution -= storeItem.cost_contribution;
                applyEffects(itemData.effects);
                addCombatLog(`Você comprou ${itemData.name}.`);
                updateUI();
                showSectStore();
            };
            elements.choicesContainer.appendChild(button);
        });
        const leaveButton = document.createElement('button');
        leaveButton.textContent = "Voltar";
        leaveButton.onclick = showSectActions;
        elements.choicesContainer.appendChild(leaveButton);
    }

    function tryPromotion() {
        // Lógica de promoção será implementada no futuro
        elements.eventContent.innerHTML = `<p>Você ainda não está pronto para uma promoção.</p>`;
        elements.choicesContainer.innerHTML = '';
        const leaveButton = document.createElement('button');
        leaveButton.textContent = "Voltar";
        leaveButton.onclick = showSectActions;
        elements.choicesContainer.appendChild(leaveButton);
    }

    // ... (outras funções de lógica)

    // --- INICIALIZAÇÃO ---
    function initializeGame() {
        const player = generateCharacter('player', 'masculino');
        const rival = generateCharacter('rival', 'masculino');
        gameState = {
            player, npcs: { [rival.id]: rival }, age: 0,
            resources: { money: 10, reputation: 0, talentPoints: 5, contribution: 0 },
            cultivation: { realm: 'Mortal', level: 1, qi: 0, maxQi: 100 },
            lastFailedSpecial: null, talents: [], sect: { id: null, rank: 0 },
            relationships: { [rival.id]: { score: 0, state: 'neutral' } }
        };
        elements.nextYearBtn.addEventListener('click', advanceYear);
        elements.meditateBtn.addEventListener('click', handleMeditateOrBreakthrough);
        elements.talentsBtn.addEventListener('click', showTalentScreen);
        elements.sectActionsBtn.addEventListener('click', showSectActions);
        elements.combatActions.addEventListener('click', (e) => {
            if (e.target.classList.contains('combat-action-btn')) playerTurn(e.target.dataset.action);
        });
        updateUI();
    }
    loadGameData();
});
