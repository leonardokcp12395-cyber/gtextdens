document.addEventListener('DOMContentLoaded', () => {
    // --- VARIÁVEIS GLOBAIS ---
    let gameState = {};
    let allGameData = {};
    let allStrings = {};

    // --- ELEMENTOS DA UI ---
    const elements = {
        age: document.getElementById('char-age'),
        body: document.getElementById('attr-body'),
        mind: document.getElementById('attr-mind'),
        realm: document.getElementById('cult-realm'),
        level: document.getElementById('cult-level'),
        qi: document.getElementById('cult-qi'),
        maxQi: document.getElementById('cult-max-qi'),
        money: document.getElementById('res-money'),
        eventContent: document.getElementById('event-content'),
        choicesContainer: document.getElementById('choices-container'),
        meditateBtn: document.getElementById('meditate-btn'),
        nextYearBtn: document.getElementById('next-year-btn')
    };

    // --- FUNÇÃO DE CARREGAMENTO DE DADOS ---
    async function loadGameData() {
        try {
            const [eventsRes, itemsRes, sectsRes, enemiesRes, talentsRes, stringsRes] = await Promise.all([
                fetch('events.json'),
                fetch('items.json'),
                fetch('sects.json'),
                fetch('enemies.json'),
                fetch('talents.json'),
                fetch('strings.json')
            ]);

            allGameData = {
                events: await eventsRes.json(),
                items: await itemsRes.json(),
                sects: await sectsRes.json(),
                enemies: await enemiesRes.json(),
                talents: await talentsRes.json()
            };
            allStrings = await stringsRes.json();

            console.log("Dados do jogo carregados!", allGameData);
            initializeGame();
        } catch (error) {
            console.error("Falha ao carregar os dados do jogo:", error);
        }
    }

    // --- FUNÇÕES DE LÓGICA DO JOGO ---

    function applyEffects(effects) {
        if (!effects) return;

        if (effects.attributes) {
            for (const attr in effects.attributes) {
                if (gameState.attributes.hasOwnProperty(attr)) {
                    gameState.attributes[attr] += effects.attributes[attr];
                }
            }
        }
        if (effects.resources) {
            for (const res in effects.resources) {
                if (gameState.resources.hasOwnProperty(res)) {
                    gameState.resources[res] += effects.resources[res];
                }
            }
        }
        if (effects.special) {
            handleSpecialEffects(effects.special);
        }
    }

    function handleSpecialEffects(effect) {
        const combatMatch = effect.match(/^start_combat_(.+)/);
        if (combatMatch) {
            startCombat(combatMatch[1]);
            return;
        }

        switch (effect) {
            case 'explore_cave':
                if (Math.random() < 0.5) {
                    elements.eventContent.innerHTML = `<p>${allStrings['explore_cave_success']}</p>`;
                    gameState.attributes.mind += 2;
                } else {
                    elements.eventContent.innerHTML = `<p>${allStrings['explore_cave_failure']}</p>`;
                    gameState.attributes.body -= 1;
                }
                elements.choicesContainer.innerHTML = '';
                elements.nextYearBtn.style.display = 'block';
                updateUI();
                break;
            case 'triggerBreakthroughEvent':
                const breakthroughEvent = allGameData.events.find(e => e.id === 'breakthrough_attempt');
                if (breakthroughEvent) {
                    showEvent(breakthroughEvent);
                }
                break;
            case 'attempt_breakthrough_roll':
                const cultivation = gameState.cultivation;
                const luck = gameState.attributes.luck;
                const successChance = 0.5 + (luck * 0.02); // 50% base + 2% por ponto de sorte

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
                elements.nextYearBtn.style.display = 'block';
                updateUI();
                break;
            default:
                console.warn(`Efeito especial não reconhecido: ${effect}`);
        }
    }

    function startCombat(enemyId) {
        const enemy = allGameData.enemies.find(e => e.id === enemyId);
        if (!enemy) {
            console.error(`Inimigo não encontrado: ${enemyId}`);
            return;
        }

        const playerBody = gameState.attributes.body;
        const enemyBody = enemy.attributes.body;

        if (playerBody > enemyBody) {
            // Vitória
            elements.eventContent.innerHTML = `<p>${allStrings[`combat_win_${enemyId}`]}</p>`;
            gameState.attributes.body++; // Recompensa
        } else {
            // Derrota
            elements.eventContent.innerHTML = `<p>${allStrings[`combat_lose_${enemyId}`]}</p>`;
            gameState.resources.money = Math.max(0, gameState.resources.money - 10); // Penalidade
            gameState.attributes.body--;
        }

        elements.choicesContainer.innerHTML = '';
        elements.nextYearBtn.style.display = 'block';
        updateUI();
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
                    const resultText = allStrings[choice.resultKey] || "Chave de texto não encontrada: " + choice.resultKey;
                    elements.eventContent.innerHTML = `<p>${resultText}</p>`;
                    elements.choicesContainer.innerHTML = '';
                    elements.nextYearBtn.style.display = 'block';
                    updateUI();
                }
            };
            elements.choicesContainer.appendChild(button);
        });

        elements.nextYearBtn.style.display = 'none';
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

    // --- FUNÇÃO DE INICIALIZAÇÃO ---
    function initializeGame() {
        gameState = {
            age: 0,
            attributes: { body: 10, mind: 10, soul: 10, luck: 5 },
            resources: { money: 10, reputation: 0, talentPoints: 0 },
            cultivation: { realm: 'Mortal', level: 1, qi: 0, maxQi: 100 }
        };

        elements.nextYearBtn.addEventListener('click', advanceYear);
        elements.meditateBtn.addEventListener('click', handleMeditateOrBreakthrough);

        console.log("O jogo começou!");
        updateUI();
    }

    // --- PONTO DE PARTIDA ---
    loadGameData();
});
