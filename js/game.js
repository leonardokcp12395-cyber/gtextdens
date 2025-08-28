document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTS ---
    const LEGACY_BONUSES = [
        { id: 'start_with_more_money', name: 'Herança Abastada', description: 'Comece sua próxima vida com 100 moedas extras.', cost: 100, type: 'resource', effects: { resources: { money: 100 } } },
        { id: 'start_with_stronger_body', name: 'Fundação Corporal Robusta', description: 'Sua linhagem tem corpos naturalmente fortes. Comece com +5 em Corpo.', cost: 200, type: 'attribute', effects: { attributes: { body: 5 } } },
        { id: 'start_with_sharper_mind', name: 'Mente Desperta', description: 'Sua alma reencarna com uma mente afiada. Comece com +5 em Mente.', cost: 200, type: 'attribute', effects: { attributes: { mind: 5 } } },
        { id: 'start_with_technique', name: 'Memória Muscular', description: 'Você retém o conhecimento de uma técnica básica. Comece com a Forma Básica da Espada.', cost: 400, type: 'technique', effects: { techniques: ['basic_sword_form'] } }
    ];

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
        spiritStones: document.getElementById('res-spirit-stones'),
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
        if (!gameState.life_log) gameState.life_log = [];
        const logEntry = { age: gameState.age, message: processText(message), type: type };
        gameState.life_log.push(logEntry);
        if (gameState.life_log.length > 150) gameState.life_log.shift();
    }

    // --- PROCEDURAL GENERATION & CORE SYSTEMS ---
    function getRandomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function showTalents() {
        const container = elements.talentsContainer;
        container.innerHTML = '';
        elements.talentsScreenPoints.textContent = gameState.resources.talentPoints;
        allGameData.talents.forEach(talent => {
            const talentDiv = document.createElement('div');
            talentDiv.className = 'talent';
            const hasTalent = gameState.player.talents.includes(talent.id);
            const canAfford = gameState.resources.talentPoints >= talent.cost;
            const meetsReqs = talent.requirements.every(req => gameState.player.talents.includes(req));
            talentDiv.innerHTML = `<h4>${talent.name} (${talent.cost} pts)</h4><p>${talent.description}</p><small>Requisitos: ${talent.requirements.join(', ') || 'Nenhum'}</small>`;
            const buyButton = document.createElement('button');
            buyButton.textContent = hasTalent ? 'Adquirido' : 'Comprar';
            buyButton.disabled = hasTalent || !canAfford || !meetsReqs;
            if (!hasTalent) {
                buyButton.onclick = () => {
                    gameState.resources.talentPoints -= talent.cost;
                    gameState.player.talents.push(talent.id);
                    applyEffects(talent.effects);
                    updateUI();
                    showTalents();
                };
            }
            talentDiv.appendChild(buyButton);
            container.appendChild(talentDiv);
        });
    }

    function getCharacterPowerLevel(character) {
        if (!character) return 0;
        const attr = character.attributes;
        const cult = character.cultivation;
        return (attr.body + attr.mind) * (cult.level + (cult.realmId * 10));
    }

    function updateRelationshipStates() {
        for (const npcId in gameState.relationships) {
            const rel = gameState.relationships[npcId];
            if (rel.score > 50) rel.state = 'Amigo';
            else if (rel.score < -50) rel.state = 'Inimigo';
            else rel.state = 'Neutro';
        }
    }

    function generateCharacter(id, gender, isPlayer = false) {
        const { nomes, personalidades } = allGameData;
        const firstName = getRandomElement(nomes[gender]);
        const lastName = getRandomElement(nomes.apelidos);
        const personality = getRandomElement(personalidades);
        const baseAttributes = { body: 10, mind: 10, soul: 10, luck: 5 };
        const baseTechniques = [];
        if (isPlayer) {
            const legacyData = getLegacyData();
            for (const bonusId in legacyData.purchased) {
                if (legacyData.purchased[bonusId]) {
                    const bonus = LEGACY_BONUSES.find(b => b.id === bonusId);
                    if (bonus) {
                        if (bonus.effects.attributes) for (const attr in bonus.effects.attributes) baseAttributes[attr] += bonus.effects.attributes[attr];
                        if (bonus.effects.techniques) baseTechniques.push(...bonus.effects.techniques);
                    }
                }
            }
        }
        return {
            id, name: `${firstName} ${lastName}`, gender, personality,
            age: 6,
            attributes: { ...baseAttributes },
            lifespan: 80,
            sectId: null, sectRank: 0, contribution: 0,
            cultivation: { realmId: 0, level: 1 },
            talents: [],
            techniques: baseTechniques,
            combat: {
                maxHp: baseAttributes.body * 5, hp: baseAttributes.body * 5,
                attack: 5 + Math.floor(baseAttributes.body / 2),
                defense: 2 + Math.floor(baseAttributes.mind / 5),
                speed: 10 + Math.floor(baseAttributes.mind / 2)
            }
        };
    }

    function progressNpcs() {
        if (!gameState.npcs) return;
        for (const npcId in gameState.npcs) {
            const npc = gameState.npcs[npcId];
            npc.age = (npc.age || gameState.age) + 1;
            npc.attributes.body += Math.floor(Math.random() * 2);
            npc.attributes.mind += Math.floor(Math.random() * 2);
            if (Math.random() < 0.2) npc.cultivation.level++;
            npc.combat.maxHp = npc.attributes.body * 5;
            npc.combat.hp = npc.combat.maxHp;
            npc.combat.attack = 5 + Math.floor(npc.attributes.body / 2);
            npc.combat.defense = 2 + Math.floor(npc.attributes.mind / 5);
            npc.combat.speed = 10 + Math.floor(npc.attributes.mind / 2);
        }
    }

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

    function checkAndTriggerEvents() {
        const possibleStoryEvents = allGameData.events.filter(event => !gameState.triggeredEvents.includes(event.id) && areConditionsMet(event.conditions));
        if (possibleStoryEvents.length > 0) {
            const eventToTrigger = getRandomElement(possibleStoryEvents);
            if (eventToTrigger.type === 'once') gameState.triggeredEvents.push(eventToTrigger.id);
            showEvent(eventToTrigger);
            return true;
        }
        const possibleRandomEvents = allGameData.randomEvents.filter(event => areConditionsMet(event.conditions) && Math.random() < 0.2);
        if (possibleRandomEvents.length > 0) {
            showEvent(getRandomElement(possibleRandomEvents));
            return true;
        }
        return false;
    }

    function saveGameState() {
        if (Object.keys(gameState).length > 0) localStorage.setItem('immortalJourneySave', JSON.stringify(gameState));
    }

    function processText(text) {
        if (!text) return '';
        const rival = gameState.rivalId ? gameState.npcs[gameState.rivalId] : null;
        return text.replace(/\[RIVAL\]/g, rival ? rival.name : 'Rival').replace(/\[PLAYER_NAME\]/g, gameState.player.name);
    }

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

    function handleSpecialEffects(effectKey) {
        addLogMessage(`Efeito especial ativado: ${effectKey}`, 'notification');
        if (effectKey.startsWith('learn_technique_')) {
            const techId = effectKey.replace('learn_technique_', '');
            if (!gameState.player.techniques.includes(techId)) {
                gameState.player.techniques.push(techId);
                const tech = allGameData.techniques.find(t => t.id === techId);
                if (tech.effects) applyEffects(tech.effects);
                addLogMessage(`Você aprendeu a técnica: ${tech.name}!`, 'milestone', true);
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
            case 'face_tribulation': addLogMessage("Os céus rugem enquanto você enfrenta a tribulação!", "milestone", true); break;
            default: console.warn(`Efeito especial não implementado: ${effectKey}`);
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
                    while (elements.choicesContainer.firstChild) elements.choicesContainer.removeChild(elements.choicesContainer.firstChild);
                    updateUI();
                    saveGameState();
                }, { once: true });
                elements.choicesContainer.appendChild(button);
            });
        }
    }

    function showSectActions() {
        elements.eventContent.innerHTML = `<p>Você está no pátio da ${allGameData.sects.find(s => s.id === gameState.sect.id).name}. O que você gostaria de fazer?</p>`;
        elements.choicesContainer.innerHTML = '';
        const choices = [
            { text: "Visitar a Loja da Seita", effect: "show_sect_store" },
            { text: "Ver Quadro de Missões", effect: "show_mission_board" },
            { text: "Pavilhão de Técnicas", effect: "show_technique_pavilion" },
            { text: "Tentar Promoção", effect: "try_promotion" },
            { text: "Voltar", effect: "main_screen" }
        ];
        choices.forEach(choice => {
            const button = document.createElement('button');
            button.textContent = choice.text;
            button.onclick = () => choice.effect === 'main_screen' ? checkAndTriggerEvents() : handleSpecialEffects(choice.effect);
            elements.choicesContainer.appendChild(button);
        });
    }

    function showSectStore() {
        const sect = allGameData.sects.find(s => s.id === gameState.sect.id);
        elements.eventContent.innerHTML = `<p>Bem-vindo à loja da ${sect.name}. Sua Contribuição: ${gameState.resources.contribution}</p>`;
        elements.choicesContainer.innerHTML = '';
        sect.store.forEach(storeItem => {
            const itemData = allGameData.items.find(i => i.id === storeItem.id);
            if (!itemData) return;
            const canAfford = gameState.resources.contribution >= storeItem.cost_contribution;
            const meetsRank = gameState.sect.rank >= storeItem.min_rank;
            const button = document.createElement('button');
            button.innerHTML = `${itemData.name} - ${storeItem.cost_contribution} Contrib. <br><small>${itemData.description}</small>`;
            button.disabled = !canAfford || !meetsRank;
            if (!meetsRank) button.innerHTML += `<br><small style="color: red;">Rank necessário: ${sect.ranks[storeItem.min_rank].name}</small>`;
            else if (!canAfford) button.innerHTML += `<br><small style="color: red;">Contribuição insuficiente</small>`;
            button.onclick = () => {
                gameState.resources.contribution -= storeItem.cost_contribution;
                applyEffects(itemData.effects);
                addLogMessage(`Você comprou ${itemData.name}.`, 'reward');
                showSectStore();
            };
            elements.choicesContainer.appendChild(button);
        });
        const backButton = document.createElement('button');
        backButton.textContent = "Voltar para Ações da Seita";
        backButton.onclick = showSectActions;
        elements.choicesContainer.appendChild(backButton);
    }

    function showSpecialMerchantStore() {
        elements.eventContent.innerHTML = `<p>O mercador exibe seus produtos. Você tem ${gameState.resources.spirit_stones || 0} Pedras Espirituais.</p>`;
        elements.choicesContainer.innerHTML = '';
        const specialItems = allGameData.items.filter(item => item.source === 'special_merchant');

        specialItems.forEach(item => {
            const canAfford = (gameState.resources.spirit_stones || 0) >= item.cost_spirit_stones;
            const button = document.createElement('button');
            button.innerHTML = `${item.name} - ${item.cost_spirit_stones} Pedras Espirituais <br><small>${item.description}</small>`;
            button.disabled = !canAfford;
            if (!canAfford) {
                button.innerHTML += `<br><small style="color: red;">Pedras Espirituais insuficientes</small>`;
            }
            button.onclick = () => {
                gameState.resources.spirit_stones -= item.cost_spirit_stones;
                applyEffects(item.effects);
                addLogMessage(`Você comprou ${item.name}.`, 'reward', true);
                showSpecialMerchantStore(); // Refresh the store view
            };
            elements.choicesContainer.appendChild(button);
        });

        const backButton = document.createElement('button');
        backButton.textContent = "Sair";
        backButton.onclick = () => {
            // Go back to the main screen by clearing the event and showing default actions
            elements.eventContent.innerHTML = "<p>Você se afasta da tenda do mercador.</p>";
            elements.choicesContainer.innerHTML = '';
            elements.eventImage.style.display = 'none';
        };
        elements.choicesContainer.appendChild(backButton);
    }

    function showTechniquePavilion() {
        const sect = allGameData.sects.find(s => s.id === gameState.sect.id);
        elements.eventContent.innerHTML = `<p>O Pavilhão de Técnicas da seita. Sua Contribuição: ${gameState.resources.contribution}</p>`;
        elements.choicesContainer.innerHTML = '';
        sect.techniques.forEach(sectTech => {
            const techData = allGameData.techniques.find(t => t.id === sectTech.id);
            if (!techData) return;
            const canAfford = gameState.resources.contribution >= sectTech.cost_contribution;
            const meetsRank = gameState.sect.rank >= sectTech.min_rank;
            const alreadyKnown = gameState.player.techniques.includes(sectTech.id);
            const button = document.createElement('button');
            button.innerHTML = `${techData.name} - ${sectTech.cost_contribution} Contrib. <br><small>${techData.description}</small>`;
            button.disabled = !canAfford || !meetsRank || alreadyKnown;
            if (alreadyKnown) button.innerHTML += `<br><small style="color: green;">Já aprendido</small>`;
            else if (!meetsRank) button.innerHTML += `<br><small style="color: red;">Rank necessário: ${sect.ranks[sectTech.min_rank].name}</small>`;
            else if (!canAfford) button.innerHTML += `<br><small style="color: red;">Contribuição insuficiente</small>`;
            if (!alreadyKnown) {
                button.onclick = () => {
                    gameState.resources.contribution -= sectTech.cost_contribution;
                    handleSpecialEffects(`learn_technique_${sectTech.id}`);
                    showTechniquePavilion();
                };
            }
            elements.choicesContainer.appendChild(button);
        });
        const backButton = document.createElement('button');
        backButton.textContent = "Voltar para Ações da Seita";
        backButton.onclick = showSectActions;
        elements.choicesContainer.appendChild(backButton);
    }

    function showMissionBoard() {
        const sectId = gameState.sect.id;
        const playerRank = gameState.sect.rank;
        elements.eventContent.innerHTML = `<p>Quadro de Missões da Seita</p>`;
        elements.choicesContainer.innerHTML = '';
        const availableMissions = allGameData.missions.filter(m => m.sect_id === sectId && playerRank >= m.min_rank);
        if (availableMissions.length === 0) elements.eventContent.innerHTML += `<p>Não há missões disponíveis para o seu ranking no momento.</p>`;
        availableMissions.forEach(mission => {
            const button = document.createElement('button');
            button.innerHTML = `${mission.title}<br><small>${mission.description}</small><br><small>Recompensa: ${mission.reward.contribution} Contrib.</small>`;
            button.onclick = () => acceptSectMission(mission);
            elements.choicesContainer.appendChild(button);
        });
        const backButton = document.createElement('button');
        backButton.textContent = "Voltar para Ações da Seita";
        backButton.onclick = showSectActions;
        elements.choicesContainer.appendChild(backButton);
    }

    function acceptSectMission(mission) {
        addLogMessage(`Você completou a missão: ${mission.title}.`, 'reward', true);
        if (mission.reward.contribution) {
            applyEffects({ resources: { contribution: mission.reward.contribution } });
        }
        if (mission.reward.attributes) {
            applyEffects({ attributes: mission.reward.attributes });
        }
        if (mission.reward.items) {
            mission.reward.items.forEach(itemId => {
                const itemData = allGameData.items.find(i => i.id === itemId);
                if (itemData) {
                    applyEffects(itemData.effects);
                    addLogMessage(`Você recebeu o item: ${itemData.name}!`, 'reward');
                }
            });
        }
        showSectActions();
        updateUI();
    }

    function tryPromotion() {
        const sect = allGameData.sects.find(s => s.id === gameState.sect.id);
        const currentRank = gameState.sect.rank;
        const nextRank = sect.ranks.find(r => r.id === currentRank + 1);
        if (!nextRank) {
            addLogMessage("Você já alcançou o ranking mais alto da sua seita!", "notification");
            showSectActions();
            return;
        }
        const reqs = nextRank.requirements;
        let canPromote = true;
        let missingReqs = [];
        if (reqs.cultivation_realm_id > gameState.cultivation.realmId) {
            canPromote = false;
            missingReqs.push(`Reino de Cultivo: ${allGameData.realms[reqs.cultivation_realm_id].name}`);
        }
        if (reqs.cultivation_level > gameState.cultivation.level) {
            canPromote = false;
            missingReqs.push(`Nível de Cultivo: ${reqs.cultivation_level}`);
        }
        if (reqs.contribution > gameState.resources.contribution) {
            canPromote = false;
            missingReqs.push(`Contribuição: ${reqs.contribution}`);
        }
        if (canPromote) {
            gameState.sect.rank++;
            gameState.resources.contribution -= reqs.contribution;
            addLogMessage(`Parabéns! Você foi promovido para ${nextRank.name}!`, 'milestone', true);
            updateUI();
            showSectActions();
        } else {
            let message = "Você não cumpre os requisitos para a promoção. Falta:<br> - " + missingReqs.join('<br> - ');
            elements.eventContent.innerHTML = `<p>${message}</p>`;
            const backButton = document.createElement('button');
            backButton.textContent = "Voltar";
            backButton.onclick = showSectActions;
            elements.choicesContainer.innerHTML = '';
            elements.choicesContainer.appendChild(backButton);
        }
    }

    function tryBreakthrough() {
        const realm = allGameData.realms[gameState.cultivation.realmId];
        const successChance = (gameState.player.attributes.mind + gameState.player.attributes.luck) / realm.breakthrough_difficulty;
        if (Math.random() < successChance) {
            gameState.cultivation.level++;
            gameState.cultivation.qi = 0;
            gameState.cultivation.maxQi = Math.floor(gameState.cultivation.maxQi * 1.2);
            gameState.player.attributes.body += realm.breakthrough_bonus.body;
            gameState.player.attributes.mind += realm.breakthrough_bonus.mind;
            gameState.player.lifespan += realm.breakthrough_bonus.lifespan;
            addLogMessage("Você conseguiu! Uma onda de poder flui através de você, fortalecendo seu corpo e alma. Você alcançou um novo nível!", 'milestone', true);
            if (gameState.cultivation.level >= realm.levels_to_next) {
                gameState.cultivation.level = 1;
                gameState.cultivation.realmId++;
                const newRealm = allGameData.realms[gameState.cultivation.realmId];
                addLogMessage(`Um poder imenso se condensa dentro de você! Você avançou para o ${newRealm.name}!`, 'milestone', true);
            }
        } else {
            gameState.cultivation.qi = 0;
            gameState.player.attributes.body = Math.max(1, gameState.player.attributes.body - 1);
            addLogMessage("A tentativa de breakthrough falhou! A energia retrocede violentamente, ferindo seu corpo. Você se sente enfraquecido.", 'notification', true);
        }
        updateUI();
        saveGameState();
    }

    function meditate() {
        if (gameState.cultivation.qi >= gameState.cultivation.maxQi) {
            tryBreakthrough();
            return;
        }
        let qiGained = gameState.player.attributes.mind;
        if (gameState.player.talents.includes('fast_learner')) {
            qiGained = Math.floor(qiGained * 1.5);
        }
        gameState.cultivation.qi = Math.min(gameState.cultivation.qi + qiGained, gameState.cultivation.maxQi);
        addLogMessage(`Você meditou e ganhou ${qiGained} Qi.`, 'notification');
        updateUI();
        saveGameState();
    }

    function advanceYear() {
        gameState.age++;
        addLogMessage(`Você envelheceu para ${gameState.age} anos.`, 'milestone');
        gameState.player.attributes.body++;
        gameState.player.attributes.mind++;
        progressNpcs();
        updateRelationshipStates();
        if (gameState.sect.id) {
            const sect = allGameData.sects.find(s => s.id === gameState.sect.id);
            if (sect && sect.benefit_template.type === 'passive_qi_gain') {
                let benefitValue = sect.benefit_template.base_value + (sect.benefit_template.value_per_rank * gameState.sect.rank);
                gameState.cultivation.qi = Math.min(gameState.cultivation.qi + benefitValue, gameState.cultivation.maxQi);
                addLogMessage(`Sua seita lhe concedeu ${benefitValue} de Qi.`, 'reward');
            }
        }
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
        const finalGameState = { ...gameState };
        let pointsEarned = 0;
        pointsEarned += Math.floor(finalGameState.age * 0.5);
        pointsEarned += (finalGameState.cultivation.realmId || 0) * 100;
        pointsEarned += (finalGameState.cultivation.level || 0) * 10;
        pointsEarned += Math.floor((finalGameState.resources.money || 0) / 10);
        pointsEarned += (finalGameState.resources.talentPoints || 0) * 2;
        pointsEarned += (finalGameState.player.techniques?.length || 0) * 25;
        let legacyData = getLegacyData();
        legacyData.totalPoints += pointsEarned;
        saveLegacyData(legacyData);
        showLegacyScreen(finalGameState, pointsEarned, legacyData);
        localStorage.removeItem('immortalJourneySave');
    }

    function getLegacyData() {
        return JSON.parse(localStorage.getItem('immortalJourneyLegacy')) || { totalPoints: 0, purchased: {} };
    }

    function saveLegacyData(legacyData) {
        localStorage.setItem('immortalJourneyLegacy', JSON.stringify(legacyData));
    }

    function showLegacyScreen(finalGameState, pointsEarned, legacyData) {
        const finalStatsList = document.getElementById('final-stats-list');
        finalStatsList.innerHTML = '';
        const realmName = allGameData.realms?.[finalGameState.cultivation.realmId]?.name || 'Mortal';
        const finalStats = {
            "Idade Final": finalGameState.age,
            "Reino de Cultivo": `${realmName} (Nível ${finalGameState.cultivation.level})`,
            "Dinheiro": finalGameState.resources.money,
            "Técnicas Aprendidas": finalGameState.player.techniques?.length || 0
        };
        for (const [key, value] of Object.entries(finalStats)) {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${key}:</strong> ${value}`;
            finalStatsList.appendChild(li);
        }
        const finalChronicleList = document.getElementById('final-chronicle-list');
        finalChronicleList.innerHTML = '';
        if (finalGameState.life_log) {
            finalGameState.life_log.forEach(log => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>Ano ${log.age}:</strong> ${log.message}`;
                li.classList.add(`log-type-${log.type}`);
                finalChronicleList.appendChild(li);
            });
        }
        const legacyPointsTotalEl = document.getElementById('legacy-points-total');
        const legacyBonusesContainer = document.getElementById('legacy-bonuses-container');
        legacyBonusesContainer.innerHTML = '';
        legacyPointsTotalEl.textContent = legacyData.totalPoints;
        document.getElementById('legacy-points-earned').textContent = pointsEarned;
        LEGACY_BONUSES.forEach(bonus => {
            const bonusDiv = document.createElement('div');
            bonusDiv.className = 'legacy-bonus';
            const isPurchased = legacyData.purchased[bonus.id];
            const canAfford = legacyData.totalPoints >= bonus.cost;
            bonusDiv.innerHTML = `<h4>${bonus.name} (${bonus.cost} pts)</h4><p>${bonus.description}</p>`;
            const buyButton = document.createElement('button');
            buyButton.textContent = isPurchased ? 'Comprado' : 'Comprar';
            buyButton.disabled = isPurchased || !canAfford;
            if (!isPurchased) {
                buyButton.onclick = () => {
                    legacyData.totalPoints -= bonus.cost;
                    legacyData.purchased[bonus.id] = true;
                    saveLegacyData(legacyData);
                    showLegacyScreen(finalGameState, pointsEarned, legacyData);
                };
            }
            bonusDiv.appendChild(buyButton);
            legacyBonusesContainer.appendChild(bonusDiv);
        });
        elements.legacyScreen.classList.remove('hidden');
    }

    function addCombatLog(message) {
        const logEntry = document.createElement('p');
        logEntry.textContent = message;
        elements.combatLog.appendChild(logEntry);
        elements.combatLog.scrollTop = elements.combatLog.scrollHeight;
    }

    function startCombat(enemyData) {
        combatState = {
            player: { ...gameState.player.combat },
            enemy: { ...enemyData.combat },
            enemyInfo: enemyData,
            turn: 'player'
        };
        elements.combatLog.innerHTML = '';
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
        elements.combatActions.innerHTML = '';
        const attackBtn = document.createElement('button');
        attackBtn.textContent = 'Ataque Físico';
        attackBtn.className = 'combat-action-btn';
        attackBtn.onclick = () => takeCombatTurn('attack');
        elements.combatActions.appendChild(attackBtn);
        const defendBtn = document.createElement('button');
        defendBtn.textContent = 'Defender';
        defendBtn.className = 'combat-action-btn';
        defendBtn.onclick = () => takeCombatTurn('defend');
        elements.combatActions.appendChild(defendBtn);
        gameState.player.techniques.forEach(techId => {
            const techData = allGameData.techniques.find(t => t.id === techId);
            if (techData && techData.type === 'active_combat') {
                const techBtn = document.createElement('button');
                techBtn.textContent = `${techData.name} (${techData.qi_cost} Qi)`;
                techBtn.className = 'combat-action-btn tech';
                techBtn.disabled = gameState.cultivation.qi < techData.qi_cost;
                techBtn.onclick = () => takeCombatTurn('technique', techData);
                elements.combatActions.appendChild(techBtn);
            }
        });
    }

    function takeCombatTurn(action, techData = null) {
        if (action === 'attack') {
            let playerDamage = Math.max(1, combatState.player.attack - combatState.enemy.defense);
            combatState.enemy.hp -= playerDamage;
            addCombatLog(`Você ataca e causa ${playerDamage} de dano!`);
        } else if (action === 'defend') {
            combatState.player.isDefending = true;
            addCombatLog(`Você se prepara para defender.`);
        } else if (action === 'technique' && techData) {
            gameState.cultivation.qi -= techData.qi_cost;
            let techDamage = Math.floor(combatState.player.attack * techData.damage_multiplier);
            techDamage = Math.max(1, techDamage - combatState.enemy.defense);
            combatState.enemy.hp -= techDamage;
            addCombatLog(`Você usa ${techData.name} e causa ${techDamage} de dano!`);
        }
        updateCombatUI();
        if (combatState.enemy.hp <= 0) {
            endCombat(true);
            return;
        }
        setTimeout(() => {
            const enemyTechniques = combatState.enemyInfo.techniques.map(id => allGameData.techniques.find(t => t.id === id)).filter(t => t && t.type === 'active_combat');
            const techToUse = enemyTechniques.length > 0 && Math.random() < 0.33 ? enemyTechniques[0] : null;
            let enemyDamage;
            if (techToUse) {
                enemyDamage = Math.floor(combatState.enemy.attack * techToUse.damage_multiplier);
                addCombatLog(`${combatState.enemyInfo.name} usa a técnica ${techToUse.name}!`);
            } else {
                enemyDamage = combatState.enemy.attack;
            }
            enemyDamage = Math.max(1, enemyDamage - combatState.player.defense);
            if (combatState.player.isDefending) {
                enemyDamage = Math.max(0, Math.floor(enemyDamage / 2));
                addCombatLog(`O ataque causa apenas ${enemyDamage} de dano graças à sua defesa!`);
                combatState.player.isDefending = false;
            } else {
                addCombatLog(`O ataque causa ${enemyDamage} de dano!`);
            }
            combatState.player.hp -= enemyDamage;
            updateCombatUI();
            if (combatState.player.hp <= 0) {
                endCombat(false);
                return;
            }
        }, 1000);
    }

    function endCombat(playerWon) {
        elements.combatScreen.classList.add('hidden');
        elements.actionsContainer.classList.remove('hidden');
        if (playerWon) {
            addLogMessage(`Você derrotou ${combatState.enemyInfo.name}!`, 'reward', true);
        } else {
            addLogMessage(`Você foi derrotado por ${combatState.enemyInfo.name}...`, 'combat', true);
            gameState.player.combat.hp = 1;
            endGame('combat');
        }
        updateUI();
    }

    function flashElement(element, highlightClass) {
        element.classList.add(highlightClass);
        setTimeout(() => {
            element.classList.remove(highlightClass);
        }, 500);
    }

    function updateUI() {
        if (!gameState || !gameState.player) return;
        const oldBody = parseInt(elements.body.textContent);
        const oldMind = parseInt(elements.mind.textContent);
        if (gameState.player.attributes.body > oldBody) flashElement(elements.body, 'highlight-green');
        if (gameState.player.attributes.body < oldBody) flashElement(elements.body, 'highlight-red');
        if (gameState.player.attributes.mind > oldMind) flashElement(elements.mind, 'highlight-green');
        if (gameState.player.attributes.mind < oldMind) flashElement(elements.mind, 'highlight-red');
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
        addLogMessage("Você nasceu. O mundo aguarda para testemunhar sua lenda.", "milestone", true);
        updateUI();
        saveGameState();
        checkAndTriggerEvents();
    }

    function initializeGame() {
        const savedGame = localStorage.getItem('immortalJourneySave');
        if (savedGame) {
            gameState = JSON.parse(savedGame);
            if (!gameState.life_log) gameState.life_log = [];
        } else {
            startNewGame();
        }

        // Attach event listeners
        elements.nextYearBtn.addEventListener('click', advanceYear);
        elements.meditateBtn.addEventListener('click', meditate);
        elements.talentsBtn.addEventListener('click', () => {
            showTalents();
            elements.talentsScreen.classList.remove('hidden');
        });
        elements.closeTalentsBtn.addEventListener('click', () => elements.talentsScreen.classList.add('hidden'));
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
