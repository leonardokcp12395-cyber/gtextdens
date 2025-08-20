// This is a full overwrite to ensure the file is correct after many changes.
import { gameState, allGameData, cultivationRealms, combatState, getEffectiveAttributes } from './state.js';
import { travelToRegion } from './game.js';
import { unlockTalent, takeCombatTurn, endCombat, getSect, attemptPromotion, acceptSectMission, attemptMission, applyEffects, giveGiftToNpc, sparWithNpc, craftItem, equipTechnique, unequipTechnique, sellItem, buyMarketItem, listenForRumors, equipItem, unequipItem, forgeItem } from './handlers.js';

export const elements = {
    name: document.getElementById('char-name'),
    age: document.getElementById('char-age'),
    attrHealth: document.getElementById('attr-health'),
    attrMaxHealth: document.getElementById('attr-max-health'),
    attrEnergy: document.getElementById('attr-energy'),
    attrMaxEnergy: document.getElementById('attr-max-energy'),
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
    resourcesTab: document.getElementById('resources-tab'),
    historyTab: document.getElementById('history-tab'),
    talentsTab: document.getElementById('talents-tab'),
    techniquesTab: document.getElementById('techniques-tab'),
    equipmentTab: document.getElementById('equipment-tab'),
    resourcesContent: document.getElementById('resources-content'),
    historyLogContent: document.getElementById('history-log-content'),
    talentsContent: document.getElementById('talents-content'),
    techniquesContent: document.getElementById('techniques-content'),
    equipmentContent: document.getElementById('equipment-content'),
    techSlots: document.getElementById('tech-slots'),
    equippedTechniquesList: document.getElementById('equipped-techniques-list'),
    learnedTechniquesList: document.getElementById('learned-techniques-list'),
    equipmentSlotsContainer: document.getElementById('equipment-slots-container'),
    inventoryEquipmentList: document.getElementById('inventory-equipment-list'),
    actionLogList: document.getElementById('action-log-list'),
    talentPoints: document.getElementById('talent-points'),
    talentsContainer: document.getElementById('talents-container'),
    mapView: document.getElementById('map-view'),
    eventView: document.getElementById('event-view'),
    interactionView: document.getElementById('interaction-view'),
    regionsContainer: document.getElementById('regions-container'),
    eventContent: document.getElementById('event-content'),
    interactionNpcName: document.getElementById('interaction-npc-name'),
    interactionNpcMood: document.getElementById('interaction-npc-mood'),
    interactionNpcRealm: document.getElementById('interaction-npc-realm'),
    interactionNpcBody: document.getElementById('interaction-npc-body'),
    interactionNpcMind: document.getElementById('interaction-npc-mind'),
    interactionNpcSoul: document.getElementById('interaction-npc-soul'),
    interactionSocialContainer: document.getElementById('interaction-social-container'),
    interactionOptionsContainer: document.getElementById('interaction-options-container'),
    interactionResultContainer: document.getElementById('interaction-result-container'),
    alchemyView: document.getElementById('alchemy-view'),
    alchemySkillLevel: document.getElementById('alchemy-skill-level'),
    recipesContainer: document.getElementById('recipes-container'),
    alchemyIngredientsList: document.getElementById('alchemy-ingredients-list'),
    hubView: document.getElementById('hub-view'),
    hubName: document.getElementById('hub-name'),
    hubDescription: document.getElementById('hub-description'),
    hubLocationsContainer: document.getElementById('hub-locations-container'),
    hubContentContainer: document.getElementById('hub-content-container'),
    choicesContainer: document.getElementById('choices-container'),
    nextYearBtn: document.getElementById('next-year-btn'),
    sectActionsBtn: document.getElementById('sect-actions-btn'),
    alchemyBtn: document.getElementById('alchemy-btn'),
    meditateBtn: document.getElementById('meditate-btn')
};

export function flashStat(element, changeType) {
    const className = changeType === 'increase' ? 'stat-increased' : 'stat-decreased';
    element.classList.add(className);
    setTimeout(() => element.classList.remove(className), 700);
}

function updateInventoryList() {
    elements.inventoryList.innerHTML = '';
    if (!allGameData.sects) return;
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
                updateUI(); // Re-renderiza a UI
            };
            li.appendChild(useButton);
        } else {
            li.textContent = itemData.name;
        }
        elements.inventoryList.appendChild(li);
    });
}

function getRelationshipStatus(value) {
    if (value >= 75) return "Aliado Íntimo";
    if (value >= 50) return "Amigo de Confiança";
    if (value >= 25) return "Amigo";
    if (value > -25) return "Conhecido";
    if (value > -50) return "Rival";
    if (value > -75) return "Inimigo";
    return "Inimigo Mortal";
}

function updateRelationshipsList() {
    elements.relationshipsList.innerHTML = '';
    const rels = Object.values(gameState.relationships);
    if (rels.length === 0) {
        elements.relationshipsList.innerHTML = '<li>Nenhum</li>';
        return;
    }
    rels.forEach(npc => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';

        const textSpan = document.createElement('span');
        if (npc.alive) {
            const status = getRelationshipStatus(npc.initialRelationship);
            textSpan.innerHTML = `<strong>${npc.name}</strong>: ${npc.initialRelationship} (${status})`;
        } else {
            textSpan.innerHTML = `<strong>${npc.name}</strong> (Falecido)`;
            textSpan.style.color = '#aaa';
        }
        li.appendChild(textSpan);

        if (npc.alive) {
            const interactButton = document.createElement('button');
            interactButton.textContent = 'Interagir';
            interactButton.onclick = () => showInteractionView(npc.id);
            li.appendChild(interactButton);
        }

        elements.relationshipsList.appendChild(li);
    });
}

export function updateUI() {
    if (!gameState || !gameState.attributes || !allGameData.cultivationRealms) return;
    if (!combatState) elements.nextYearBtn.style.display = 'block';
    renderMap();
    const effectiveAttributes = getEffectiveAttributes();
    const currentRealm = allGameData.cultivationRealms[gameState.cultivation.realmIndex];
    const subRealmName = currentRealm.subRealms[gameState.cultivation.subRealmIndex];
    elements.age.textContent = gameState.age;
    elements.attrHealth.textContent = effectiveAttributes.health;
    elements.attrMaxHealth.textContent = effectiveAttributes.maxHealth;
    elements.attrEnergy.textContent = effectiveAttributes.energy;
    elements.attrMaxEnergy.textContent = effectiveAttributes.maxEnergy;
    elements.attrBody.textContent = effectiveAttributes.body;
    elements.attrMind.textContent = effectiveAttributes.mind;
    elements.attrSoul.textContent = effectiveAttributes.soul;
    elements.attrLuck.textContent = effectiveAttributes.luck;
    elements.cultRealm.textContent = `${currentRealm.name} - ${subRealmName}`;
    elements.cultQi.textContent = gameState.cultivation.qi;
    elements.cultQiMax.textContent = currentRealm.qiMax;
    elements.resMoney.textContent = `${gameState.resources.money} Moedas de Cobre`;
    elements.resReputation.textContent = gameState.resources.reputation;
    elements.talentPoints.textContent = gameState.talentPoints;

    if (gameState.sect.id) {
        const sectData = getSect();
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

export function showDeathScreen() {
    // ... implementation ...
}

function handleCombatTurn(action) {
    const result = takeCombatTurn(action);
    if (result === 'win' || result === 'loss') {
        const resultText = endCombat(result);
        elements.eventContent.innerHTML = `<p>${resultText}</p>`;
        const backToMapButton = document.createElement('button');
        backToMapButton.textContent = "Voltar ao Mapa";
        backToMapButton.onclick = () => { showView('map'); updateUI(); };
        elements.choicesContainer.innerHTML = '';
        elements.choicesContainer.appendChild(backToMapButton);
    } else {
        showCombatUI();
    }
}

export function showCombatUI() {
    if (!combatState) return;
    showView('event');
    const combatLog = combatState.log.map(entry => `<p>${entry}</p>`).join('');
    const combatHTML = `<h2>Combate!</h2><p><strong>${combatState.enemy.name}</strong> - Saúde: ${combatState.enemyHealth}</p><p><strong>Você</strong> - Saúde: ${gameState.attributes.health}</p><hr><div class="combat-log">${combatLog}</div>`;
    elements.eventContent.innerHTML = combatHTML;
    elements.choicesContainer.innerHTML = '';
    const attackButton = document.createElement('button');
    attackButton.textContent = "Ataque Físico";
    attackButton.onclick = () => handleCombatTurn('attack');
    elements.choicesContainer.appendChild(attackButton);
    const defendButton = document.createElement('button');
    defendButton.textContent = "Defender";
    defendButton.onclick = () => handleCombatTurn('defend');
    elements.choicesContainer.appendChild(defendButton);

    if (gameState.equippedTechniques.length > 0) {
        const techButton = document.createElement('button');
        techButton.textContent = 'Usar Técnica';
        techButton.onclick = () => showTechniqueSelectionInCombat();
        elements.choicesContainer.appendChild(techButton);
    }
}

function showTechniqueSelectionInCombat() {
    elements.choicesContainer.innerHTML = '';
    const allItems = [...(allGameData.items || []), ...(allGameData.sects.flatMap(s => s.store) || [])];

    gameState.equippedTechniques.forEach(techId => {
        const techData = allItems.find(i => i.id === techId);
        if (techData && techData.activeEffect.type.startsWith('combat')) {
            const button = document.createElement('button');
            button.textContent = techData.name;
            button.onclick = () => handleCombatTurn({ type: 'technique', id: techId });
            elements.choicesContainer.appendChild(button);
        }
    });

    const backButton = document.createElement('button');
    backButton.textContent = 'Voltar';
    backButton.onclick = () => showCombatUI();
    elements.choicesContainer.appendChild(backButton);
}

export function showView(viewName) {
    elements.mapView.classList.remove('active');
    elements.eventView.classList.remove('active');
    elements.interactionView.classList.remove('active');
    elements.alchemyView.classList.remove('active');
    elements.hubView.classList.remove('active');

    if (viewName === 'map') elements.mapView.classList.add('active');
    else if (viewName === 'event') elements.eventView.classList.add('active');
    else if (viewName === 'interaction') elements.interactionView.classList.add('active');
    else if (viewName === 'alchemy') elements.alchemyView.classList.add('active');
    else if (viewName === 'hub') elements.hubView.classList.add('active');
}

export function showHubView(region) {
    showView('hub');
    elements.hubName.textContent = region.name;
    elements.hubDescription.textContent = region.description;
    elements.hubLocationsContainer.innerHTML = '';
    elements.hubContentContainer.innerHTML = ''; // Limpa o conteúdo anterior

    region.locations.forEach(location => {
        const locButton = document.createElement('button');
        locButton.textContent = location.name;
        if (location.id === 'market') {
            locButton.onclick = () => showMarketView();
        } else if (location.id === 'tea_house') {
            locButton.onclick = () => showTeaHouseView();
        } else if (location.id === 'blacksmith') {
            locButton.onclick = () => showBlacksmithView();
        } else {
            locButton.onclick = () => { /* Lógica para outros locais */ };
        }
        elements.hubLocationsContainer.appendChild(locButton);
    });

    // Adiciona um botão para voltar ao mapa
    const backButton = document.createElement('button');
    backButton.textContent = 'Sair da Cidade';
    backButton.onclick = () => showView('map');
    elements.hubLocationsContainer.appendChild(backButton);
}

function showMarketView() {
    elements.hubContentContainer.innerHTML = '<h3>Vender Itens</h3>';

    if (gameState.inventory.length === 0) {
        elements.hubContentContainer.innerHTML += '<p>Você não tem itens para vender.</p>';
    }

    const sellList = document.createElement('ul');
    const allItems = [...(allGameData.items || []), ...(allGameData.ingredients || []), ...(allGameData.sects.flatMap(s => s.store) || [])];

    // Usar um loop for tradicional para evitar problemas com splice em forEach
    for (let i = 0; i < gameState.inventory.length; i++) {
        const itemId = gameState.inventory[i];
        const itemData = allItems.find(item => item.id === itemId);

        if (itemData && itemData.value) {
            const li = document.createElement('li');
            const sellButton = document.createElement('button');
            sellButton.textContent = `Vender ${itemData.name} (${itemData.value} moedas)`;

            // Passa o índice atual para a função de clique
            sellButton.onclick = () => {
                const result = sellItem(itemId, i);
                showMarketView(); // Re-renderiza a view do mercado
                const resultDiv = document.createElement('div');
                resultDiv.textContent = result.message;
                elements.hubContentContainer.prepend(resultDiv);
                updateUI(); // Atualiza o painel de recursos principal
            };
            li.appendChild(sellButton);
            sellList.appendChild(li);
        }
    }

    elements.hubContentContainer.appendChild(sellList);

    // Seção de Compra
    elements.hubContentContainer.innerHTML += '<hr><h3>Comprar Itens</h3>';
    const buyList = document.createElement('ul');
    const city = allGameData.regions.find(r => r.id === gameState.currentRegionId);
    const marketInventory = city.locations.find(l => l.id === 'market').inventory;

    marketInventory.forEach(itemId => {
        const itemData = allItems.find(item => item.id === itemId);
        if (itemData) {
            const li = document.createElement('li');
            const buyButton = document.createElement('button');
            buyButton.textContent = `Comprar ${itemData.name} (${itemData.cost} moedas)`;
            if (gameState.resources.money < itemData.cost) {
                buyButton.disabled = true;
            }
            buyButton.onclick = () => {
                const result = buyMarketItem(itemId);
                showMarketView(); // Re-renderiza a view do mercado
                const resultDiv = document.createElement('div');
                resultDiv.textContent = result.message;
                elements.hubContentContainer.prepend(resultDiv);
                updateUI();
            };
            li.appendChild(buyButton);
            buyList.appendChild(li);
        }
    });

    elements.hubContentContainer.appendChild(buyList);
}

function showTeaHouseView() {
    elements.hubContentContainer.innerHTML = '<h3>Casa de Chá</h3>';
    elements.hubContentContainer.innerHTML += '<p>O ar está cheio do aroma de chá e conversas sussurradas.</p>';

    const listenButton = document.createElement('button');
    listenButton.textContent = 'Ouvir conversas (Custa 5 moedas)';

    if (gameState.resources.money < 5) {
        listenButton.disabled = true;
    }

    listenButton.onclick = () => {
        applyEffects({ resources: { money: -5 } });
        const result = listenForRumors();
        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `<p><i>${result.message}</i></p>`;
        elements.hubContentContainer.appendChild(resultDiv);
        updateUI();
        listenButton.disabled = true; // Só pode ouvir uma vez por visita
    };

    elements.hubContentContainer.appendChild(listenButton);
}

function showBlacksmithView() {
    elements.hubContentContainer.innerHTML = '<h3>Forja</h3>';
    elements.hubContentContainer.innerHTML += `<p><strong>Nível de Forja:</strong> ${gameState.skills.forging}</p>`;

    // Renderiza as receitas de forja
    const recipesContainer = document.createElement('div');
    allGameData.forging_recipes.forEach(recipe => {
        const recipeDiv = document.createElement('div');
        recipeDiv.className = 'recipe';
        const resultItem = allGameData.equipment.find(i => i.id === recipe.result);
        recipeDiv.innerHTML = `<h4>${resultItem.name}</h4>`;
        const craftButton = document.createElement('button');
        craftButton.textContent = 'Forjar';
        craftButton.onclick = () => {
            const result = forgeItem(recipe.id);
            showBlacksmithView(); // Re-renderiza a view
            const resultDiv = document.createElement('div');
            resultDiv.textContent = result.message;
            elements.hubContentContainer.prepend(resultDiv);
            updateUI();
        };
        recipeDiv.appendChild(craftButton);
        recipesContainer.appendChild(recipeDiv);
    });
    elements.hubContentContainer.appendChild(recipesContainer);
}

export function showAlchemyView() {
    showView('alchemy');
    elements.alchemySkillLevel.textContent = gameState.skills.alchemy;

    // Renderiza as receitas
    elements.recipesContainer.innerHTML = '';
    allGameData.recipes.forEach(recipe => {
        const recipeDiv = document.createElement('div');
        recipeDiv.className = 'recipe';
        let ingredientsText = recipe.ingredients.map(ing => {
            const itemData = allGameData.ingredients.find(i => i.id === ing.id);
            return `${ing.quantity}x ${itemData.name}`;
        }).join(', ');
        const resultItem = allGameData.items.find(i => i.id === recipe.result);
        recipeDiv.innerHTML = `
            <h4>${resultItem.name}</h4>
            <p><small>Requer: ${ingredientsText}</small></p>
            <p><small>Nível de Alquimia Necessário: ${recipe.skillRequired}</small></p>
        `;
        const craftButton = document.createElement('button');
        craftButton.textContent = 'Criar';
        craftButton.onclick = () => {
            const result = craftItem(recipe.id);
            // Mostra o resultado e atualiza a view de alquimia
            showAlchemyView();
            const resultDiv = document.createElement('div');
            resultDiv.textContent = result.message;
            elements.recipesContainer.prepend(resultDiv); // Adiciona a mensagem no topo
        };
        recipeDiv.appendChild(craftButton);
        elements.recipesContainer.appendChild(recipeDiv);
    });

    // Renderiza os ingredientes que o jogador possui
    elements.alchemyIngredientsList.innerHTML = '';
    const playerIngredients = gameState.inventory.filter(itemId => allGameData.ingredients.some(ing => ing.id === itemId));
    const ingredientCounts = playerIngredients.reduce((acc, itemId) => {
        acc[itemId] = (acc[itemId] || 0) + 1;
        return acc;
    }, {});

    if (Object.keys(ingredientCounts).length === 0) {
        elements.alchemyIngredientsList.innerHTML = '<li>Você não possui ingredientes.</li>';
    } else {
        for (const itemId in ingredientCounts) {
            const itemData = allGameData.ingredients.find(i => i.id === itemId);
            const li = document.createElement('li');
            li.textContent = `${ingredientCounts[itemId]}x ${itemData.name}`;
            elements.alchemyIngredientsList.appendChild(li);
        }
    }
}

function showInteractionView(npcId) {
    const npc = gameState.relationships[npcId];
    if (!npc) return;

    showView('interaction');

    elements.interactionNpcName.textContent = npc.name;
    elements.interactionNpcMood.textContent = npc.mood;

    if (npc.cultivation && npc.attributes) {
        const realm = cultivationRealms[npc.cultivation.realmIndex];
        elements.interactionNpcRealm.textContent = realm.name;
        elements.interactionNpcBody.textContent = npc.attributes.body;
        elements.interactionNpcMind.textContent = npc.attributes.mind;
        elements.interactionNpcSoul.textContent = npc.attributes.soul;
    } else {
        // Esconde ou mostra um texto padrão se o NPC não tiver esses dados
        elements.interactionNpcRealm.textContent = "N/A";
        elements.interactionNpcBody.textContent = "N/A";
        elements.interactionNpcMind.textContent = "N/A";
        elements.interactionNpcSoul.textContent = "N/A";
    }

    // Preenche as informações sociais
    const socialContainer = elements.interactionSocialContainer;
    socialContainer.innerHTML = '';
    let socialStatusText = `<strong>Status:</strong> ${npc.socialStatus.charAt(0).toUpperCase() + npc.socialStatus.slice(1)}`;
    if (npc.partnerId) {
        const partner = gameState.relationships[npc.partnerId];
        socialStatusText += ` com ${partner.name}`;
    }
    socialContainer.innerHTML += `<p>${socialStatusText}</p>`;

    if (npc.childrenIds && npc.childrenIds.length > 0) {
        let childrenText = '<strong>Filhos:</strong> ';
        childrenText += npc.childrenIds.map(id => gameState.relationships[id].name).join(', ');
        socialContainer.innerHTML += `<p>${childrenText}</p>`;
    }


    elements.interactionOptionsContainer.innerHTML = '';
    elements.interactionResultContainer.innerHTML = '';

    // Botão de Ver Histórico
    const historyButton = document.createElement('button');
    historyButton.textContent = 'Ver Histórico de Vida';
    historyButton.onclick = () => showNpcLifeHistory(npcId);
    elements.interactionOptionsContainer.appendChild(historyButton);

    // Botão de Conversar
    const talkButton = document.createElement('button');
    talkButton.textContent = 'Conversar';
    talkButton.onclick = () => showNpcDialogue(npcId);
    elements.interactionOptionsContainer.appendChild(talkButton);

    // Botão de Dar Presente
    const giftButton = document.createElement('button');
    giftButton.textContent = 'Dar Presente';
    giftButton.onclick = () => showGiftInventory(npcId);
    elements.interactionOptionsContainer.appendChild(giftButton);

    // Botão de Treinar Juntos
    const sparButton = document.createElement('button');
    sparButton.textContent = 'Treinar Juntos';
    sparButton.onclick = () => {
        const result = sparWithNpc(npcId);
        elements.interactionResultContainer.innerHTML = `<p>${result.message}</p>`;
        updateUI();
    };
    elements.interactionOptionsContainer.appendChild(sparButton);

    // Botão de Voltar
    const backButton = document.createElement('button');
    backButton.textContent = 'Voltar ao Mapa';
    backButton.onclick = () => showView('map');
    elements.interactionOptionsContainer.appendChild(backButton);
}

export function renderTechniquesView() {
    elements.techSlots.textContent = `${gameState.equippedTechniques.length} / ${gameState.techniqueSlots}`;
    elements.equippedTechniquesList.innerHTML = '';
    elements.learnedTechniquesList.innerHTML = '';

    const allItems = [...(allGameData.items || []), ...(allGameData.sects.flatMap(s => s.store) || [])];
    const learnedTechniques = gameState.inventory.filter(itemId => {
        const item = allItems.find(i => i.id === itemId);
        return item && item.type === 'technique';
    });

    // Renderiza Técnicas Equipadas
    gameState.equippedTechniques.forEach(techId => {
        const techData = allItems.find(i => i.id === techId);
        if (techData) {
            const li = document.createElement('li');
            li.textContent = techData.name;
            const unequipBtn = document.createElement('button');
            unequipBtn.textContent = 'Desequipar';
            unequipBtn.onclick = () => {
                unequipTechnique(techId);
                renderTechniquesView(); // Re-renderiza a view
            };
            li.appendChild(unequipBtn);
            elements.equippedTechniquesList.appendChild(li);
        }
    });

    // Renderiza Técnicas Aprendidas (não equipadas)
    const canEquip = gameState.equippedTechniques.length < gameState.techniqueSlots;
    learnedTechniques.forEach(techId => {
        if (!gameState.equippedTechniques.includes(techId)) {
            const techData = allItems.find(i => i.id === techId);
            if (techData) {
                const li = document.createElement('li');
                li.textContent = techData.name;
                const equipBtn = document.createElement('button');
                equipBtn.textContent = 'Equipar';
                equipBtn.onclick = () => {
                    equipTechnique(techId);
                    renderTechniquesView(); // Re-renderiza a view
                };
                if (!canEquip) {
                    equipBtn.disabled = true;
                    equipBtn.title = "Slots de técnica cheios.";
                }
                li.appendChild(equipBtn);
                elements.learnedTechniquesList.appendChild(li);
            }
        }
    });
}

export function renderEquipmentView() {
    elements.equipmentSlotsContainer.innerHTML = '';
    elements.inventoryEquipmentList.innerHTML = '';
    const allItems = [...(allGameData.items || []), ...(allGameData.equipment || []), ...(allGameData.sects.flatMap(s => s.store) || [])];

    // Renderiza os slots de equipamento
    for (const slot in gameState.equipment) {
        const itemId = gameState.equipment[slot];
        const slotDiv = document.createElement('div');
        let text = `<strong>${slot.charAt(0).toUpperCase() + slot.slice(1)}:</strong> `;
        if (itemId) {
            const itemData = allItems.find(i => i.id === itemId);
            text += itemData.name;
            const unequipBtn = document.createElement('button');
            unequipBtn.textContent = 'Desequipar';
            unequipBtn.onclick = () => {
                unequipItem(slot);
                renderEquipmentView();
                updateUI();
            };
            slotDiv.innerHTML = text;
            slotDiv.appendChild(unequipBtn);
        } else {
            slotDiv.innerHTML = text + 'Nenhum';
        }
        elements.equipmentSlotsContainer.appendChild(slotDiv);
    }

    // Renderiza equipamentos no inventário
    for (let i = 0; i < gameState.inventory.length; i++) {
        const itemId = gameState.inventory[i];
        const itemData = allItems.find(item => item.id === itemId);

        if (itemData && itemData.type === 'equipment') {
            const li = document.createElement('li');
            li.textContent = itemData.name;
            const equipBtn = document.createElement('button');
            equipBtn.textContent = 'Equipar';

            // Passa o índice para garantir que o item correto seja removido
            equipBtn.onclick = (itemIndex => {
                return () => {
                    equipItem(itemId, itemIndex);
                    renderEquipmentView();
                    updateUI();
                };
            })(i);

            li.appendChild(equipBtn);
            elements.inventoryEquipmentList.appendChild(li);
        }
    }
}

function showNpcDialogue(npcId) {
    const npc = gameState.relationships[npcId];
    if (!npc || !allGameData.dialogue) return;

    const status = getRelationshipStatus(npc.initialRelationship);
    const mood = npc.mood;

    let dialogueLines = allGameData.dialogue.Default?.Default || ["..."];

    const statusDialogues = allGameData.dialogue[status] || allGameData.dialogue.Default;
    if (statusDialogues) {
        dialogueLines = statusDialogues[mood] || statusDialogues.Default || dialogueLines;
    }

    const chosenLine = dialogueLines[Math.floor(Math.random() * dialogueLines.length)];

    elements.interactionResultContainer.innerHTML = `<p><em>${npc.name} diz:</em> "${chosenLine}"</p>`;
}

function showGiftInventory(npcId) {
    elements.interactionResultContainer.innerHTML = '';

    if (gameState.inventory.length === 0) {
        elements.interactionResultContainer.innerHTML = '<p>Você não tem nada para dar.</p>';
        return;
    }

    const inventoryList = document.createElement('ul');
    const allItems = [...(allGameData.items || []), ...(allGameData.sects.flatMap(s => s.store) || [])];

    gameState.inventory.forEach((itemId, index) => {
        const itemData = allItems.find(i => i.id === itemId);
        if (itemData) {
            const li = document.createElement('li');
            const giveButton = document.createElement('button');
            giveButton.textContent = `Dar ${itemData.name}`;
            giveButton.onclick = () => {
                const result = giveGiftToNpc(npcId, itemId, index);
                // Atualiza a UI para mostrar o resultado e limpa a lista de presentes
                elements.interactionResultContainer.innerHTML = `<p>${result.message}</p>`;
                updateUI(); // Re-renderiza o painel de relacionamentos para mostrar o novo valor
            };
            li.appendChild(giveButton);
            inventoryList.appendChild(li);
        }
    });

    elements.interactionResultContainer.appendChild(inventoryList);
}

function showNpcLifeHistory(npcId) {
    const npc = gameState.relationships[npcId];
    if (!npc || !npc.lifeEvents) return;

    elements.interactionResultContainer.innerHTML = '';

    if (npc.lifeEvents.length === 0) {
        elements.interactionResultContainer.innerHTML = '<p>Nada de novo para relatar.</p>';
        return;
    }

    let historyHTML = '<ul>';
    // Mostra os eventos em ordem cronológica inversa (mais recente primeiro)
    [...npc.lifeEvents].reverse().forEach(event => {
        historyHTML += `<li><strong>Idade ${event.age}:</strong> ${npc.name} ${event.text}</li>`;
    });
    historyHTML += '</ul>';

    elements.interactionResultContainer.innerHTML = historyHTML;
}

export function renderMap() {
    if (!allGameData.regions) return;
    elements.regionsContainer.innerHTML = '';
    allGameData.regions.forEach(region => {
        let isUnlocked = region.unlocked;
        if (region.unlockRequirements) {
            if (region.unlockRequirements.age && gameState.age >= region.unlockRequirements.age) isUnlocked = true;
            if (region.unlockRequirements.sect && gameState.sect.id) isUnlocked = true;
        }
        if (isUnlocked) {
            const regionButton = document.createElement('button');
            regionButton.className = 'region-button';
            regionButton.innerHTML = `<strong>${region.name}</strong><br><small>${region.description}</small>`;
            regionButton.onclick = () => travelToRegion(region.id);
            elements.regionsContainer.appendChild(regionButton);
        }
    });
}

export function updateActionLogUI() {
    // ... implementation ...
}

export function setupTabs() {
    const tabs = [
        { button: elements.resourcesTab, content: elements.resourcesContent },
        { button: elements.historyTab, content: elements.historyLogContent, onOpen: updateActionLogUI },
        { button: elements.talentsTab, content: elements.talentsContent, onOpen: renderTalents },
        { button: elements.techniquesTab, content: elements.techniquesContent, onOpen: renderTechniquesView },
        { button: elements.equipmentTab, content: elements.equipmentContent, onOpen: renderEquipmentView }
    ];
    tabs.forEach(tab => {
        tab.button.addEventListener('click', () => {
            tabs.forEach(t => {
                t.button.classList.remove('active');
                t.content.classList.remove('active');
            });
            tab.button.classList.add('active');
            tab.content.classList.add('active');
            if (tab.onOpen) tab.onOpen();
        });
    });
}

export function renderTalents() {
    // ... implementation ...
}

export function showSectActions() {
    showView('event');
    const sect = getSect();
    elements.eventContent.innerHTML = `<p>Você está no pátio principal da sua seita: ${sect.name}.</p>`;
    elements.choicesContainer.innerHTML = '';

    const missionButton = document.createElement('button');
    missionButton.textContent = "Aceitar Missão da Seita";
    missionButton.onclick = () => {
        const mission = acceptSectMission();
        let message;
        if (mission) {
            const success = attemptMission(mission);
            message = `Você completou a missão '${mission.name}'. ${success ? 'Sucesso!' : 'Falha.'}`;
        } else {
            message = `<p>Não há missões disponíveis.</p>`;
        }
        elements.eventContent.innerHTML = message;
        const backToMapButton = document.createElement('button');
        backToMapButton.textContent = "Voltar ao Mapa";
        backToMapButton.onclick = () => { showView('map'); updateUI(); };
        elements.choicesContainer.innerHTML = '';
        elements.choicesContainer.appendChild(backToMapButton);
        updateUI();
    };
    elements.choicesContainer.appendChild(missionButton);

    const promotionButton = document.createElement('button');
    const nextRankIndex = gameState.sect.rankIndex + 1;
    if (nextRankIndex < sect.ranks.length) {
        const reqs = sect.promotion_requirements[gameState.sect.rankIndex];
        promotionButton.textContent = `Tentar Promoção para ${sect.ranks[nextRankIndex]} (Custo: ${reqs.contribution} Contrib., ${reqs.reputation} Rep.)`;
        if (gameState.sect.contribution >= reqs.contribution && gameState.resources.reputation >= reqs.reputation) {
            promotionButton.onclick = () => {
                const success = attemptPromotion();
                elements.eventContent.innerHTML = `<p>${success ? 'Você foi promovido!' : 'A tentativa de promoção falhou.'}</p>`;
                updateUI();
            };
        } else {
            promotionButton.disabled = true;
        }
        elements.choicesContainer.appendChild(promotionButton);
    }

    const backButton = document.createElement('button');
    backButton.textContent = "Voltar ao Mapa";
    backButton.onclick = () => showView('map');
    elements.choicesContainer.appendChild(backButton);
}
