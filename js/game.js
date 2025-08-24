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
        relationshipsList: document.getElementById('relationships-list'),
        sectInfo: document.getElementById('sect-info'),
        sectName: document.getElementById('sect-name'),
        sectRank: document.getElementById('sect-rank'),
        sectContribution: document.getElementById('sect-contribution'),
        lifespan: document.getElementById('char-lifespan'),
        legacyScreen: document.getElementById('legacy-screen'),
        legacyPoints: document.getElementById('legacy-points'),
        legacyBonusesContainer: document.getElementById('legacy-bonuses-container'),
        startNewJourneyBtn: document.getElementById('start-new-journey-btn')
    };

    // --- CARREGAMENTO DE DADOS ---
    async function loadGameData() {
        try {
            const responses = await Promise.all([
                fetch('data/events.json'), fetch('data/items.json'), fetch('data/sects.json'),
                fetch('data/enemies.json'), fetch('data/talents.json'), fetch('data/strings.json'),
                fetch('data/random_events.json'), fetch('data/nomes.json'), fetch('data/personalidades.json'),
                fetch('data/world_events.json'), fetch('data/realms.json'), fetch('data/missions.json')
            ]);
            for (const res of responses) {
                if (!res.ok) throw new Error(`Falha ao carregar ${res.url}`);
            }
            const [events, items, sects, enemies, talents, strings, randomEvents, nomes, personalidades, worldEvents, realms, missions] = await Promise.all(responses.map(res => res.json()));
            allGameData = { events, items, sects, enemies, talents, randomEvents, nomes, personalidades, worldEvents, realms, missions };
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

        // Aplicar bônus de legado
        const legacyData = getLegacyData();
        for(const bonusId in legacyData.bonuses) {
            if (legacyData.bonuses[bonusId]) {
                const bonus = LEGACY_BONUSES.find(b => b.id === bonusId);
                if (bonus && bonus.effects.attributes) {
                    for(const attr in bonus.effects.attributes) {
                        baseAttributes[attr] += bonus.effects.attributes[attr];
                    }
                }
            }
        }

        return {
            id, name: `${firstName} ${lastName}`, gender, personality,
            attributes: { ...baseAttributes },
            lifespan: 80,
            sectId: null,
            sectRank: 0,
            contribution: 0,
            cultivation: { realmId: 0, level: 1 },
            combat: {
                maxHp: baseAttributes.body * 5, hp: baseAttributes.body * 5,
                attack: 5 + Math.floor(baseAttributes.body / 2),
                defense: 2 + Math.floor(baseAttributes.mind / 5)
            }
        };
    }

    // --- LÓGICA DE EVENTOS ---
    function areConditionsMet(conditions) {
        if (!conditions) return true; // Eventos sem condições sempre podem ocorrer

        for (const key in conditions) {
            const value = conditions[key];
            switch (key) {
                case 'age':
                    if (gameState.age !== value) return false;
                    break;
                case 'min_age':
                    if (gameState.age < value) return false;
                    break;
                case 'max_age':
                    if (gameState.age > value) return false;
                    break;
                case 'required_sect_id':
                    if (gameState.sect.id !== value) return false;
                    break;
                case 'min_sect_rank':
                    if (!gameState.sect.id || gameState.sect.rank < value) return false;
                    break;
                case 'min_cultivation_realm_id':
                    if (gameState.cultivation.realmId < value) return false;
                    break;
                case 'rival_relationship_state':
                    const rivalRel = gameState.relationships[gameState.rivalId];
                    if (!rivalRel || rivalRel.state !== value) return false;
                    break;
                case 'probability':
                    if (Math.random() > value) return false;
                    break;
                case 'rival_in_same_sect':
                    const rival = gameState.npcs[gameState.rivalId];
                    if (!rival || (gameState.sect.id === rival.sectId) !== value) return false;
                    break;
                // Adicionar mais condições aqui no futuro
            }
        }
        return true;
    }

    function checkAndTriggerEvents() {
        const allEvents = [...allGameData.events, ...allGameData.randomEvents];
        const possibleEvents = allEvents.filter(event => {
            // Verifica se o evento já foi acionado (se for do tipo 'once')
            if (event.type === 'once' && gameState.triggeredEvents.includes(event.id)) {
                return false;
            }
            return areConditionsMet(event.conditions);
        });

        if (possibleEvents.length > 0) {
            const eventToTrigger = getRandomElement(possibleEvents);
            showEvent(eventToTrigger);

            // Marca o evento como acionado se for 'once'
            if (eventToTrigger.type === 'once') {
                gameState.triggeredEvents.push(eventToTrigger.id);
            }
            return true; // Indica que um evento foi acionado
        }
        return false; // Nenhum evento foi acionado
    }


    // --- LÓGICA DE JOGO PRINCIPAL ---
    function processText(text) {
        if (!text) return '';
        // Usa o rivalId para obter o NPC rival atual
        const rival = gameState.rivalId ? gameState.npcs[gameState.rivalId] : null;
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
        if (effects.cultivation) {
            for (const stat in effects.cultivation) if (gameState.cultivation.hasOwnProperty(stat)) gameState.cultivation[stat] += effects.cultivation[stat];
            gameState.cultivation.qi = Math.min(gameState.cultivation.qi, gameState.cultivation.maxQi); // Garante que o Qi não ultrapasse o máximo
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
        const acceptMissionMatch = effect.match(/^accept_mission_(.+)/);
        if (acceptMissionMatch) { acceptSectMission(acceptMissionMatch[1]); return; }

        switch (effect) {
            case 'show_sect_actions': showSectActions(); break;
            case 'show_sect_store': showSectStore(); break;
            case 'try_promotion': tryPromotion(); break;
            case 'show_mission_board': showMissionBoard(); break;
            case 'explore_cave': exploreCave(); break;
            // ... outros casos
            default: console.warn(`Efeito especial não reconhecido: ${effect}`);
        }
    }

    function exploreCave() {
        const luck = gameState.player.attributes.luck;
        let outcomeText = "";

        if (luck > 10) {
            outcomeText = "Sua sorte o guia para uma passagem oculta! No fundo, você encontra um baú de madeira antigo. Dentro, há 20 moedas e uma Pílula Pequena de Qi.";
            applyEffects({ resources: { money: 20 } });
            // Futuramente, poderia adicionar um item ao inventário em vez de aplicar o efeito direto.
            applyEffects({ cultivation: { qi: 50 } });
        } else if (luck >= 5) {
            outcomeText = "Você explora a caverna por um tempo, mas não encontra nada além de rochas e escuridão. Você sai de mãos vazias.";
        } else {
            outcomeText = "Você pisa em falso e cai em um ninho de ratos gigantes! Um deles, de aparência particularmente desagradável, ataca!";
            startCombat('giant_rat');
        }

        elements.eventContent.innerHTML = `<p>${outcomeText}</p>`;
        elements.choicesContainer.innerHTML = '';
        const backButton = createBackButton(() => {
            elements.actionsContainer.classList.remove('hidden');
            updateUI();
        });
        // Só mostra o botão "Continuar" se não houver combate
        if (luck >= 5) {
            elements.choicesContainer.appendChild(backButton);
        }
    }

    function showEvent(event) {
        elements.eventContent.innerHTML = `<p>${processText(event.text)}</p>`;
        elements.choicesContainer.innerHTML = '';
        event.choices.forEach(choice => {
            const button = createChoiceButton(choice);
            elements.choicesContainer.appendChild(button);
        });
        elements.actionsContainer.classList.add('hidden');
    }

    function updateUI() {
        elements.playerName.textContent = gameState.player.name;
        elements.age.textContent = gameState.age;
        elements.lifespan.textContent = gameState.player.lifespan;
        elements.body.textContent = gameState.player.attributes.body;
        elements.mind.textContent = gameState.player.attributes.mind;
        elements.money.textContent = gameState.resources.money;
        elements.talentPoints.textContent = gameState.resources.talentPoints;
        elements.contribution.textContent = gameState.resources.contribution;

        // UI da Seita
        const inSect = !!gameState.sect.id;
        elements.sectActionsBtn.classList.toggle('hidden', !inSect);
        elements.sectInfo.classList.toggle('hidden', !inSect);
        if (inSect) {
            const sectData = allGameData.sects.find(s => s.id === gameState.sect.id);
            const rankData = sectData.ranks.find(r => r.id === gameState.sect.rank);
            elements.sectName.textContent = sectData.name;
            elements.sectRank.textContent = rankData.name;
            elements.sectContribution.textContent = gameState.resources.contribution;
        }

        if (gameState.cultivation) {
            const cult = gameState.cultivation;
            const realm = allGameData.realms[cult.realmId];
            elements.realm.textContent = realm.name;
            elements.level.textContent = cult.level;
            elements.qi.textContent = cult.qi;
            elements.maxQi.textContent = cult.maxQi;
            if (cult.qi >= cult.maxQi) {
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
                let npcStatus = npc.name;
                if (npc.sectId) {
                    const sectData = allGameData.sects.find(s => s.id === npc.sectId);
                    const rankData = sectData.ranks.find(r => r.id === npc.sectRank);
                    if(sectData && rankData) {
                        npcStatus += ` <span class="npc-sect-info">(${rankData.name}, ${sectData.name})</span>`;
                    }
                }
                li.innerHTML = `${npcStatus}: ${rel.state} (${rel.score})`;
                elements.relationshipsList.appendChild(li);
            }
        }
    }

    function advanceYear() {
        // --- VERIFICAÇÃO DE FIM DE JOGO ---
        if (gameState.age >= gameState.player.lifespan) {
            endGame("old_age");
            return; // Interrompe o avanço do ano
        }

        // --- LÓGICA DE EVENTOS MUNDIAIS ---
        // Verifica se um evento mundial termina
        if (gameState.currentWorldEvent && gameState.age === gameState.currentWorldEvent.endYear) {
            addLogMessage(allGameData.worldEvents.find(e => e.id === gameState.currentWorldEvent.id).endText, 'notification');
            gameState.currentWorldEvent = null;
        }
        // Chance de um novo evento mundial começar
        if (!gameState.currentWorldEvent && gameState.age > 10 && gameState.age % 10 === 0) {
            if (Math.random() < 0.25) { // 25% de chance a cada 10 anos
                const newWorldEvent = getRandomElement(allGameData.worldEvents);
                gameState.currentWorldEvent = {
                    id: newWorldEvent.id,
                    endYear: gameState.age + newWorldEvent.duration
                };
                addLogMessage(newWorldEvent.startText, 'notification');
            }
        }

        // --- LÓGICA DE BENEFÍCIOS DE SEITA ---
        if (gameState.sect.id) {
            // Missão
            if (gameState.sect.currentMissionId) {
                const mission = allGameData.missions.find(m => m.id === gameState.sect.currentMissionId);
                applyEffects(mission.reward); // <-- CORRIGIDO
                let rewardText = `Você completou a missão '${mission.title}'!`;
                if(mission.reward.resources && mission.reward.resources.contribution) {
                    rewardText += ` (+${mission.reward.resources.contribution} Contribuição)`;
                }
                 if(mission.reward.attributes && mission.reward.attributes.body) {
                    rewardText += ` (+${mission.reward.attributes.body} Corpo)`;
                }
                addLogMessage(rewardText, 'reward');
                gameState.sect.currentMissionId = null;
            }

            // Benefício passivo
            const sectData = allGameData.sects.find(s => s.id === gameState.sect.id);
            if (sectData && sectData.benefit_template) {
                const template = sectData.benefit_template;
                const benefitValue = template.base_value + (template.value_per_rank * gameState.sect.rank);

                if (template.type === 'passive_qi_gain') {
                    gameState.cultivation.qi = Math.min(gameState.cultivation.maxQi, gameState.cultivation.qi + benefitValue);
                }
                if (template.type === 'body_cultivation_boost' && (gameState.age % 5 === 0)) {
                    gameState.player.attributes.body += benefitValue;
                }
            }
        }
        gameState.age++;

        // --- LÓGICA DE EVENTOS ---
        if (!checkAndTriggerEvents()) {
            // Se nenhum evento especial ocorreu, mostra a mensagem padrão
            elements.eventContent.innerHTML = `<p>${processText(`Você completou ${gameState.age} anos. O tempo passa em meditação e treino.`)}</p>`;
            elements.actionsContainer.classList.remove('hidden');
        }

        progressNpcs();
        updateRelationshipStates(); // <-- Adicionado
        updateUI();
    }

    // --- LÓGICA DE RELACIONAMENTOS ---
    function updateRelationshipStates() {
        let lowestScore = Infinity;
        let currentRivalId = null;

        for (const npcId in gameState.relationships) {
            const rel = gameState.relationships[npcId];
            // Atualiza o estado (amigo, neutro, inimigo)
            if (rel.score > 50) rel.state = 'Amigo';
            else if (rel.score < -50) rel.state = 'Inimigo';
            else rel.state = 'Neutro';

            // Encontra o NPC com a pior relação para ser o rival
            if (rel.score < lowestScore) {
                lowestScore = rel.score;
                currentRivalId = npcId;
            }
        }
        gameState.rivalId = currentRivalId;
    }

    // --- LÓGICA DE PROGRESSÃO DE NPCS ---
    function progressNpcs() {
        for (const npcId in gameState.npcs) {
            const npc = gameState.npcs[npcId];
            // Usa o novo gameState.rivalId para a verificação
            const isRival = npc.id === gameState.rivalId;

            // Aumento base de atributos
            npc.attributes.body += Math.floor(Math.random() * 2) + 1; // Ganha 1-2 de corpo
            npc.attributes.mind += Math.floor(Math.random() * 2) + 1; // Ganha 1-2 de mente

            // Chance de um "mini-breakthrough"
            if (Math.random() < 0.1) { // 10% de chance
                npc.attributes.body += Math.floor(Math.random() * 3) + 1;
                npc.attributes.mind += Math.floor(Math.random() * 3) + 1;

                if (isRival) {
                    addLogMessage(`Você ouve rumores de que ${npc.name} teve um avanço em seu treino!`, 'notification');
                }
            }

            // Simulação de Cultivo do NPC
            if (Math.random() < 0.2) { // 20% de chance de treinar cultivo por ano
                npc.cultivation.level++;
                const currentRealm = allGameData.realms[npc.cultivation.realmId];
                if (npc.cultivation.level > currentRealm.levels) {
                    if (allGameData.realms[npc.cultivation.realmId + 1]) {
                        npc.cultivation.realmId++;
                        npc.cultivation.level = 1;
                    } else {
                        npc.cultivation.level = currentRealm.levels; // Previne ir além do nível máximo
                    }
                }
            }

            // Lógica para entrar em uma seita
            if (!npc.sectId && gameState.age > 15) {
                if (Math.random() < 0.1) { // 10% de chance por ano
                    const chosenSect = getRandomElement(allGameData.sects);
                    npc.sectId = chosenSect.id;
                    npc.sectRank = 0;
                    if (isRival) {
                        addLogMessage(`${npc.name} se juntou à ${chosenSect.name}!`, 'notification');
                    }
                }
            } else if (npc.sectId) {
                // Lógica para ganhar contribuição e subir de rank
                npc.contribution += Math.floor(Math.random() * 5) + 1; // Ganha 1-5 de contribuição por ano

                const sectData = allGameData.sects.find(s => s.id === npc.sectId);
                const nextRank = sectData.ranks.find(r => r.id === npc.sectRank + 1);

                if (nextRank) {
                    const reqs = nextRank.requirements;
                    const meetsCultivation = npc.cultivation.realmId > reqs.cultivation_realm_id ||
                                             (npc.cultivation.realmId === reqs.cultivation_realm_id && npc.cultivation.level >= reqs.cultivation_level);

                    if (npc.contribution >= reqs.contribution && meetsCultivation) {
                        npc.sectRank = nextRank.id;
                        if (isRival) {
                            addLogMessage(`${npc.name} foi promovido para ${nextRank.name} na ${sectData.name}!`, 'notification');
                        }
                    }
                }
            }

            // Atualizar status de combate com base nos atributos
            npc.combat.maxHp = npc.attributes.body * 5;
            // A vida atual também pode aumentar um pouco para refletir o treino
            npc.combat.hp = Math.min(npc.combat.maxHp, npc.combat.hp + (npc.attributes.body * 2));
            npc.combat.attack = 5 + Math.floor(npc.attributes.body / 2);
            npc.combat.defense = 2 + Math.floor(npc.attributes.mind / 5);
        }
    }

    // --- LÓGICA DE SEITA ---
    function showSectActions() {
        const choices = [
            { text: "Ver Loja", effects: { special: 'show_sect_store' } },
            { text: "Tentar Promoção", effects: { special: 'try_promotion' } }
        ];

        // Adiciona a opção de missões se o jogador não tiver uma ativa
        if (!gameState.sect.currentMissionId) {
            choices.push({ text: "Ver Quadro de Missões", effects: { special: 'show_mission_board' } });
        } else {
            const currentMission = allGameData.missions.find(m => m.id === gameState.sect.currentMissionId);
            choices.push({ text: `Em Missão: ${currentMission.title}`, disabled: true });
        }

        choices.push({ text: "Sair", effects: {}, resultKey: "sect_actions_leave" });

        const sectEvent = {
            text: "Você está no pátio da sua seita. O que deseja fazer?",
            choices: choices
        };
        showEvent(sectEvent);
    }

    function showSectStore() {
        const sectData = allGameData.sects.find(s => s.id === gameState.sect.id);
        let priceModifier = 1.0;
        if (gameState.currentWorldEvent) {
            const worldEventData = allGameData.worldEvents.find(e => e.id === gameState.currentWorldEvent.id);
            if (worldEventData.effects.pillPriceModifier) {
                priceModifier = worldEventData.effects.pillPriceModifier;
            }
        }

        elements.eventContent.innerHTML = `<h2>Loja da Seita</h2><p>Sua Contribuição: ${gameState.resources.contribution}</p>`;
        if (priceModifier > 1.0) {
            elements.eventContent.innerHTML += `<p style="color: var(--color-accent-danger);">Os preços estão inflacionados devido à guerra!</p>`;
        }

        elements.choicesContainer.innerHTML = '';
        sectData.store
            .filter(storeItem => storeItem.min_rank <= gameState.sect.rank)
            .forEach(storeItem => {
            const itemData = allGameData.items.find(i => i.id === storeItem.id);
            const finalCost = Math.floor(storeItem.cost_contribution * priceModifier);
            const button = document.createElement('button');
            button.innerHTML = `${itemData.name} <br><small>${itemData.description} (Custo: ${finalCost})</small>`;
            if (gameState.resources.contribution < finalCost) {
                button.disabled = true;
            }
            button.onclick = () => {
                gameState.resources.contribution -= finalCost;
                applyEffects(itemData.effects);
                addLogMessage(`Você comprou ${itemData.name}.`, 'reward');
                updateUI();
                showSectStore();
            };
            elements.choicesContainer.appendChild(button);
        });
        const backButton = createBackButton(showSectActions);
        elements.choicesContainer.appendChild(backButton);
    }

    function showMissionBoard() {
        elements.eventContent.innerHTML = `<h2>Quadro de Missões</h2><p>Você examina as missões disponíveis para seu rank.</p>`;
        elements.choicesContainer.innerHTML = '';

        const availableMissions = allGameData.missions.filter(m =>
            m.sect_id === gameState.sect.id &&
            m.min_rank <= gameState.sect.rank
        );

        if (availableMissions.length === 0) {
            elements.eventContent.innerHTML += `<p>Não há missões disponíveis para você no momento.</p>`;
        } else {
            availableMissions.forEach(mission => {
                const button = document.createElement('button');
                button.innerHTML = `${mission.title}<br><small>${mission.description} (Recompensa: ${mission.reward.contribution} Contribuição)</small>`;
                button.onclick = () => {
                    acceptSectMission(mission.id);
                };
                elements.choicesContainer.appendChild(button);
            });
        }

        const backButton = createBackButton(showSectActions);
        elements.choicesContainer.appendChild(backButton);
    }

    function acceptSectMission(missionId) {
        gameState.sect.currentMissionId = missionId;
        const mission = allGameData.missions.find(m => m.id === missionId);
        elements.eventContent.innerHTML = `<p>Você aceitou a missão: ${mission.title}. Ela será concluída no final do ano.</p>`;
        elements.choicesContainer.innerHTML = '';
        const backButton = createBackButton(showSectActions);
        elements.choicesContainer.appendChild(backButton);
        updateUI(); // Para atualizar o estado do botão de missões
    }

    function tryPromotion() {
        const sectData = allGameData.sects.find(s => s.id === gameState.sect.id);
        const currentRankId = gameState.sect.rank;
        const nextRank = sectData.ranks.find(r => r.id === currentRankId + 1);

        if (!nextRank) {
            elements.eventContent.innerHTML = `<p>Você já alcançou o rank mais alto em sua seita.</p>`;
            elements.choicesContainer.innerHTML = '';
            const backButton = createBackButton(showSectActions);
            elements.choicesContainer.appendChild(backButton);
            return;
        }

        const reqs = nextRank.requirements;
        let canPromote = true;
        let missingReqs = [];

        if (reqs.contribution && gameState.resources.contribution < reqs.contribution) {
            canPromote = false;
            missingReqs.push(`Contribuição: ${gameState.resources.contribution} / ${reqs.contribution}`);
        }
        if (reqs.cultivation_realm_id && gameState.cultivation.realmId < reqs.cultivation_realm_id) {
            canPromote = false;
            const requiredRealm = allGameData.realms[reqs.cultivation_realm_id].name;
            missingReqs.push(`Reino de Cultivo: ${requiredRealm}`);
        }
        if (reqs.cultivation_level && gameState.cultivation.level < reqs.cultivation_level) {
            canPromote = false;
            missingReqs.push(`Nível de Cultivo: ${reqs.cultivation_level}`);
        }

        if (canPromote) {
            gameState.sect.rank = nextRank.id;
            elements.eventContent.innerHTML = `<p>Parabéns! Você foi promovido para ${nextRank.name}!</p>`;
        } else {
            elements.eventContent.innerHTML = `<p>Você não cumpre os requisitos para a promoção. Falta:</p><ul><li>${missingReqs.join('</li><li>')}</li></ul>`;
        }

        elements.choicesContainer.innerHTML = '';
        const backButton = createBackButton(showSectActions);
        elements.choicesContainer.appendChild(backButton);
    }

    // --- FUNÇÕES HELPER ---
    function createBackButton(onClick) {
        const button = document.createElement('button');
        button.textContent = "Voltar";
        button.onclick = onClick;
        return button;
    }

    function createChoiceButton(choice) {
        const button = document.createElement('button');
        button.textContent = processText(choice.text);
        button.disabled = !!choice.disabled;

        button.onclick = () => {
            if (choice.effects && choice.effects.special) {
                applyEffects(choice.effects);
                // Efeitos especiais cuidam da sua própria UI e não mostram um resultado padrão
            } else {
                applyEffects(choice.effects);
                const resultText = allStrings[choice.resultKey] || "Chave de texto não encontrada.";
                elements.eventContent.innerHTML = `<p>${processText(resultText)}</p>`;
                elements.choicesContainer.innerHTML = '';
                elements.actionsContainer.classList.remove('hidden');
                updateUI();
            }
        };
        return button;
    }

    // --- LÓGICA DE COMBATE ---
    function addLogMessage(message, type = 'event') {
        // Tipos: 'event', 'combat', 'reward', 'notification'
        const logEntry = document.createElement('p');
        logEntry.innerHTML = message;
        logEntry.classList.add('log-entry', `log-type-${type}`);
        elements.combatLog.appendChild(logEntry);
        elements.combatLog.scrollTop = elements.combatLog.scrollHeight;
    }

    function updateCombatUI() {
        elements.combatPlayerHp.textContent = `${combatState.player.hp} / ${combatState.player.maxHp}`;
        elements.combatEnemyName.textContent = combatState.enemy.name;
        elements.combatEnemyHp.textContent = `${combatState.enemy.hp} / ${combatState.enemy.maxHp}`;
    }

    function startCombat(enemyId) {
        // Esconde a UI principal e mostra a de combate
        elements.eventContent.classList.add('hidden');
        elements.choicesContainer.classList.add('hidden');
        elements.actionsContainer.classList.add('hidden');
        elements.combatScreen.classList.remove('hidden');
        elements.combatLog.innerHTML = '';

        let enemyData;
        // Verifica se o inimigo é um NPC persistente
        if (gameState.npcs[enemyId]) {
            const npc = gameState.npcs[enemyId];
            enemyData = {
                id: npc.id,
                name: npc.name,
                ...JSON.parse(JSON.stringify(npc.combat)) // Cópia profunda para não alterar o estado original do NPC
            };
        } else {
            // Se não, busca nos inimigos genéricos
            const genericEnemyData = allGameData.enemies.find(e => e.id === enemyId);
            if (genericEnemyData) {
                // Cópia profunda dos dados do inimigo genérico
                enemyData = JSON.parse(JSON.stringify(genericEnemyData));
                // O objeto de combate já está aninhado, então o usamos diretamente
                enemyData = { ...enemyData, ...enemyData.combat };
            } else {
                console.error(`Inimigo com ID '${enemyId}' não encontrado!`);
                addLogMessage(`Erro: Inimigo não encontrado.`, 'notification');
                endCombat(false); // Termina o combate se o inimigo não existe
                return;
            }
        }

        combatState = {
            player: { ...gameState.player.combat },
            enemy: enemyData,
            turn: 'player',
            playerDefending: false,
            onVictory: allStrings.combat_victory_default
        };

        addLogMessage(`Você entrou em combate com ${combatState.enemy.name}!`, 'combat');
        updateCombatUI();
    }

    function playerTurn(action) {
        if (combatState.turn !== 'player') return;

        combatState.playerDefending = false;
        let playerDamage = 0;

        switch(action) {
            case 'attack':
                playerDamage = Math.max(1, combatState.player.attack - combatState.enemy.defense);
                combatState.enemy.hp -= playerDamage;
                addLogMessage(`Você ataca ${combatState.enemy.name} e causa ${playerDamage} de dano.`, 'combat');
                break;
            case 'qi_strike':
                const qiCost = 20;
                if (gameState.cultivation.qi >= qiCost) {
                    gameState.cultivation.qi -= qiCost;
                    playerDamage = combatState.player.attack + Math.floor(gameState.player.attributes.mind / 2);
                    combatState.enemy.hp -= playerDamage;
                    addLogMessage(`Você usa um Golpe de Qi, causando ${playerDamage} de dano massivo!`, 'combat');
                    updateUI(); // Atualiza a UI para mostrar o Qi gasto
                } else {
                    addLogMessage(`Você não tem Qi suficiente para usar o Golpe de Qi.`, 'notification');
                    return; // Não passa o turno se a ação falhou
                }
                break;
            case 'defend':
                combatState.playerDefending = true;
                addLogMessage(`Você assume uma postura defensiva.`, 'combat');
                break;
            case 'flee':
                if (Math.random() < 0.5) { // 50% de chance de fugir
                    addLogMessage(`Você conseguiu fugir!`, 'notification');
                    endCombat(false);
                } else {
                    addLogMessage(`Você falhou em tentar fugir!`, 'combat');
                }
                break;
        }

        updateCombatUI();

        if (combatState.enemy.hp <= 0) {
            addLogMessage(`${combatState.enemy.name} foi derrotado!`, 'reward');
            endCombat(true);
            return;
        }

        combatState.turn = 'enemy';
        setTimeout(enemyTurn, 1000); // Dá um tempo para o jogador ler o log
    }

    function enemyTurn() {
        if (combatState.turn !== 'enemy') return;

        const enemyDamage = Math.max(1, combatState.enemy.attack - (combatState.playerDefending ? combatState.player.defense * 2 : combatState.player.defense));
        combatState.player.hp -= enemyDamage;

        addLogMessage(`${combatState.enemy.name} ataca e causa ${enemyDamage} de dano.`, 'combat');
        updateCombatUI();

        if (combatState.player.hp <= 0) {
            addLogMessage(`Você foi derrotado!`, 'combat');
            endGame("player_defeat");
            return;
        }

        combatState.turn = 'player';
    }

    function endCombat(isVictory) {
        // Mostra a UI principal e esconde a de combate
        elements.combatScreen.classList.add('hidden');
        elements.eventContent.classList.remove('hidden');
        elements.choicesContainer.classList.remove('hidden');
        elements.actionsContainer.classList.remove('hidden');

        // Atualiza a vida do jogador no gameState principal
        gameState.player.combat.hp = combatState.player.hp;

        if (isVictory) {
            elements.eventContent.innerHTML = `<p>${combatState.onVictory}</p>`;
            // Adicionar recompensas aqui no futuro
        } else {
            elements.eventContent.innerHTML = `<p>${allStrings.combat_defeat_default}</p>`;
            // Adicionar penalidades aqui no futuro
        }
        elements.choicesContainer.innerHTML = ''; // Limpa as escolhas
        updateUI();
    }

    function endGame(reason) {
        elements.actionsContainer.classList.add('hidden');
        elements.eventContent.innerHTML = `<h2>Fim da Jornada</h2>`;

        switch(reason) {
            case "old_age":
                elements.eventContent.innerHTML += `<p>Após ${gameState.age} anos, sua jornada chega ao fim. O tempo é implacável, e seu corpo mortal não aguenta mais. Você se torna um com o Dao, deixando para trás uma lenda.</p>`;
                break;
            case "player_defeat":
                 elements.eventContent.innerHTML += `<p>Você foi derrotado em combate. Seus ferimentos são graves demais e sua jornada termina aqui.</p>`;
                break;
        }

        // Resumo da Jornada
        const finalCultivationRealm = allGameData.realms[gameState.cultivation.realmId].name;
        const finalSect = gameState.sect.id ? allGameData.sects.find(s => s.id === gameState.sect.id) : null;
        const finalSectRank = finalSect ? finalSect.ranks.find(r => r.id === gameState.sect.rank).name : "Nenhum";

        elements.eventContent.innerHTML += `
            <hr>
            <h3>Legado de ${gameState.player.name}</h3>
            <ul>
                <li><strong>Idade Final:</strong> ${gameState.age}</li>
                <li><strong>Cultivo Final:</strong> ${finalCultivationRealm} - Nível ${gameState.cultivation.level}</li>
                <li><strong>Seita:</strong> ${finalSect ? finalSect.name : "Nenhuma"}</li>
                <li><strong>Rank na Seita:</strong> ${finalSectRank}</li>
                <li><strong>Talentos Adquiridos:</strong> ${gameState.talents.length}</li>
            </ul>
        `;

        calculateAndStoreLegacy();

        // Futuramente, aqui será a tela de Legado
        elements.choicesContainer.innerHTML = `<button onclick="location.reload()">Começar uma Nova Jornada</button>`;
    }

    // --- LÓGICA DE LEGADO (NEW GAME+) ---
    const LEGACY_BONUSES = [
        { id: 'start_body_1', name: "+1 Corpo Inicial", cost: 10, type: 'attribute', effects: { attributes: { body: 1 } } },
        { id: 'start_mind_1', name: "+1 Mente Inicial", cost: 10, type: 'attribute', effects: { attributes: { mind: 1 } } },
        { id: 'start_luck_1', name: "+1 Sorte Inicial", cost: 25, type: 'attribute', effects: { attributes: { luck: 1 } } },
        { id: 'start_money_50', name: "+50 Moedas Iniciais", cost: 5, type: 'resource', effects: { resources: { money: 50 } } },
        { id: 'start_talent_fast_learner', name: "Começar com Talento: Aprendiz Rápido", cost: 50, type: 'talent', talentId: 'fast_learner' },
    ];

    function getLegacyData() {
        return JSON.parse(localStorage.getItem('immortalJourneyLegacy')) || { legacyPoints: 0, bonuses: {} };
    }

    function saveLegacyData(legacyData) {
        localStorage.setItem('immortalJourneyLegacy', JSON.stringify(legacyData));
    }

    function calculateAndStoreLegacy() {
        let legacyPoints = 0;
        legacyPoints += Math.floor(gameState.age / 2);
        legacyPoints += gameState.cultivation.realmId * 25;
        legacyPoints += gameState.sect.rank * 10;
        legacyPoints += gameState.talents.length * 5;

        const legacyData = getLegacyData();
        legacyData.legacyPoints += legacyPoints;
        saveLegacyData(legacyData);
        elements.eventContent.innerHTML += `<p><strong>Você ganhou ${legacyPoints} Pontos de Legado!</strong></p>`;
    }

    function showLegacyStore() {
        const legacyData = getLegacyData();
        elements.legacyScreen.classList.remove('hidden');
        elements.legacyPoints.textContent = legacyData.legacyPoints;

        const container = elements.legacyBonusesContainer;
        container.innerHTML = '';

        LEGACY_BONUSES.forEach(bonus => {
            const button = document.createElement('button');
            const isPurchased = !!legacyData.bonuses[bonus.id];
            button.innerHTML = `${bonus.name} <br><small>(Custo: ${bonus.cost})</small>`;
            button.disabled = isPurchased || legacyData.legacyPoints < bonus.cost;
            if (isPurchased) {
                button.innerHTML += ` <br><small>(Adquirido)</small>`;
            }
            button.onclick = () => purchaseLegacyBonus(bonus.id);
            container.appendChild(button);
        });
    }

    function purchaseLegacyBonus(bonusId) {
        const legacyData = getLegacyData();
        const bonus = LEGACY_BONUSES.find(b => b.id === bonusId);

        if (legacyData.legacyPoints >= bonus.cost && !legacyData.bonuses[bonus.id]) {
            legacyData.legacyPoints -= bonus.cost;
            legacyData.bonuses[bonus.id] = true;
            saveLegacyData(legacyData);
            showLegacyStore(); // Atualiza a UI da loja
        }
    }


    // --- LÓGICA DE CULTIVO ---
    function calculateMaxQi(cultivation) {
        const realm = allGameData.realms[cultivation.realmId];
        return realm.baseMaxQi + (realm.qiPerLevel * (cultivation.level - 1));
    }

    function handleMeditateOrBreakthrough() {
        const cult = gameState.cultivation;
        const player = gameState.player;
        const currentRealm = allGameData.realms[cult.realmId];

        // Se não tiver Qi máximo, apenas medita
        if (cult.qi < cult.maxQi) {
            let qiGained = 10 + Math.floor(player.attributes.mind / 2);
            // Verifica o talento "Aprendiz Rápido"
            if (gameState.talents.includes('fast_learner')) {
                qiGained = Math.floor(qiGained * 1.5);
            }
            cult.qi = Math.min(cult.maxQi, cult.qi + qiGained);
            elements.eventContent.innerHTML = `<p>Você medita e sente seu Qi fluir. (+${qiGained} Qi)</p>`;
            elements.choicesContainer.innerHTML = '';
        } else { // Tenta o avanço
            elements.eventContent.innerHTML = `<p>Você sente a barreira do próximo nível. Você se concentra para tentar o avanço...</p>`;
            elements.choicesContainer.innerHTML = '';

            const successChance = 0.5 + (player.attributes.mind / 100) + (player.attributes.luck / 200); // Ex: 50% base + 0.1 (10 Mente) + 0.025 (5 Sorte) = 62.5%

            setTimeout(() => {
                if (Math.random() < successChance) {
                    // SUCESSO
                    cult.level++;

                    const attributeBonus = currentRealm.attributeBonusOnBreakthrough;
                    applyEffects({attributes: attributeBonus});

                    let successMsg = `SUCESSO! Você avançou para o Nível ${cult.level} do Reino ${currentRealm.name}! Seus atributos aumentaram.`;

                    // Verifica se avançou para o próximo Reino
                    if (cult.level > currentRealm.levels) {
                        if (allGameData.realms[cult.realmId + 1]) {
                            cult.realmId++;
                            cult.level = 1;
                            const newRealm = allGameData.realms[cult.realmId];
                            player.lifespan += newRealm.lifespan_bonus; // Aumenta a expectativa de vida
                            successMsg = `<span style="color: var(--color-accent-special); font-weight: bold;">AVANÇO DE REINO!</span> Você ascendeu para o Reino ${newRealm.name}! Sua expectativa de vida aumentou em ${newRealm.lifespan_bonus} anos!`;
                        } else {
                            // Fim do conteúdo de reinos atual
                            successMsg = `Você atingiu o pico do cultivo conhecido! O caminho adiante é um mistério.`;
                            cult.level = currentRealm.levels; // Previne ir além do nível máximo
                        }
                    }

                    cult.qi = 0;
                    cult.maxQi = calculateMaxQi(cult);
                    elements.eventContent.innerHTML = `<p>${successMsg}</p>`;

                } else {
                    // FALHA
                    const backlashDamage = Math.floor(cult.maxQi / 10);
                    player.combat.hp = Math.max(1, player.combat.hp - backlashDamage);
                    cult.qi = Math.floor(cult.qi / 2); // Perde metade do Qi
                    elements.eventContent.innerHTML = `<p>FALHA! A energia se revolta dentro de você, causando dano interno (${backlashDamage} HP) e dispersando seu Qi.</p>`;
                }
                updateUI();
            }, 1500); // Adiciona um suspense
        }
        updateUI();
    }


    // --- INICIALIZAÇÃO ---
    function startGame() {
        const player = generateCharacter('player', 'masculino');
        const rival = generateCharacter('rival', 'masculino');

        // Aplicar bônus de legado
        const legacyData = getLegacyData();
        const startingResources = { money: 10, reputation: 0, talentPoints: 5, contribution: 0 };
        const startingTalents = [];

        for(const bonusId in legacyData.bonuses) {
             if (legacyData.bonuses[bonusId]) {
                const bonus = LEGACY_BONUSES.find(b => b.id === bonusId);
                if (!bonus) continue;

                if (bonus.type === 'resource' && bonus.effects.resources) {
                    for(const resource in bonus.effects.resources) {
                        startingResources[resource] += bonus.effects.resources[resource];
                    }
                }
                if (bonus.type === 'talent') {
                    startingTalents.push(bonus.talentId);
                }
            }
        }

        gameState = {
            player, npcs: { [rival.id]: rival }, age: 0,
            resources: startingResources,
            cultivation: { realmId: 0, level: 1, qi: 0 },
            lastFailedSpecial: null, talents: startingTalents, sect: { id: null, rank: 0, currentMissionId: null },
            currentWorldEvent: null,
            relationships: { [rival.id]: { score: 0, state: 'neutral' } },
            rivalId: rival.id,
            triggeredEvents: []
        };
        gameState.cultivation.maxQi = calculateMaxQi(gameState.cultivation);

        elements.legacyScreen.classList.add('hidden');
        elements.nextYearBtn.addEventListener('click', advanceYear);
        elements.meditateBtn.addEventListener('click', handleMeditateOrBreakthrough);
        elements.talentsBtn.addEventListener('click', showTalentScreen);
        elements.sectActionsBtn.addEventListener('click', showSectActions);
        elements.combatActions.addEventListener('click', (e) => {
            if (e.target.classList.contains('combat-action-btn')) playerTurn(e.target.dataset.action);
        });
        updateUI();
    }

    function initializeGame() {
        const legacyData = getLegacyData();
        if (legacyData.legacyPoints > 0) {
            showLegacyStore();
            elements.startNewJourneyBtn.onclick = startGame;
        } else {
            startGame();
        }
    }
    loadGameData();
});
