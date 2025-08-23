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
        talentPoints: document.getElementById('talent-points'),

        // Botões
        meditateBtn: document.getElementById('meditate-btn'),
        nextYearBtn: document.getElementById('next-year-btn'),
        talentsBtn: document.getElementById('talents-btn'),

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
                fetch('data/enemies.json'), fetch('data/talents.json'), fetch('data/strings.json'),
                fetch('data/random_events.json')
            ]);
            for (const res of responses) {
                if (!res.ok) throw new Error(`Falha ao carregar ${res.url}`);
            }
            const [events, items, sects, enemies, talents, strings, randomEvents] = await Promise.all(responses.map(res => res.json()));
            allGameData = { events, items, sects, enemies, talents, randomEvents };
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
        if (effects.combat) {
            for (const stat in effects.combat) {
                if (gameState.combat.hasOwnProperty(stat)) gameState.combat[stat] += effects.combat[stat];
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
        const joinSectMatch = effect.match(/^join_sect_(.+)/);
        if (joinSectMatch) {
            gameState.sect.id = joinSectMatch[1];
            // Futuramente, podemos adicionar mais efeitos aqui, como ganhar um item inicial.
            return; // O fluxo normal de UI já trata o resto
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
                    gameState.lastFailedSpecial = 'breakthrough_attempt';
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
        elements.talentPoints.textContent = gameState.resources.talentPoints;
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
        // Aplica benefícios passivos da seita no início do ano
        if (gameState.sect.id) {
            const sectData = allGameData.sects.find(s => s.id === gameState.sect.id);
            if (sectData && sectData.benefit) {
                if (sectData.benefit.type === 'passive_qi_gain') {
                    gameState.cultivation.qi = Math.min(gameState.cultivation.maxQi, gameState.cultivation.qi + sectData.benefit.value);
                }
                if (sectData.benefit.type === 'body_cultivation_boost' && (gameState.age % 5 === 0)) {
                    gameState.attributes.body += sectData.benefit.value;
                }
            }
        }

        gameState.age++;
        const eventForAge = allGameData.events.find(event => {
            if (event.age !== gameState.age) return false;
            if (event.condition) {
                if (event.condition.failedSpecial && gameState.lastFailedSpecial === event.condition.failedSpecial) {
                    return true;
                }
                return false;
            }
            return true;
        });
        if (eventForAge) {
            showEvent(eventForAge);
            if (eventForAge.condition) {
                gameState.lastFailedSpecial = null;
            }
        } else {
            if (Math.random() < 0.25 && allGameData.randomEvents && allGameData.randomEvents.length > 0) {
                const randomEvent = allGameData.randomEvents[Math.floor(Math.random() * allGameData.randomEvents.length)];
                showEvent(randomEvent);
            } else {
                elements.eventContent.innerHTML = `<p>Você completou ${gameState.age} anos. O tempo passa em meditação e treino.</p>`;
                elements.actionsContainer.classList.remove('hidden');
            }
        }
        updateUI();
    }

    // --- LÓGICA DE CULTIVO E TALENTOS ---
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
    function showTalentScreen() {
        elements.eventContent.innerHTML = `<h2>Árvore de Talentos</h2><p>Você tem <strong>${gameState.resources.talentPoints}</strong> pontos para gastar.</p>`;
        elements.choicesContainer.innerHTML = '';
        elements.actionsContainer.classList.add('hidden');
        allGameData.talents.forEach(talent => {
            const isAcquired = gameState.talents.includes(talent.id);
            if (isAcquired) return;
            const canAfford = gameState.resources.talentPoints >= talent.cost;
            const hasReqs = talent.requirements.every(req => gameState.talents.includes(req));
            const talentButton = document.createElement('button');
            talentButton.innerHTML = `${talent.name} <br><small>${talent.description} (Custo: ${talent.cost})</small>`;
            if (canAfford && hasReqs) {
                talentButton.onclick = () => {
                    gameState.resources.talentPoints -= talent.cost;
                    gameState.talents.push(talent.id);
                    applyEffects(talent.effects);
                    updateUI();
                    showTalentScreen();
                };
            } else {
                talentButton.disabled = true;
            }
            elements.choicesContainer.appendChild(talentButton);
        });
        const leaveButton = document.createElement('button');
        leaveButton.textContent = "Fechar";
        leaveButton.onclick = () => {
             elements.eventContent.innerHTML = "<p>Você volta a focar-se na sua jornada.</p>";
             elements.choicesContainer.innerHTML = '';
             elements.actionsContainer.classList.remove('hidden');
        };
        elements.choicesContainer.appendChild(leaveButton);
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
        combatState.player.hp = gameState.combat.hp;
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
        elements.combatLog.prepend(p);
    }

    function playerTurn(action) {
        if (combatState.turn !== 'player') return;
        combatState.player.isDefending = false;
        let turnOver = false;
        if (action === 'attack') {
            let playerDamage = Math.max(1, combatState.player.attack - combatState.enemy.defense);
            combatState.enemy.hp -= playerDamage;
            addCombatLog(`Você ataca e causa <span class="damage">${playerDamage}</span> de dano.`);
            turnOver = true;
        } else if (action === 'defend') {
            combatState.player.isDefending = true;
            addCombatLog(`Você assume uma postura defensiva.`);
            turnOver = true;
        } else if (action === 'qi_strike') {
            const qiCost = 20;
            if (gameState.cultivation.qi >= qiCost) {
                gameState.cultivation.qi -= qiCost;
                let playerDamage = Math.max(1, combatState.player.attack + gameState.attributes.mind - combatState.enemy.defense);
                combatState.enemy.hp -= playerDamage;
                addCombatLog(`Você concentra seu Qi e desfere um golpe poderoso, causando <span class="damage">${playerDamage}</span> de dano!`);
                turnOver = true;
            } else {
                addCombatLog(`Você não tem Qi suficiente para usar esta técnica.`);
            }
        }
        updateCombatUI();
        updateUI();
        if (combatState.enemy.hp <= 0) {
            endCombat('win');
            return;
        }
        if (turnOver) {
            combatState.turn = 'enemy';
            setTimeout(enemyTurn, 1000);
        }
    }

    function enemyTurn() {
        if (combatState.turn !== 'enemy') return;
        let playerDefense = combatState.player.defense;
        if (combatState.player.isDefending) {
            playerDefense *= 2;
        }
        let enemyDamage = Math.max(1, combatState.enemy.attack - playerDefense);
        gameState.combat.hp -= enemyDamage;
        combatState.player.hp = gameState.combat.hp;
        addCombatLog(`${combatState.enemy.name} ataca! ${combatState.player.isDefending ? 'Sua defesa amortece o golpe.' : ''} Ele causa <span class="damage-enemy">${enemyDamage}</span> de dano.`);
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
        } else {
            elements.eventContent.innerHTML = `<p>${allStrings[`combat_lose_${combatState.enemy.id}`]}</p>`;
            gameState.resources.money = Math.max(0, gameState.resources.money - 10);
            gameState.combat.hp = 1;
        }
        combatState = {};
        updateUI();
    }

    // --- INICIALIZAÇÃO ---
    function initializeGame() {
        const baseAttributes = { body: 10, mind: 10, soul: 10, luck: 5 };
        gameState = {
            age: 0,
            attributes: baseAttributes,
            resources: { money: 10, reputation: 0, talentPoints: 5 },
            cultivation: { realm: 'Mortal', level: 1, qi: 0, maxQi: 100 },
            lastFailedSpecial: null,
            talents: [],
            sect: { id: null, rank: null },
            combat: {
                maxHp: baseAttributes.body * 5,
                hp: baseAttributes.body * 5,
                attack: 5 + Math.floor(baseAttributes.body / 2),
                defense: 2 + Math.floor(baseAttributes.mind / 5)
            }
        };
        elements.nextYearBtn.addEventListener('click', advanceYear);
        elements.meditateBtn.addEventListener('click', handleMeditateOrBreakthrough);
        elements.talentsBtn.addEventListener('click', showTalentScreen);
        elements.combatActions.addEventListener('click', (e) => {
            if (e.target.classList.contains('combat-action-btn')) {
                playerTurn(e.target.dataset.action);
            }
        });
        updateUI();
    }
    loadGameData();
});
