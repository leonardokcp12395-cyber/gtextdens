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
        sectActionsBtn: document.getElementById('sect-actions-btn'),
        debugLog: document.getElementById('debug-log')
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
                    gameState.attributes.health -= 5; // Dano de saúde na falha
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

    /** Mostra a tela de morte */
    function showDeathScreen() {
        // Lógica do Sistema de Legado v1
        if (gameState.cultivation.realmIndex >= 2) { // A partir de Estabelecimento de Fundação
            const legacyBonus = { attribute: 'luck', value: 1 };
            localStorage.setItem('wuxiaLegacy', JSON.stringify(legacyBonus));
        }

        const finalRealm = cultivationRealms[gameState.cultivation.realmIndex].name;
        const summaryHTML = `
            <h2>Fim da Jornada</h2>
            <p>Você viveu até os <strong>${gameState.age}</strong> anos.</p>
            <p>Seu cultivo alcançou o reino de <strong>${finalRealm}</strong>.</p>
            <p>Sua reputação final foi de <strong>${gameState.resources.reputation}</strong>.</p>
            <p>Você terminou sua jornada com <strong>${gameState.inventory.length}</strong> itens em sua posse.</p>
            <hr>
            <p>O Dao é eterno, e o ciclo recomeça. Uma nova vida o aguarda.</p>
        `;
        elements.eventContent.innerHTML = summaryHTML;

        elements.choicesContainer.innerHTML = '';
        const restartButton = document.createElement('button');
        restartButton.textContent = "Começar Nova Vida";
        restartButton.onclick = () => {
            location.reload();
        };
        elements.choicesContainer.appendChild(restartButton);

        elements.nextYearBtn.style.display = 'none';
        elements.sectActionsBtn.style.display = 'none';
    }

    /** Mostra a loja da seita */
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
                    // Adiciona item ao inventário se for um item físico
                    if (item.type === 'pill' || item.type === 'technique') {
                        gameState.inventory.push(item.id); // Armazena o ID, não o nome
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

        // Lógica do botão de Promoção
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

    /** Lida com a lógica de aceitar e processar uma missão da seita */
    function acceptSectMission() {
        const sectData = allGameData.sects.find(s => s.id === gameState.sect.id);
        if (!sectData || !sectData.missions || sectData.missions.length === 0) {
            elements.eventContent.innerHTML = "<p>Não há missões disponíveis no momento.</p>";
            return;
        }

        // Seleciona uma missão aleatória
        const mission = sectData.missions[Math.floor(Math.random() * sectData.missions.length)];

        elements.eventContent.innerHTML = `<p><strong>Nova Missão: ${mission.name}</strong></p><p>${mission.description}</p>`;
        elements.choicesContainer.innerHTML = '';

        const attemptButton = document.createElement('button');
        attemptButton.textContent = "Tentar a Missão";
        attemptButton.onclick = () => {
            // Lógica de sucesso da missão
            const playerStat = gameState.attributes[mission.check.attribute];
            const successChance = 0.5 + ((playerStat - mission.check.difficulty) * 0.05); // 5% de chance por ponto acima/abaixo

            if (Math.random() < successChance) {
                // Sucesso
                const successRewards = mission.rewards.success;
                gameState.sect.contribution += successRewards.contribution || 0;
                if (successRewards.reputation) gameState.resources.reputation += successRewards.reputation;
                if (successRewards.mind) gameState.attributes.mind += successRewards.mind;
                if (successRewards.item) {
                    gameState.inventory.push(successRewards.item);
                }
                elements.eventContent.innerHTML = `<p>Sucesso! Você completou a missão '${mission.name}' e ganhou ${successRewards.contribution || 0} de contribuição.</p>`;
            } else {
                // Falha
                const failureRewards = mission.rewards.failure;
                if (failureRewards.health) gameState.attributes.health += failureRewards.health;
                elements.eventContent.innerHTML = `<p>Falha! Você não conseguiu completar a missão '${mission.name}'.</p>`;
            }

            elements.choicesContainer.innerHTML = '';
            // Verificar morte após a falha
            if (gameState.attributes.health <= 0) {
                showDeathScreen();
            } else {
                updateUI();
            }
        };
        elements.choicesContainer.appendChild(attemptButton);

        const refuseButton = document.createElement('button');
        refuseButton.textContent = "Recusar Missão";
        refuseButton.onclick = showSectActions; // Volta para o menu de ações
        elements.choicesContainer.appendChild(refuseButton);
    }

    /** Atualiza toda a UI com base no gameState atual */
    function updateUI() {
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

        // Criar uma lista plana de todos os itens da loja e itens únicos para fácil consulta
        const allStoreItems = allGameData.sects.flatMap(sect => sect.store || []);
        const allItems = [...allStoreItems, ...(allGameData.items || [])];

        if (gameState.inventory.length === 0) {
            elements.inventoryList.innerHTML = '<li>Nenhum</li>';
            return;
        }

        gameState.inventory.forEach((itemId, index) => {
            const itemData = allItems.find(i => i.id === itemId);

            elements.debugLog.innerHTML += `Searching for ${itemId}. Found: ${!!itemData}<br>`;

            if (!itemData) return;

            const li = document.createElement('li');

            if (itemData.type === 'pill') {
                const useButton = document.createElement('button');
                useButton.textContent = `Usar ${itemData.name}`;
                useButton.onclick = () => {
                    applyEffects(itemData.effects);
                    gameState.inventory.splice(index, 1); // Remove o item pelo índice
                    updateUI(); // Atualiza toda a UI
                };
                li.appendChild(useButton);
            } else {
                li.textContent = itemData.name; // Para itens não-consumíveis como técnicas
            }
            elements.inventoryList.appendChild(li);
        });
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

                let resultText = choice.resultText;
                if (choice.effects.special) {
                    resultText = success ? choice.successText : choice.failureText;
                }

                elements.eventContent.innerHTML = `<p>${resultText}</p>`;
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

    /** Mostra o evento de avanço de reino */
    function triggerBreakthroughEvent() {
        const currentRealmIndex = gameState.cultivation.realmIndex;
        const nextRealm = cultivationRealms[currentRealmIndex + 1];
        if (!nextRealm) {
            elements.eventContent.innerHTML = "<p>Você atingiu o pico do mundo mortal. O caminho à frente está velado em mistério.</p>";
            return;
        }

        elements.eventContent.innerHTML = `<p>Você acumulou Qi suficiente e sentiu um gargalo em seu cultivo. Você pode tentar avançar para o próximo reino: ${nextRealm.name}. O que você faz?</p>`;
        elements.choicesContainer.innerHTML = '';

        const attemptButton = document.createElement('button');
        attemptButton.textContent = "Tentar o avanço agora.";
        attemptButton.onclick = () => {
            // 50% de chance de sucesso baseada na sorte
            const successChance = 0.5 + (gameState.attributes.luck * 0.01);
            if (Math.random() < successChance) {
                gameState.cultivation.realmIndex++;
                gameState.cultivation.qi = 0;
                elements.eventContent.innerHTML = `<p>Parabéns! Após uma meditação perigosa, você rompeu seus limites e avançou para o reino ${nextRealm.name}!</p>`;
            } else {
                gameState.cultivation.qi = Math.floor(gameState.cultivation.qi * 0.8); // Perde 20% do Qi
                elements.eventContent.innerHTML = "<p>A tentativa falhou! Seu Qi se dispersa violentamente e você sofre um revés. Você precisará de mais tempo para se estabilizar.</p>";
            }
            elements.choicesContainer.innerHTML = '';
            if (gameState.attributes.health <= 0) {
                showDeathScreen();
            } else {
                elements.nextYearBtn.style.display = 'block';
                updateUI();
            }
        };

        const waitButton = document.createElement('button');
        waitButton.textContent = "Esperar e acumular mais base.";
        waitButton.onclick = () => {
            elements.eventContent.innerHTML = "<p>Você decide esperar, sentindo que uma base mais sólida aumentará suas chances no futuro.</p>";
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

        // Lógica de envelhecimento e morte por idade
        if (gameState.age > 50) {
            gameState.attributes.health--;
        }
        if (gameState.attributes.health <= 0) {
            showDeathScreen();
            return;
        }

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
                elements.eventContent.innerHTML = `<p>Você passou um ano tranquilo meditando e treinando. Nada de extraordinário aconteceu.</p>`;
            }
        }

        // A verificação de morte foi movida para os manipuladores de onclick
        updateUI();
    }

    // --- INICIALIZAÇÃO DO JOGO ---
    function initializeGame(gameData) {
        allEvents = gameData.events;
        allGameData = gameData;
        gameState = {
            age: 0,
            attributes: { health: 100, maxHealth: 100, body: 10, mind: 10, soul: 10, luck: 5 },
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

        // Lógica para carregar o Legado
        const legacyData = localStorage.getItem('wuxiaLegacy');
        if (legacyData) {
            try {
                const legacyBonus = JSON.parse(legacyData);
                if (legacyBonus && legacyBonus.attribute && legacyBonus.value) {
                    gameState.attributes[legacyBonus.attribute] += legacyBonus.value;

                    const originalEventHTML = elements.eventContent.innerHTML;
                    elements.eventContent.innerHTML = `<p>Você sente a bênção de um ancestral. (+${legacyBonus.value} ${legacyBonus.attribute})</p>` + originalEventHTML;

                    localStorage.removeItem('wuxiaLegacy');
                }
            } catch (e) {
                console.error("Erro ao processar o legado:", e);
                localStorage.removeItem('wuxiaLegacy'); // Limpa o legado corrompido
            }
        }

        elements.nextYearBtn.addEventListener('click', advanceYear);
        elements.sectActionsBtn.addEventListener('click', showSectActions);
        updateUI();
    }

    // A variável wuxiaGameData agora está disponível globalmente a partir de index.html
    initializeGame(wuxiaGameData);
});
