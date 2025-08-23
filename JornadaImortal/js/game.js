document.addEventListener('DOMContentLoaded', () => {
    // --- VARIÁVEIS GLOBAIS ---
    let gameState = {};
    let allGameData = {};
    let allStrings = {};
    let combatState = {};

    // --- ELEMENTOS DA UI ---
    const elements = {
        // Painéis
        eventContent: document.getElementById('event-content'),
        choicesContainer: document.getElementById('choices-container'),
        actionsContainer: document.getElementById('actions-container'),
        combatScreen: document.getElementById('combat-screen'),

        // Atributos
        age: document.getElementById('char-age'),
        body: document.getElementById('attr-body'),
        mind: document.getElementById('attr-mind'),

        // Cultivo
        realm: document.getElementById('cult-realm'),
        level: document.getElementById('cult-level'),
        qi: document.getElementById('cult-qi'),
        maxQi: document.getElementById('cult-max-qi'),

        // Recursos
        money: document.getElementById('res-money'),

        // Botões
        meditateBtn: document.getElementById('meditate-btn'),
        nextYearBtn: document.getElementById('next-year-btn'),

        // Combate
        combatPlayerHp: document.getElementById('combat-player-hp'),
        combatEnemyName: document.getElementById('combat-enemy-name'),
        combatEnemyHp: document.getElementById('combat-enemy-hp'),
        combatLog: document.getElementById('combat-log'),
        combatActions: document.getElementById('combat-actions')
    };

    // --- CARREGAMENTO DE DADOS ---
    async function loadGameData() {
        try {
            const responses = await Promise.all([
                fetch('data/events.json'), fetch('data/items.json'), fetch('data/sects.json'),
                fetch('data/enemies.json'), fetch('data/talents.json'), fetch('data/strings.json')
            ]);
            for (const res of responses) {
                if (!res.ok) throw new Error(`Falha ao carregar ${res.url}`);
            }
            const [events, items, sects, enemies, talents, strings] = await Promise.all(responses.map(res => res.json()));
            allGameData = { events, items, sects, enemies, talents };
            allStrings = strings;
            initializeGame();
        } catch (error) {
            console.error("Falha fatal ao carregar os dados do jogo:", error);
            elements.eventContent.innerHTML = "<p>ERRO CRÍTICO: Não foi possível carregar os ficheiros de dados. Tente recarregar a página.</p>";
        }
    }

    // --- LÓGICA DE JOGO PRINCIPAL ---
    function applyEffects(effects) {
        if (!effects) return;
        if (effects.attributes) {
            for (const attr in effects.attributes) {
                if (gameState.attributes.hasOwnProperty(attr)) gameState.attributes[attr] += effects.attributes[attr];
            }
        }
        if (effects.resources) {
            for (const res in effects.resources) {
                if (gameState.resources.hasOwnProperty(res)) gameState.resources[res] += effects.resources[res];
            }
        }
        if (effects.special) handleSpecialEffects(effects.special);
    }

    function handleSpecialEffects(effect) {
        const combatMatch = effect.match(/^start_combat_(.+)/);
        if (combatMatch) {
            startCombat(combatMatch[1]);
            return;
        }
        switch (effect) {
            case 'explore_cave':
                elements.choicesContainer.innerHTML = '';
                if (Math.random() < 0.5) {
                    elements.eventContent.innerHTML = `<p>${allStrings['explore_cave_success']}</p>`;
                    gameState.attributes.mind += 2;
                } else {
                    elements.eventContent.innerHTML = `<p>${allStrings['explore_cave_failure']}</p>`;
                    gameState.attributes.body -= 1;
                }
                elements.actionsContainer.classList.remove('hidden');
                updateUI();
                break;
            case 'triggerBreakthroughEvent':
                const breakthroughEvent = allGameData.events.find(e => e.id === 'breakthrough_attempt');
                if (breakthroughEvent) showEvent(breakthroughEvent);
                break;
            case 'attempt_breakthrough_roll':
                const { cultivation, attributes } = gameState;
                const successChance = 0.5 + (attributes.luck * 0.02);
                if (Math.random() < successChance) {
                    cultivation.level++;
                    cultivation.qi = 0;
                    cultivation.maxQi = Math.floor(cultivation.maxQi * 1.5);
                    elements.eventContent.innerHTML = `<p>${allStrings['breakthrough_success']}</p>`;
                } else {
                    cultivation.qi = Math.floor(cultivation.qi / 2);
                    elements.eventContent.innerHTML = `<p>${allStrings['breakthrough_failure']}</p>`;
                }
                elements.choicesContainer.innerHTML = '';
                elements.actionsContainer.classList.remove('hidden');
                updateUI();
                break;
            default:
                console.warn(`Efeito especial não reconhecido: ${effect}`);
        }
    }

    function showEvent(event) {
        elements.eventContent.innerHTML = `<p>${event.text}</p>`;
        elements.choicesContainer.innerHTML = '';
        event.choices.forEach(choice => {
            const button = document.createElement('button');
            button.textContent = choice.text;
            button.onclick = () => {
                if (choice.effects && choice.effects.special) {
                    applyEffects(choice.effects);
                } else {
                    applyEffects(choice.effects);
                    const resultText = allStrings[choice.resultKey] || "Chave de texto não encontrada.";
                    elements.eventContent.innerHTML = `<p>${resultText}</p>`;
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
        elements.age.textContent = gameState.age;
        elements.body.textContent = gameState.attributes.body;
        elements.mind.textContent = gameState.attributes.mind;
        elements.money.textContent = gameState.resources.money;
        if (gameState.cultivation) {
            elements.realm.textContent = gameState.cultivation.realm;
            elements.level.textContent = gameState.cultivation.level;
            elements.qi.textContent = gameState.cultivation.qi;
            elements.maxQi.textContent = gameState.cultivation.maxQi;
            const { cultivation } = gameState;
            if (cultivation.qi >= cultivation.maxQi) {
                elements.meditateBtn.textContent = `Tentar Avanço`;
                elements.meditateBtn.classList.add('breakthrough-ready');
            } else {
                elements.meditateBtn.textContent = 'Meditar';
                elements.meditateBtn.classList.remove('breakthrough-ready');
            }
        }
    }

    function advanceYear() {
        gameState.age++;
        const eventForAge = allGameData.events.find(event => event.age === gameState.age);
        if (eventForAge) {
            showEvent(eventForAge);
        } else {
            elements.eventContent.innerHTML = `<p>Você completou ${gameState.age} anos. O tempo passa.</p>`;
        }
        updateUI();
    }

    // --- LÓGICA DE CULTIVO ---
    function meditate() {
        const { cultivation, attributes } = gameState;
        if (cultivation.qi >= cultivation.maxQi) return;
        const qiGained = 5 + Math.floor(attributes.mind / 2);
        cultivation.qi = Math.min(cultivation.qi + qiGained, cultivation.maxQi);
        updateUI();
    }
    function handleMeditateOrBreakthrough() {
        if (gameState.cultivation.qi >= gameState.cultivation.maxQi) {
            handleSpecialEffects('triggerBreakthroughEvent');
        } else {
            meditate();
        }
    }

    // --- LÓGICA DE COMBATE ---
    function startCombat(enemyId) {
        const enemyData = allGameData.enemies.find(e => e.id === enemyId);
        if (!enemyData) return;
        elements.eventContent.classList.add('hidden');
        elements.choicesContainer.classList.add('hidden');
        elements.actionsContainer.classList.add('hidden');
        elements.combatScreen.classList.remove('hidden');
        combatState = {
            player: { ...gameState.combat },
            enemy: { ...enemyData.attributes, name: enemyData.name, id: enemyData.id },
            turn: 'player'
        };
        combatState.player.hp = gameState.combat.hp; // Certifica-se que o HP atual é usado
        updateCombatUI();
        addCombatLog(`Você entrou em combate com ${combatState.enemy.name}!`);
    }

    function updateCombatUI() {
        elements.combatPlayerHp.textContent = `${combatState.player.hp} / ${gameState.combat.maxHp}`;
        elements.combatEnemyName.textContent = combatState.enemy.name;
        elements.combatEnemyHp.textContent = combatState.enemy.hp;
    }

    function addCombatLog(message) {
        const p = document.createElement('p');
        p.innerHTML = message;
        elements.combatLog.prepend(p); // Adiciona a nova mensagem no topo
    }

    function playerTurn(action) {
        if (combatState.turn !== 'player') return;
        let playerDamage = Math.max(1, combatState.player.attack - combatState.enemy.defense);
        combatState.enemy.hp -= playerDamage;
        addCombatLog(`Você ataca e causa <span class="damage">${playerDamage}</span> de dano.`);
        updateCombatUI();
        if (combatState.enemy.hp <= 0) {
            endCombat('win');
            return;
        }
        combatState.turn = 'enemy';
        setTimeout(enemyTurn, 1000);
    }

    function enemyTurn() {
        if (combatState.turn !== 'enemy') return;
        let enemyDamage = Math.max(1, combatState.enemy.attack - combatState.player.defense);
        gameState.combat.hp -= enemyDamage;
        combatState.player.hp = gameState.combat.hp;
        addCombatLog(`${combatState.enemy.name} ataca e causa <span class="damage-enemy">${enemyDamage}</span> de dano.`);
        updateCombatUI();
        if (combatState.player.hp <= 0) {
            endCombat('lose');
            return;
        }
        combatState.turn = 'player';
    }

    function endCombat(result) {
        elements.combatScreen.classList.add('hidden');
        elements.eventContent.classList.remove('hidden');
        elements.actionsContainer.classList.remove('hidden');
        elements.combatLog.innerHTML = '';

        if (result === 'win') {
            elements.eventContent.innerHTML = `<p>${allStrings[`combat_win_${combatState.enemy.id}`]}</p>`;
            gameState.attributes.body++;
            // Futuramente, adicionar loot e outras recompensas aqui.
        } else {
            elements.eventContent.innerHTML = `<p>${allStrings[`combat_lose_${combatState.enemy.id}`]}</p>`;
            gameState.resources.money = Math.max(0, gameState.resources.money - 10);
            gameState.combat.hp = 1; // Recupera com 1 de HP para poder continuar.
        }

        combatState = {}; // Limpa o estado de combate
        updateUI();
    }

    // --- INICIALIZAÇÃO ---
    function initializeGame() {
        const baseAttributes = { body: 10, mind: 10, soul: 10, luck: 5 };
        gameState = {
            age: 0,
            attributes: baseAttributes,
            resources: { money: 10, reputation: 0, talentPoints: 0 },
            cultivation: { realm: 'Mortal', level: 1, qi: 0, maxQi: 100 },
            combat: {
                maxHp: baseAttributes.body * 5,
                hp: baseAttributes.body * 5,
                attack: 5 + Math.floor(baseAttributes.body / 2),
                defense: 2 + Math.floor(baseAttributes.mind / 5)
            }
        };
        elements.nextYearBtn.addEventListener('click', advanceYear);
        elements.meditateBtn.addEventListener('click', handleMeditateOrBreakthrough);
        elements.combatActions.addEventListener('click', (e) => {
            if (e.target.classList.contains('combat-action-btn')) {
                playerTurn(e.target.dataset.action);
            }
        });
        updateUI();
    }
    loadGameData();
});
