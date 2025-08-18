document.addEventListener('DOMContentLoaded', () => {
    // --- CACHE DE ELEMENTOS DO DOM ---
    const elements = {
        name: document.getElementById('char-name'),
        age: document.getElementById('char-age'),
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
        eventText: document.getElementById('event-text'),
        choicesContainer: document.getElementById('choices-container'),
        nextYearBtn: document.getElementById('next-year-btn'),
        sectActionsBtn: document.getElementById('sect-actions-btn')
    };

    let gameState = {};
    let allEvents = [];
    let allGameData = {};

    const cultivationRealms = [
        { name: "Mortal", qiMax: 100 },
        { name: "Condensação de Qi", qiMax: 500 },
        { name: "Estabelecimento de Fundação", qiMax: 2000 },
        { name: "Núcleo Dourado", qiMax: 10000 }
    ];

    // --- FUNÇÕES DE LÓGICA DO JOGO ---

    /** Aplica os efeitos de uma escolha ao estado do jogo */
    function applyEffects(effects) {
        if (!effects) return;

        if (effects.attributes) {
            for (const attr in effects.attributes) {
                gameState.attributes[attr] += effects.attributes[attr];
            }
        }
        if (effects.resources) {
            for (const res in effects.resources) {
                gameState.resources[res] += effects.resources[res];
            }
        }
        if (effects.cultivation) {
            for (const cult in effects.cultivation) {
                gameState.cultivation[cult] += effects.cultivation[cult];
            }
        }
        if (effects.relationships) {
            for (const person in effects.relationships) {
                const existingRel = gameState.relationships.find(r => r.name === person);
                if (existingRel) {
                    existingRel.value += effects.relationships[person];
                } else {
                    gameState.relationships.push({ name: person, value: effects.relationships[person] });
                }
            }
        }
    }

    /** Lida com lógicas de eventos complexos que não se encaixam no modelo de dados simples */
    function handleSpecialEffects(specialKey) {
        let success = false;
        switch (specialKey) {
            case "monk_disciple":
                if (Math.random() > 0.5) {
                    gameState.inventory.push("Técnica de Respiração Básica");
                    gameState.cultivation.qi += 5;
                    success = true;
                } else {
                    gameState.attributes.luck += 1;
                    success = false;
                }
                break;
            case "explore_cave":
                if (Math.random() > 0.5) {
                    gameState.inventory.push("Pílula de Refinamento Corporal");
                    gameState.attributes.body += 1;
                    gameState.attributes.soul += 1;
                    success = true;
                } else {
                    // Placeholder for health system
                    success = false;
                }
                break;
            case "buy_jade_pill":
                if (gameState.resources.money >= 20) {
                    gameState.resources.money -= 20;
                    gameState.attributes.soul += 5;
                    success = true;
                } else {
                    success = false;
                }
                break;
            case "buy_qi_pill":
                if (gameState.resources.money >= 25) {
                    gameState.resources.money -= 25;
                    gameState.cultivation.qi += 50;
                    success = true;
                } else {
                    success = false;
                }
                break;
            case "meditate_power_spot":
                // Requer uma mente forte para resistir à energia
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
                // Chance de vitória baseada no corpo e na sorte
                const winChance = 0.5 + (gameState.attributes.body - 10) * 0.02 + (gameState.attributes.luck - 5) * 0.01;
                if (Math.random() < winChance) {
                    gameState.resources.reputation += 2;
                    applyEffects({ "relationships": { "Lian": 5 } });
                    success = true;
                } else {
                    gameState.resources.reputation -= 1;
                    applyEffects({ "relationships": { "Lian": -5 } });
                    success = false;
                }
                break;
            case "sect_exam_hidden_cloud":
                // Requer mente e alma fortes para passar no exame da seita justa
                if (gameState.attributes.mind >= 12 && gameState.attributes.soul >= 12) {
                    gameState.sect.id = "hidden_cloud_sect";
                    success = true;
                } else {
                    success = false;
                }
                break;
            default:
                success = true;
        }
        return success;
    }

    // --- FUNÇÕES DE UI ---

    /** Mostra a loja da seita */
    function showSectStore() {
        const sectData = allGameData.sects.find(s => s.id === gameState.sect.id);
        if (!sectData) return;

        elements.eventText.textContent = `Você entra no pavilhão de tesouros da ${sectData.name}.`;
        elements.choicesContainer.innerHTML = '';

        sectData.store.forEach(item => {
            const itemButton = document.createElement('button');
            itemButton.textContent = `Comprar ${item.name} (${item.cost} contribuição)`;
            itemButton.onclick = () => {
                if (gameState.sect.contribution >= item.cost) {
                    gameState.sect.contribution -= item.cost;
                    applyEffects(item.effects);
                    // Adiciona item ao inventário se for um item físico
                    if (item.type === 'pill' || item.type === 'technique') {
                        gameState.inventory.push(item.name);
                    }
                    elements.eventText.textContent = `Você adquiriu ${item.name}!`;
                    elements.choicesContainer.innerHTML = ''; // Limpa para não poder comprar de novo
                    showSectStore(); // Volta para a loja
                } else {
                    elements.eventText.textContent = "Você não tem pontos de contribuição suficientes.";
                }
                updateUI();
            };
            elements.choicesContainer.appendChild(itemButton);
        });

        const leaveStoreButton = document.createElement('button');
        leaveStoreButton.textContent = "Sair da Loja";
        leaveStoreButton.onclick = showSectActions; // Volta para o menu de ações da seita
        elements.choicesContainer.appendChild(leaveStoreButton);
    }

    /** Mostra as ações disponíveis na seita */
    function showSectActions() {
        elements.eventText.textContent = "Você está no pátio principal da sua seita. O que gostaria de fazer?";
        elements.choicesContainer.innerHTML = '';

        const missionButton = document.createElement('button');
        missionButton.textContent = "Aceitar uma Missão da Seita";
        missionButton.onclick = () => {
            // Lógica da missão a ser implementada
            gameState.sect.contribution += 10;
            elements.eventText.textContent = "Você completou uma missão simples de patrulha e ganhou 10 pontos de contribuição.";
            elements.choicesContainer.innerHTML = '';
            updateUI();
        };
        elements.choicesContainer.appendChild(missionButton);

        const storeButton = document.createElement('button');
        storeButton.textContent = "Visitar a Loja da Seita";
        storeButton.onclick = showSectStore;
        elements.choicesContainer.appendChild(storeButton);

        const leaveButton = document.createElement('button');
        leaveButton.textContent = "Voltar às suas atividades";
        leaveButton.onclick = () => {
            elements.eventText.textContent = "Você volta para seus afazeres, pronto para o próximo ano.";
            elements.choicesContainer.innerHTML = '';
            // Restaurar a visibilidade dos botões de ação
            elements.nextYearBtn.style.display = 'block';
            elements.sectActionsBtn.style.display = 'block';
        };
        elements.choicesContainer.appendChild(leaveButton);

        elements.nextYearBtn.style.display = 'none';
        elements.sectActionsBtn.style.display = 'none';
    }

    /** Atualiza toda a UI com base no gameState atual */
    function updateUI() {
        const currentRealm = cultivationRealms[gameState.cultivation.realmIndex];
        elements.age.textContent = gameState.age;
        elements.attrBody.textContent = gameState.attributes.body;
        elements.attrMind.textContent = gameState.attributes.mind;
        elements.attrSoul.textContent = gameState.attributes.soul;
        elements.attrLuck.textContent = gameState.attributes.luck;
        elements.cultRealm.textContent = currentRealm.name;
        elements.cultQi.textContent = gameState.cultivation.qi;
        elements.cultQiMax.textContent = currentRealm.qiMax;
        elements.resMoney.textContent = `${gameState.resources.money} Moedas de Cobre`;
        elements.resReputation.textContent = gameState.resources.reputation;

        // Atualiza a UI da Seita
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

    /** Helper para atualizar a lista de inventário na UI */
    function updateInventoryList() {
        elements.inventoryList.innerHTML = '';
        if (gameState.inventory.length === 0) {
            elements.inventoryList.innerHTML = '<li>Nenhum</li>';
        } else {
            gameState.inventory.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                elements.inventoryList.appendChild(li);
            });
        }
    }

    /** Helper para atualizar a lista de relacionamentos na UI */
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

    /** Mostra um evento e suas escolhas na UI */
    function showEvent(event) {
        elements.eventText.textContent = event.text;
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

                let resultText = choice.resultText;
                if (choice.effects.special) {
                    resultText = success ? choice.successText : choice.failureText;
                }

                elements.eventText.textContent = resultText;
                elements.choicesContainer.innerHTML = '';
                elements.nextYearBtn.style.display = 'block';
                updateUI();
            };
            elements.choicesContainer.appendChild(button);
        });

        elements.nextYearBtn.style.display = 'none';
    }

    /** Mostra o evento de avanço de reino */
    function triggerBreakthroughEvent() {
        const currentRealmIndex = gameState.cultivation.realmIndex;
        const nextRealm = cultivationRealms[currentRealmIndex + 1];
        if (!nextRealm) {
            elements.eventText.textContent = "Você atingiu o pico do mundo mortal. O caminho à frente está velado em mistério.";
            return;
        }

        elements.eventText.textContent = `Você acumulou Qi suficiente e sentiu um gargalo em seu cultivo. Você pode tentar avançar para o próximo reino: ${nextRealm.name}. O que você faz?`;
        elements.choicesContainer.innerHTML = '';

        const attemptButton = document.createElement('button');
        attemptButton.textContent = "Tentar o avanço agora.";
        attemptButton.onclick = () => {
            // 50% de chance de sucesso baseada na sorte
            const successChance = 0.5 + (gameState.attributes.luck * 0.01);
            if (Math.random() < successChance) {
                gameState.cultivation.realmIndex++;
                gameState.cultivation.qi = 0;
                elements.eventText.textContent = `Parabéns! Após uma meditação perigosa, você rompeu seus limites e avançou para o reino ${nextRealm.name}!`;
            } else {
                gameState.cultivation.qi = Math.floor(gameState.cultivation.qi * 0.8); // Perde 20% do Qi
                elements.eventText.textContent = "A tentativa falhou! Seu Qi se dispersa violentamente e você sofre um revés. Você precisará de mais tempo para se estabilizar.";
            }
            elements.choicesContainer.innerHTML = '';
            elements.nextYearBtn.style.display = 'block';
            updateUI();
        };

        const waitButton = document.createElement('button');
        waitButton.textContent = "Esperar e acumular mais base.";
        waitButton.onclick = () => {
            elements.eventText.textContent = "Você decide esperar, sentindo que uma base mais sólida aumentará suas chances no futuro.";
            elements.choicesContainer.innerHTML = '';
            elements.nextYearBtn.style.display = 'block';
            updateUI();
        };

        elements.choicesContainer.appendChild(attemptButton);
        elements.choicesContainer.appendChild(waitButton);
        elements.nextYearBtn.style.display = 'none';
    }

    /** Ação principal do botão "Avançar Ano" */
    function advanceYear() {
        gameState.age++;
        if (gameState.inventory.includes("Técnica de Respiração Básica")) {
            gameState.cultivation.qi += 10; // Aumentei o ganho para facilitar o teste
        } else {
            gameState.cultivation.qi += 5; // Aumentei o ganho para facilitar o teste
        }

        const currentRealm = cultivationRealms[gameState.cultivation.realmIndex];
        if (gameState.cultivation.qi >= currentRealm.qiMax) {
            gameState.cultivation.qi = currentRealm.qiMax; // Cap de Qi
            triggerBreakthroughEvent();
        } else {
            const eventsForAge = allEvents.filter(event => event.age === gameState.age);
            let currentEvent = eventsForAge.find(event => event.sectId === gameState.sect.id);
            if (!currentEvent) {
                currentEvent = eventsForAge.find(event => !event.sectId);
            }

            if (currentEvent) {
                showEvent(currentEvent);
            } else {
                elements.eventText.textContent = `Você passou um ano tranquilo meditando e treinando. Nada de extraordinário aconteceu.`;
            }
        }
        updateUI();
    }

    // --- INICIALIZAÇÃO DO JOGO ---
    function initializeGame(events, gameData) {
        allEvents = events;
        allGameData = gameData;
        gameState = {
            age: 0,
            attributes: { body: 10, mind: 10, soul: 10, luck: 5 },
            cultivation: { realmIndex: 0, qi: 0 },
            resources: { money: 10, reputation: 0 }, // Reputação como número
            inventory: [],
            relationships: [],
            sect: {
                id: null,
                rankIndex: 0,
                contribution: 0
            }
        };

        elements.nextYearBtn.addEventListener('click', advanceYear);
        elements.sectActionsBtn.addEventListener('click', showSectActions);
        updateUI();
    }

    // As variáveis eventsData e gameData agora estão disponíveis globalmente a partir de index.html
    initializeGame(eventsData, gameData);
});
