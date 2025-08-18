document.addEventListener('DOMContentLoaded', () => {
    // --- CACHE DE ELEMENTOS DO DOM ---
    const elements = {
        name: document.getElementById('char-name'),
        age: document.getElementById('char-age'),
        attrHealth: document.getElementById('attr-health'),
        attrMaxHealth: document.getElementById('attr-max-health'),
        attrBody: document.getElementById('attr-body'),
        attrMind: document.getElementById('attr-mind'),
        attrSoul: document.getElementById('attr-soul'),
        attrLuck: document.getElementById('attr-luck'),
        cultRealm: document.getElementById('cult-realm'),
        cultQi: document.getElementById('cult-qi'),
        cultQiMax: document.getElementById('cult-qi-max'),
        resMoney: document.getElementById('res-money'),
        resReputation: document.getElementById('res-reputation'),
        sectInfoContainer: document.getElementById('sect-info-container'),
        sectName: document.getElementById('sect-name'),
        sectRank: document.getElementById('sect-rank'),
        sectContribution: document.getElementById('sect-contribution'),
        inventoryList: document.getElementById('inventory-list'),
        relationshipsList: document.getElementById('relationships-list'),
        eventContent: document.getElementById('event-content'),
        choicesContainer: document.getElementById('choices-container'),
        nextYearBtn: document.getElementById('next-year-btn'),
        sectActionsBtn: document.getElementById('sect-actions-btn')
    };

    let gameState = {};
    let allGameData = {};
    let combatState = null;

    const cultivationRealms = [
        { name: "Mortal", qiMax: 100 },
        { name: "Condensação de Qi", qiMax: 500 },
        { name: "Estabelecimento de Fundação", qiMax: 2000 },
        { name: "Núcleo Dourado", qiMax: 10000 }
    ];

    // --- FUNÇÕES DE COMBATE ---
    function startCombat(enemyId) {
        const enemyData = allGameData.enemies.find(e => e.id === enemyId);
        if (!enemyData) { return; }
        combatState = {
            enemy: enemyData,
            enemyHealth: enemyData.attributes.health,
            log: []
        };
        gameState.combat = combatState;
        showCombatUI();
    }

    function showCombatUI() {
        if (!combatState) return;
        const combatLog = combatState.log.map(entry => `<p>${entry}</p>`).join('');
        const combatHTML = `
            <h2>Combate!</h2>
            <p><strong>${combatState.enemy.name}</strong> - Saúde: ${combatState.enemyHealth}</p>
            <p><strong>Você</strong> - Saúde: ${gameState.attributes.health}</p>
            <hr><div class="combat-log">${combatLog}</div>`;
        elements.eventContent.innerHTML = combatHTML;
        elements.choicesContainer.innerHTML = '';
        const attackButton = document.createElement('button');
        attackButton.textContent = "Ataque Físico";
        attackButton.onclick = () => takeCombatTurn('physical');
        elements.choicesContainer.appendChild(attackButton);
        elements.nextYearBtn.style.display = 'none';
        elements.sectActionsBtn.style.display = 'none';
    }

    function takeCombatTurn(attackType) {
        if (!combatState) return;
        combatState.log = [];
        const playerDamage = Math.max(1, Math.floor(gameState.attributes.body / 2) + Math.floor(Math.random() * (gameState.attributes.luck / 2)));
        combatState.enemyHealth -= playerDamage;
        combatState.log.push(`Você ataca e causa ${playerDamage} de dano.`);
        if (combatState.enemyHealth <= 0) {
            endCombat('win');
            return;
        }
        const enemyDamage = Math.max(1, Math.floor(combatState.enemy.attributes.body / 2));
        gameState.attributes.health -= enemyDamage;
        combatState.log.push(`${combatState.enemy.name} ataca e causa ${enemyDamage} de dano.`);
        if (gameState.attributes.health <= 0) {
            endCombat('loss');
            return;
        }
        showCombatUI();
        updateUI();
    }

    function endCombat(outcome) {
        const originalEvent = allGameData.events.find(e => e.age === gameState.age && e.choices.some(c => c.effects.special === 'duel_lian'));
        let resultText = '';
        if (outcome === 'win') {
            resultText = allGameData.strings[originalEvent.choices[0].successKey];
        } else {
            resultText = allGameData.strings[originalEvent.choices[0].failureKey];
        }
        elements.eventContent.innerHTML = `<p>${resultText}</p>`;
        elements.choicesContainer.innerHTML = '';
        combatState = null;
        gameState.combat = null;
        if (gameState.attributes.health <= 0) {
            showDeathScreen();
        } else {
            elements.nextYearBtn.style.display = 'block';
            if (gameState.sect.id) elements.sectActionsBtn.style.display = 'block';
            updateUI();
        }
    }

    // --- FUNÇÕES DE LÓGICA DO JOGO ---
    function applyEffects(effects) {
        if (!effects) return;
        if (effects.attributes) {
            for (const attr in effects.attributes) gameState.attributes[attr] += effects.attributes[attr];
        }
        if (effects.resources) {
            for (const res in effects.resources) gameState.resources[res] += effects.resources[res];
        }
        if (effects.cultivation) {
            for (const cult in effects.cultivation) gameState.cultivation[cult] += effects.cultivation[cult];
        }
        if (effects.relationships) {
            for (const person in effects.relationships) {
                const existingRel = gameState.relationships.find(r => r.name === person);
                if (existingRel) existingRel.value += effects.relationships[person];
                else gameState.relationships.push({ name: person, value: effects.relationships[person] });
            }
        }
        if (effects.item) {
            gameState.inventory.push(effects.item);
        }
    }

    function handleSpecialEffects(specialKey) {
        let success = false;
        switch (specialKey) {
            case "monk_disciple":
                if (Math.random() > 0.5) {
                    gameState.inventory.push("basic_breathing_technique");
                    gameState.cultivation.qi += 5;
                    success = true;
                } else {
                    gameState.attributes.luck += 1;
                    success = false;
                }
                break;
            case "explore_cave":
                if (Math.random() > 0.5) {
                    gameState.inventory.push("body_refining_pill");
                    gameState.attributes.body += 1;
                    gameState.attributes.soul += 1;
                    success = true;
                } else {
                    gameState.attributes.health -= 5;
                    success = false;
                }
                break;
            case "buy_jade_pill":
                if (gameState.resources.money >= 20) {
                    gameState.resources.money -= 20;
                    gameState.attributes.soul += 5;
                    success = true;
                } else success = false;
                break;
            case "buy_qi_pill":
                if (gameState.resources.money >= 25) {
                    gameState.resources.money -= 25;
                    gameState.cultivation.qi += 50;
                    success = true;
                } else success = false;
                break;
            case "meditate_power_spot":
                if (gameState.attributes.mind > 12) {
                    gameState.cultivation.qi += 75;
                    gameState.attributes.mind += 1;
                    success = true;
                } else {
                    gameState.attributes.mind -= 1;
                    success = false;
                }
                break;
            case "duel_lian":
                startCombat('rival_lian_14');
                success = true;
                break;
            case "sect_exam_hidden_cloud":
                if (gameState.attributes.mind >= 12 && gameState.attributes.soul >= 12) {
                    gameState.sect.id = "hidden_cloud_sect";
                    success = true;
                } else success = false;
                break;
            default:
                success = true;
        }
        return success;
    }

    // --- FUNÇÕES DE UI ---
    function showDeathScreen() {
        if (gameState.cultivation.realmIndex >= 2) {
            const legacyBonus = { attribute: 'luck', value: 1 };
            localStorage.setItem('wuxiaLegacy', JSON.stringify(legacyBonus));
        }
        const finalRealm = cultivationRealms[gameState.cultivation.realmIndex].name;
        const summaryHTML = `<h2>Fim da Jornada</h2><p>Você viveu até os <strong>${gameState.age}</strong> anos.</p><p>Seu cultivo alcançou o reino de <strong>${finalRealm}</strong>.</p><p>Sua reputação final foi de <strong>${gameState.resources.reputation}</strong>.</p><p>Você terminou sua jornada com <strong>${gameState.inventory.length}</strong> itens em sua posse.</p><hr><p>O Dao é eterno, e o ciclo recomeça. Uma nova vida o aguarda.</p>`;
        elements.eventContent.innerHTML = summaryHTML;
        elements.choicesContainer.innerHTML = '';
        const restartButton = document.createElement('button');
        restartButton.textContent = "Começar Nova Vida";
        restartButton.onclick = () => location.reload();
        elements.choicesContainer.appendChild(restartButton);
        elements.nextYearBtn.style.display = 'none';
        elements.sectActionsBtn.style.display = 'none';
    }

    function showSectStore() {
        const sectData = allGameData.sects.find(s => s.id === gameState.sect.id);
        if (!sectData) return;
        elements.eventContent.innerHTML = `<p>Você entra no pavilhão de tesouros da ${sectData.name}.</p>`;
        elements.choicesContainer.innerHTML = '';
        sectData.store.forEach(item => {
            const itemButton = document.createElement('button');
            itemButton.textContent = `Comprar ${item.name} (${item.cost} contribuição)`;
            itemButton.onclick = () => {
                if (gameState.sect.contribution >= item.cost) {
                    gameState.sect.contribution -= item.cost;
                    applyEffects(item.effects);
                    if (item.type === 'pill' || item.type === 'technique') gameState.inventory.push(item.id);
                    elements.eventContent.innerHTML = `<p>Você adquiriu ${item.name}!</p>`;
                    elements.choicesContainer.innerHTML = '';
                    showSectStore();
                } else {
                    elements.eventContent.innerHTML = "<p>Você não tem pontos de contribuição suficientes.</p>";
                }
                updateUI();
            };
            elements.choicesContainer.appendChild(itemButton);
        });
        const leaveStoreButton = document.createElement('button');
        leaveStoreButton.textContent = "Sair da Loja";
        leaveStoreButton.onclick = showSectActions;
        elements.choicesContainer.appendChild(leaveStoreButton);
    }

    function showSectActions() {
        elements.eventContent.innerHTML = "<p>Você está no pátio principal da sua seita. O que gostaria de fazer?</p>";
        elements.choicesContainer.innerHTML = '';
        const missionButton = document.createElement('button');
        missionButton.textContent = "Aceitar uma Missão da Seita";
        missionButton.onclick = acceptSectMission;
        elements.choicesContainer.appendChild(missionButton);
        const storeButton = document.createElement('button');
        storeButton.textContent = "Visitar a Loja da Seita";
        storeButton.onclick = showSectStore;
        elements.choicesContainer.appendChild(storeButton);
        const sectData = allGameData.sects.find(s => s.id === gameState.sect.id);
        const currentRankIndex = gameState.sect.rankIndex;
        const nextRankIndex = currentRankIndex + 1;
        if (nextRankIndex < sectData.ranks.length) {
            const promotionButton = document.createElement('button');
            const neededContribution = sectData.contribution_needed[currentRankIndex];
            promotionButton.textContent = `Tentar Promoção para ${sectData.ranks[nextRankIndex]} (${neededContribution} contribuição)`;
            if (gameState.sect.contribution >= neededContribution) {
                promotionButton.onclick = () => {
                    gameState.sect.contribution -= neededContribution;
                    gameState.sect.rankIndex++;
                    elements.eventContent.innerHTML = `<p>Parabéns! Você foi promovido para ${sectData.ranks[gameState.sect.rankIndex]}!</p>`;
                    elements.choicesContainer.innerHTML = '';
                    updateUI();
                };
            } else {
                promotionButton.disabled = true;
            }
            elements.choicesContainer.appendChild(promotionButton);
        }
        const leaveButton = document.createElement('button');
        leaveButton.textContent = "Voltar às suas atividades";
        leaveButton.onclick = () => {
            elements.eventContent.innerHTML = "Você volta para seus afazeres, pronto para o próximo ano.";
            elements.choicesContainer.innerHTML = '';
            elements.nextYearBtn.style.display = 'block';
            elements.sectActionsBtn.style.display = 'block';
        };
        elements.choicesContainer.appendChild(leaveButton);
        elements.nextYearBtn.style.display = 'none';
        elements.sectActionsBtn.style.display = 'none';
    }

    function acceptSectMission() {
        const sectData = allGameData.sects.find(s => s.id === gameState.sect.id);
        if (!sectData || !sectData.missions || sectData.missions.length === 0) {
            elements.eventContent.innerHTML = "<p>Não há missões disponíveis no momento.</p>";
            return;
        }
        const mission = sectData.missions[Math.floor(Math.random() * sectData.missions.length)];
        elements.eventContent.innerHTML = `<p><strong>Nova Missão: ${mission.name}</strong></p><p>${mission.description}</p>`;
        elements.choicesContainer.innerHTML = '';
        const attemptButton = document.createElement('button');
        attemptButton.textContent = "Tentar a Missão";
        attemptButton.onclick = () => {
            let missionSuccess = false;
            let outcomeText = '';
            if (mission.check.special) {
                missionSuccess = handleSpecialEffects(mission.check.special, mission);
                if (!gameState.combat) {
                    outcomeText = missionSuccess ? `Sucesso na missão '${mission.name}'!` : `Falha na missão '${mission.name}'.`;
                    if(missionSuccess) applyEffects(mission.rewards.success);
                    else applyEffects(mission.rewards.failure);
                    elements.eventContent.innerHTML = `<p>${outcomeText}</p>`;
                    elements.choicesContainer.innerHTML = '';
                    if (gameState.attributes.health <= 0) showDeathScreen();
                    else updateUI();
                }
            } else {
                const playerStat = gameState.attributes[mission.check.attribute];
                const successChance = 0.5 + ((playerStat - mission.check.difficulty) * 0.05);
                missionSuccess = Math.random() < successChance;
                if (missionSuccess) {
                    applyEffects(mission.rewards.success);
                    outcomeText = `Sucesso! Você completou a missão '${mission.name}'.`;
                } else {
                    applyEffects(mission.rewards.failure);
                    outcomeText = `Falha! Você não conseguiu completar a missão '${mission.name}'.`;
                }
                elements.eventContent.innerHTML = `<p>${outcomeText}</p>`;
                elements.choicesContainer.innerHTML = '';
                if (gameState.attributes.health <= 0) showDeathScreen();
                else updateUI();
            }
        };
        elements.choicesContainer.appendChild(attemptButton);
        const refuseButton = document.createElement('button');
        refuseButton.textContent = "Recusar Missão";
        refuseButton.onclick = showSectActions;
        elements.choicesContainer.appendChild(refuseButton);
    }

    function updateUI() {
        if (!gameState.combat) {
            elements.nextYearBtn.style.display = 'block';
        }
        const currentRealm = cultivationRealms[gameState.cultivation.realmIndex];
        elements.age.textContent = gameState.age;
        elements.attrHealth.textContent = gameState.attributes.health;
        elements.attrMaxHealth.textContent = gameState.attributes.maxHealth;
        elements.attrBody.textContent = gameState.attributes.body;
        elements.attrMind.textContent = gameState.attributes.mind;
        elements.attrSoul.textContent = gameState.attributes.soul;
        elements.attrLuck.textContent = gameState.attributes.luck;
        elements.cultRealm.textContent = currentRealm.name;
        elements.cultQi.textContent = gameState.cultivation.qi;
        elements.cultQiMax.textContent = currentRealm.qiMax;
        elements.resMoney.textContent = `${gameState.resources.money} Moedas de Cobre`;
        elements.resReputation.textContent = gameState.resources.reputation;
        if (gameState.sect.id) {
            const sectData = allGameData.sects.find(s => s.id === gameState.sect.id);
            if (sectData) {
                elements.sectInfoContainer.style.display = 'block';
                elements.sectName.textContent = sectData.name;
                elements.sectRank.textContent = sectData.ranks[gameState.sect.rankIndex];
                elements.sectContribution.textContent = gameState.sect.contribution;
                elements.sectActionsBtn.style.display = 'block';
            }
        } else {
            elements.sectInfoContainer.style.display = 'none';
            elements.sectActionsBtn.style.display = 'none';
        }
        updateInventoryList();
        updateRelationshipsList();
    }

    function updateInventoryList() {
        elements.inventoryList.innerHTML = '';
        const allStoreItems = allGameData.sects.flatMap(sect => sect.store || []);
        const allItems = [...allStoreItems, ...(allGameData.items || [])];
        if (gameState.inventory.length === 0) {
            elements.inventoryList.innerHTML = '<li>Nenhum</li>';
            return;
        }
        gameState.inventory.forEach((itemId, index) => {
            const itemData = allItems.find(i => i.id === itemId);
            if (!itemData) return;
            const li = document.createElement('li');
            if (itemData.type === 'pill') {
                const useButton = document.createElement('button');
                useButton.textContent = `Usar ${itemData.name}`;
                useButton.onclick = () => {
                    applyEffects(itemData.effects);
                    gameState.inventory.splice(index, 1);
                    updateUI();
                };
                li.appendChild(useButton);
            } else {
                li.textContent = itemData.name;
            }
            elements.inventoryList.appendChild(li);
        });
    }

    function updateRelationshipsList() {
        elements.relationshipsList.innerHTML = '';
        if (gameState.relationships.length === 0) {
            elements.relationshipsList.innerHTML = '<li>Nenhum</li>';
        } else {
            gameState.relationships.forEach(rel => {
                const li = document.createElement('li');
                li.textContent = `${rel.name}: ${rel.value}`;
                elements.relationshipsList.appendChild(li);
            });
        }
    }

    function showEvent(event) {
        elements.eventContent.innerHTML = `<p>${event.text}</p>`;
        elements.choicesContainer.innerHTML = '';
        event.choices.forEach(choice => {
            const button = document.createElement('button');
            button.textContent = choice.text;
            button.onclick = () => {
                let success = true;
                if (choice.effects.special) {
                    success = handleSpecialEffects(choice.effects.special);
                } else {
                    applyEffects(choice.effects);
                }

                // Se o efeito especial iniciou um combate, não continue a renderizar o texto do resultado.
                if (gameState.combat) {
                    return;
                }

                let resultText;
                if (choice.effects.special) {
                    const key = success ? choice.successKey : choice.failureKey;
                    resultText = allGameData.strings[key] || "Resultado não encontrado.";
                } else {
                    resultText = allGameData.strings[choice.resultKey] || "Resultado não encontrado.";
                }
                elements.eventContent.innerHTML = `<p>${resultText}</p>`;
                elements.choicesContainer.innerHTML = '';
                if (gameState.attributes.health <= 0) {
                    showDeathScreen();
                } else {
                    if (!gameState.combat) {
                        elements.nextYearBtn.style.display = 'block';
                    }
                    updateUI();
                }
            };
            elements.choicesContainer.appendChild(button);
        });
        elements.nextYearBtn.style.display = 'none';
    }

    function triggerBreakthroughEvent() {
        const currentRealmIndex = gameState.cultivation.realmIndex;
        const nextRealm = cultivationRealms[currentRealmIndex + 1];
        if (!nextRealm) {
            elements.eventContent.innerHTML = "<p>Você atingiu o pico do mundo mortal. O caminho à frente está velado em mistério.</p>";
            return;
        }
        elements.eventContent.innerHTML = `<p>Você acumulou Qi suficiente e sentiu um gargalo em seu cultivo. Você pode tentar avançar para o próximo reino: ${nextRealm.name}. O que você faz?</p>`;
        elements.choicesContainer.innerHTML = '';
        const choices = [
            {
                text: "Tentar o avanço agora.",
                action: () => {
                    const successChance = 0.5 + (gameState.attributes.luck * 0.01);
                    if (Math.random() < successChance) {
                        gameState.cultivation.realmIndex++;
                        gameState.cultivation.qi = 0;
                        elements.eventContent.innerHTML = `<p>Parabéns! Após uma meditação perigosa, você rompeu seus limites e avançou para o reino ${nextRealm.name}!</p>`;
                    } else {
                        gameState.cultivation.qi = Math.floor(gameState.cultivation.qi * 0.8);
                        elements.eventContent.innerHTML = "<p>A tentativa falhou! Seu Qi se dispersa violentamente e você sofre um revés. Você precisará de mais tempo para se estabilizar.</p>";
                    }
                }
            },
            {
                text: "Usar Pílula do Estabelecimento de Fundação",
                requires: "foundation_pill",
                action: () => {
                    const pillIndex = gameState.inventory.indexOf("foundation_pill");
                    gameState.inventory.splice(pillIndex, 1);
                    gameState.cultivation.realmIndex++;
                    gameState.cultivation.qi = 0;
                    elements.eventContent.innerHTML = `<p>Com a ajuda da pílula, você avança para o reino ${nextRealm.name} sem dificuldades!</p>`;
                }
            },
            {
                text: "Esperar e acumular mais base.",
                action: () => {
                    elements.eventContent.innerHTML = "<p>Você decide esperar, sentindo que uma base mais sólida aumentará suas chances no futuro.</p>";
                }
            }
        ];
        choices.forEach(choice => {
            if (choice.requires && !gameState.inventory.includes(choice.requires)) {
                return; // Pula esta opção se o item não estiver no inventário
            }
            const button = document.createElement('button');
            button.textContent = choice.text;
            button.onclick = () => {
                choice.action();
                elements.choicesContainer.innerHTML = '';
                if (gameState.attributes.health <= 0) {
                    showDeathScreen();
                } else {
                    elements.nextYearBtn.style.display = 'block';
                    updateUI();
                }
            };
            elements.choicesContainer.appendChild(button);
        });

        elements.nextYearBtn.style.display = 'none';
    }

    function advanceYear() {
        if (gameState.combat) {
            showCombatUI();
            return;
        }
        gameState.age++;
        if (gameState.age > 50) {
            gameState.attributes.health--;
        }
        if (gameState.attributes.health <= 0) {
            showDeathScreen();
            return;
        }
        if (gameState.inventory.includes("basic_breathing_technique")) {
            gameState.cultivation.qi += 10;
        } else {
            gameState.cultivation.qi += 5;
        }
        const currentRealm = cultivationRealms[gameState.cultivation.realmIndex];
        if (gameState.cultivation.qi >= currentRealm.qiMax) {
            gameState.cultivation.qi = currentRealm.qiMax;
            triggerBreakthroughEvent();
        } else {
            const eventsForAge = allGameData.events.filter(event => event.age === gameState.age);
            let currentEvent = eventsForAge.find(event => event.sectId === gameState.sect.id);
            if (!currentEvent) {
                currentEvent = eventsForAge.find(event => !event.sectId);
            }
            if (currentEvent) {
                showEvent(currentEvent);
            } else {
                elements.eventContent.innerHTML = `<p>Você passou um ano tranquilo meditando e treinando. Nada de extraordinário aconteceu.</p>`;
                elements.nextYearBtn.style.display = 'block';
            }
        }
        updateUI();
    }

    // --- INICIALIZAÇÃO DO JOGO ---
    function initializeGame(gameData) {
        allGameData = gameData;
        allEvents = gameData.events;
        gameState = {
            age: 0,
            attributes: { health: 100, maxHealth: 100, body: 10, mind: 10, soul: 10, luck: 5 },
            cultivation: { realmIndex: 0, qi: 0 },
            resources: { money: 10, reputation: 0 },
            inventory: [],
            relationships: [],
            sect: {
                id: null,
                rankIndex: 0,
                contribution: 0
            },
            combat: null
        };
        const legacyData = localStorage.getItem('wuxiaLegacy');
        if (legacyData) {
            try {
                const legacyBonus = JSON.parse(legacyData);
                if (legacyBonus && legacyBonus.attribute && legacyBonus.value) {
                    gameState.attributes[legacyBonus.attribute] += legacyBonus.value;
                    // Adiciona a notificação sobre o legado no início do log, em vez de substituir o texto.
                    const legacyMessage = document.createElement('p');
                    legacyMessage.innerHTML = `Você sente a bênção de um ancestral. (+${legacyBonus.value} ${legacyBonus.attribute})`;
                    legacyMessage.style.color = '#a29bfe'; // Cor de destaque
                    elements.eventContent.prepend(legacyMessage);
                    localStorage.removeItem('wuxiaLegacy');
                }
            } catch (e) {
                console.error("Erro ao processar o legado:", e);
                localStorage.removeItem('wuxiaLegacy');
            }
        }

        elements.nextYearBtn.addEventListener('click', advanceYear);
        elements.sectActionsBtn.addEventListener('click', showSectActions);
        updateUI();
    }

    initializeGame(wuxiaGameData);
});
