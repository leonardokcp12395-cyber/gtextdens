// This is a full overwrite to ensure the file is correct after many changes.
import { gameState, allGameData, cultivationRealms, combatState, getEffectiveAttributes } from './state.js';
import { travelToRegion } from './game.js';
import { unlockTalent, takeCombatTurn, endCombat, getSect, attemptPromotion, acceptSectMission, attemptMission, applyEffects, giveGiftToNpc, sparWithNpc, craftItem, equipTechnique, unequipTechnique, sellItem, buyMarketItem, listenForRumors, equipItem, unequipItem, forgeItem, selectLegacy, becomeHeir, upgradeManorFacility } from './handlers.js';

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
    attrAttackPower: document.getElementById('attr-attack-power'),
    attrMagicDefense: document.getElementById('attr-magic-defense'),
    attrCritDamage: document.getElementById('attr-crit-damage'),
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
    nextMonthBtn: document.getElementById('next-month-btn'),
    sectActionsBtn: document.getElementById('sect-actions-btn'),
    alchemyBtn: document.getElementById('alchemy-btn'),
    manorBtn: document.getElementById('manor-btn'),
    manorView: document.getElementById('manor-view'),
    meditateBtn: document.getElementById('meditate-btn'),
    sectManagementBtn: document.getElementById('sect-management-btn'),
    sectManagementView: document.getElementById('sect-management-view'),
    familyTab: document.getElementById('family-tab'),
    familyContent: document.getElementById('family-content'),
    familyDetailsContainer: document.getElementById('family-details-container'),
    relationshipsTab: document.getElementById('relationships-tab'),
    relationshipsContent: document.getElementById('relationships-content'),
    npcSearchBar: document.getElementById('npc-search-bar')
};

function renderFamilyView() {
    const container = elements.familyDetailsContainer;
    container.innerHTML = '';

    // Spouse Info
    if (gameState.spouseId) {
        const spouse = gameState.relationships[gameState.spouseId];
        if (spouse) {
            container.innerHTML += `
                <h4>Cônjuge: ${spouse.name}</h4>
                <p>Status: ${getRelationshipStatus(spouse.initialRelationship)}</p>
            `;
        }
    } else {
        container.innerHTML += '<h4>Cônjuge: Nenhum</h4>';
    }

    // Children Info
    container.innerHTML += '<hr><h4>Filhos</h4>';
    if (gameState.children.length > 0) {
        const childrenList = document.createElement('ul');
        gameState.children.forEach(childId => {
            const child = gameState.relationships[childId];
            if (child) {
                const li = document.createElement('li');
                li.textContent = `${child.name} (Idade: ${child.age})`;
                childrenList.appendChild(li);
            }
        });
        container.appendChild(childrenList);
    } else {
        container.innerHTML += '<p>Nenhum</p>';
    }
}

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

function updateRelationshipsList(filterText = '') {
    elements.relationshipsList.innerHTML = '';
    const rels = Object.values(gameState.relationships);
    if (rels.length === 0) {
        elements.relationshipsList.innerHTML = '<li>Nenhum</li>';
        return;
    }

    const filteredRels = rels.filter(npc => npc.name.toLowerCase().includes(filterText.toLowerCase()));

    filteredRels.forEach(npc => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';

        const textSpan = document.createElement('span');
        if (npc.alive) {
            const status = getRelationshipStatus(npc.initialRelationship);
            let icon = '';
            if (npc.isRival) icon = '<span class="status-icon rival-icon">⚔️</span>';
            else if (npc.id === gameState.spouseId) icon = '<span class="status-icon spouse-icon">❤️</span>';
            else if (status === "Amigo de Confiança" || status === "Aliado Íntimo") icon = '<span class="status-icon friend-icon">🤝</span>';

            textSpan.innerHTML = `${icon}<strong>${npc.name}</strong>: ${npc.initialRelationship} (${status})`;
        } else {
            textSpan.innerHTML = `<span class="status-icon">💀</span><strong>${npc.name}</strong> (Falecido)`;
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
    if (!gameState || !gameState.attributes || !cultivationRealms) return;
    if (!combatState) elements.nextMonthBtn.style.display = 'block';
    renderMap();
    const effectiveAttributes = getEffectiveAttributes();
    const currentRealm = allGameData.cultivationRealms[gameState.cultivation.realmIndex];
    const subRealmName = currentRealm.subRealms[gameState.cultivation.subRealmIndex];
    elements.age.textContent = `${gameState.age} anos, ${gameState.month % 12} meses`;
    elements.attrHealth.textContent = effectiveAttributes.health;
    elements.attrMaxHealth.textContent = effectiveAttributes.maxHealth;
    elements.attrEnergy.textContent = effectiveAttributes.energy;
    elements.attrMaxEnergy.textContent = effectiveAttributes.maxEnergy;
    elements.attrBody.textContent = effectiveAttributes.body;
    elements.attrMind.textContent = effectiveAttributes.mind;
    elements.attrSoul.textContent = effectiveAttributes.soul;
    elements.attrLuck.textContent = effectiveAttributes.luck;
    elements.attrAttackPower.textContent = effectiveAttributes.attackPower;
    elements.attrMagicDefense.textContent = effectiveAttributes.magicDefense;
    elements.attrCritDamage.textContent = `${Math.floor(effectiveAttributes.critDamage * 100)}%`;
    elements.cultRealm.textContent = `${currentRealm.name} - ${subRealmName}`;
    elements.cultQi.textContent = gameState.cultivation.qi;
    elements.cultQiMax.textContent = currentRealm.qiMax;
    elements.resMoney.textContent = `${gameState.resources.money} Moedas de Cobre`;

    // Renderiza Reputação de Facção
    const repContainer = document.getElementById('reputation-container');
    let repHTML = '<h3>Reputação</h3><ul>';
    let hasReputation = false;
    for (const faction in gameState.resources.reputation) {
        if (gameState.resources.reputation[faction] !== 0) {
            hasReputation = true;
            const factionName = allGameData.strings.factions[faction] || faction;
            repHTML += `<li><strong>${factionName}:</strong> ${gameState.resources.reputation[faction]}</li>`;
        }
    }
    if (!hasReputation) {
        repHTML += '<li>Nenhuma reputação ainda.</li>';
    }
    repHTML += '</ul>';
    repContainer.innerHTML = repHTML;

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

    // Lógica para mostrar o botão da Mansão e Alquimia
    if (gameState.manor.owned) {
        elements.manorBtn.style.display = 'block';
        elements.alchemyBtn.style.display = 'block';
    } else {
        elements.manorBtn.style.display = 'none';
        elements.alchemyBtn.style.display = 'none';
    }

    // Lógica para mostrar o botão de Gestão da Seita
    if (gameState.storyFlags.isSectLeader) {
        elements.sectManagementBtn.style.display = 'block';
        elements.sectActionsBtn.style.display = 'none'; // Esconde o botão normal de ações
    } else {
        elements.sectManagementBtn.style.display = 'none';
    }

    // Lógica para mostrar a aba Família
    if (gameState.spouseId || gameState.children.length > 0) {
        elements.familyTab.style.display = 'block';
    } else {
        elements.familyTab.style.display = 'none';
    }

    updateInventoryList();
    updateRelationshipsList();
}

export function showDeathScreen() {
    const overlay = document.getElementById('death-screen-overlay');
    const content = document.getElementById('death-screen-content');
    if (!overlay || !content || !allGameData.legacies) return;

    const finalRealm = cultivationRealms[gameState.cultivation.realmIndex];

    let summaryHTML = `
        <h2>O Fim da Jornada</h2>
        <p>Você viveu até os <strong>${gameState.age}</strong> anos e alcançou o reino de <strong>${finalRealm.name}</strong>.</p>
        <p>Sua maior riqueza foi <strong>${gameState.resources.money}</strong> moedas.</p>
        <p>Sua reputação atingiu o pico de <strong>${gameState.resources.reputation}</strong>.</p>
        <p>Suas habilidades alcançaram: Alquimia Nv. ${gameState.skills.alchemy}, Forja Nv. ${gameState.skills.forging}.</p>
        <hr>
        <h3>Seu legado ecoará pela eternidade. Escolha a marca que você deixará para a próxima geração.</h3>
    `;

    const unlockedLegacies = allGameData.legacies.filter(legacy => {
        const conditions = legacy.unlockConditions;
        if (conditions.resources) {
            for (const resource in conditions.resources) {
                if (gameState.resources[resource] < conditions.resources[resource]) return false;
            }
        }
        if (conditions.cultivation) {
            if (gameState.cultivation.realmIndex < conditions.cultivation.realmIndex) return false;
        }
        if (conditions.skills) {
             for (const skill in conditions.skills) {
                if (gameState.skills[skill] < conditions.skills[skill]) return false;
            }
        }
        return true;
    });

    if (unlockedLegacies.length > 0) {
        unlockedLegacies.forEach(legacy => {
            summaryHTML += `<button class="legacy-button" data-legacy-id="${legacy.id}"><strong>${legacy.name}</strong>: ${legacy.description}</button>`;
        });
    } else {
        summaryHTML += "<p>Você não desbloqueou nenhum legado especial desta vez, mas sua história não será esquecida.</p>";
    }

    summaryHTML += `<button class="legacy-button" data-legacy-id="none">Começar de novo sem um legado.</button>`;

    // Opção de continuar como herdeiro
    const livingChildren = gameState.children.map(id => gameState.relationships[id]).filter(c => c && c.alive);
    if (livingChildren.length > 0) {
        summaryHTML += `<hr><h3>Sua linhagem pode continuar...</h3>`;
        livingChildren.forEach(child => {
            summaryHTML += `<button class="legacy-button heir-button" data-heir-id="${child.id}">Continuar como ${child.name} (Idade ${child.age})</button>`;
        });
    }

    content.innerHTML = summaryHTML;

    // Add event listeners to the new buttons
    const legacyButtons = content.querySelectorAll('.legacy-button');
    legacyButtons.forEach(button => {
        button.onclick = () => {
            const legacyId = button.getAttribute('data-legacy-id');
            if (legacyId) {
                selectLegacy(legacyId);
            }
        };
    });

    const heirButtons = content.querySelectorAll('.heir-button');
    heirButtons.forEach(button => {
        button.onclick = () => {
            const heirId = button.getAttribute('data-heir-id');
            becomeHeir(heirId);
        };
    });

    overlay.style.display = 'flex';
}

function handleCombatTurn(action) {
    const wasMission = combatState && combatState.missionId;
    const result = takeCombatTurn(action);

    if (result === 'win' || result === 'loss') {
        const resultText = endCombat(result);
        elements.eventContent.innerHTML = `<p>${resultText}</p>`;
        elements.choicesContainer.innerHTML = '';

        if (wasMission) {
            const backToSectButton = document.createElement('button');
            backToSectButton.textContent = "Retornar à Seita";
            backToSectButton.onclick = () => {
                showSectActions();
                updateUI();
            };
            elements.choicesContainer.appendChild(backToSectButton);
        } else {
            const backToMapButton = document.createElement('button');
            backToMapButton.textContent = "Voltar ao Mapa";
            backToMapButton.onclick = () => { showView('map'); updateUI(); };
            elements.choicesContainer.appendChild(backToMapButton);
        }
    } else {
        showCombatUI();
    }
}

export function showCombatUI() {
    if (!combatState) return;
    showView('event');
    const combatLog = combatState.log.map(entry => `<p>${entry}</p>`).join('');

    const playerStatusText = combatState.playerStatusEffects.map(e => `${e.type} (${e.duration})`).join(', ');
    const enemyStatusText = combatState.enemyStatusEffects.map(e => `${e.type} (${e.duration})`).join(', ');

    const combatHTML = `<h2>Combate!</h2>
        <p><strong>${combatState.enemy.name}</strong> - Saúde: ${combatState.enemyHealth} ${enemyStatusText ? `| Efeitos: ${enemyStatusText}` : ''}</p>
        <p><strong>Você</strong> - Saúde: ${gameState.attributes.health} ${playerStatusText ? `| Efeitos: ${playerStatusText}` : ''}</p>
        <hr><div class="combat-log">${combatLog}</div>`;
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
    elements.manorView.classList.remove('active');

    if (viewName === 'map') elements.mapView.classList.add('active');
    else if (viewName === 'event') elements.eventView.classList.add('active');
    else if (viewName === 'interaction') elements.interactionView.classList.add('active');
    else if (viewName === 'alchemy') elements.alchemyView.classList.add('active');
    else if (viewName === 'hub') elements.hubView.classList.add('active');
    else if (viewName === 'manor') elements.manorView.classList.add('active');
    else if (viewName === 'sect_management') elements.sectManagementView.classList.add('active');
}

export function showSectManagementView() {
    showView('sect_management');
    const container = document.getElementById('sect-management-container');
    container.innerHTML = `
        <h4>Recrutamento</h4>
        <p><strong>Discípulos Atuais:</strong> ${gameState.sect.discipleCount}</p>
        <button id="recruit-disciples-btn">Recrutar Discípulos (Custo: 100 Contribuição)</button>
        <hr>
        <h4>Missões</h4>
        <button id="send-disciples-btn">Enviar Discípulos em Missão Genérica (Custo: 50 Contribuição)</button>
        <hr>
        <h4>Desenvolvimento</h4>
        <button id="sect-skills-btn">Habilidades da Seita</button>
        <hr>
        <h4>Relações Exteriores</h4>
        <button id="diplomacy-btn">Diplomacia</button>
    `;

    document.getElementById('recruit-disciples-btn').onclick = () => {
        handleSpecialEffects('recruit_disciples');
        showSectManagementView(); // Refresh view
    };

    document.getElementById('send-disciples-btn').onclick = () => {
        handleSpecialEffects('send_disciples_on_mission');
        showSectManagementView(); // Refresh view
    };

    document.getElementById('sect-skills-btn').onclick = () => {
        showSectSkillsView();
    };

    document.getElementById('diplomacy-btn').onclick = () => {
        showDiplomacyView();
    };
}

function showDiplomacyView() {
    showView('event');
    const sect = getSect();
    elements.eventContent.innerHTML = `<h2>Mesa de Diplomacia: ${sect.name}</h2>`;
    elements.choicesContainer.innerHTML = '';

    const otherSects = allGameData.sects.filter(s => s.id !== sect.id);
    otherSects.forEach(otherSect => {
        const div = document.createElement('div');
        div.innerHTML = `<h4>${otherSect.name}</h4><p>Reputação: ${gameState.resources.reputation[otherSect.id] || 0}</p>`;

        const giftButton = document.createElement('button');
        giftButton.textContent = "Enviar Presente (Custo: 100 Contribuição)";
        if (gameState.sect.contribution < 100) {
            giftButton.disabled = true;
        }
        giftButton.onclick = () => {
            handleSpecialEffects('send_diplomatic_gift', { targetSectId: otherSect.id });
            showDiplomacyView();
        };

        div.appendChild(giftButton);
        elements.choicesContainer.appendChild(div);
    });

    const backButton = document.createElement('button');
    backButton.textContent = "Voltar à Gestão da Seita";
    backButton.onclick = () => showSectManagementView();
    elements.choicesContainer.appendChild(backButton);
}

function showSectSkillsView() {
    showView('event');
    elements.eventContent.innerHTML = `<h2>Habilidades da Seita</h2>`;
    elements.choicesContainer.innerHTML = '';

    allGameData.sect_skills.forEach(skill => {
        const skillDiv = document.createElement('div');
        skillDiv.className = 'sect-skill';

        let buttonHTML = '';
        if (gameState.sect.unlockedSkills.includes(skill.id)) {
            skillDiv.classList.add('unlocked');
            buttonHTML = '<button disabled>Desbloqueada</button>';
        } else if (gameState.sect.contribution >= skill.cost.contribution && gameState.sect.favor >= skill.cost.favor) {
            skillDiv.classList.add('unlockable');
            buttonHTML = `<button onclick="window.unlockSectSkill('${skill.id}')">Desbloquear</button>`;
        } else {
            skillDiv.classList.add('locked');
            buttonHTML = '<button disabled>Bloqueada</button>';
        }

        skillDiv.innerHTML = `
            <h4>${skill.name}</h4>
            <p>${skill.description}</p>
            <p><strong>Custo:</strong> ${skill.cost.contribution} Contribuição, ${skill.cost.favor} Favor</p>
            ${buttonHTML}
        `;
        elements.choicesContainer.appendChild(skillDiv);
    });

    const backButton = document.createElement('button');
    backButton.textContent = "Voltar à Gestão da Seita";
    backButton.onclick = () => showSectManagementView();
    elements.choicesContainer.appendChild(backButton);
}

export function showManorView() {
    showView('manor');
    const manorContainer = document.getElementById('manor-upgrades-container');
    manorContainer.innerHTML = '<h3>Instalações</h3>';

    const facilities = [
        { id: 'alchemyLab', name: 'Laboratório de Alquimia', description: 'Melhora a chance de sucesso na alquimia.' },
        { id: 'spiritGatheringFormation', name: 'Formação de Coleta Espiritual', description: 'Aumenta o ganho de Qi passivo a cada ano.' },
        { id: 'sparringGround', name: 'Campo de Treino', description: 'Permite treinar atributos físicos de forma mais eficaz.' }
    ];

    facilities.forEach(facility => {
        const level = gameState.manor[`${facility.id}Level`];
        const cost = (allGameData.config.costs.manor_upgrades[facility.id] || 500) * (level + 1);

        const facilityDiv = document.createElement('div');
        facilityDiv.className = 'manor-facility';
        facilityDiv.innerHTML = `
            <h4>${facility.name} (Nível ${level})</h4>
            <p>${facility.description}</p>
        `;

        const upgradeButton = document.createElement('button');
        upgradeButton.textContent = `Melhorar (Custo: ${cost} moedas)`;

        if (gameState.resources.money < cost) {
            upgradeButton.disabled = true;
        }

        upgradeButton.onclick = () => {
            const result = upgradeManorFacility(facility.id);
            if (!result.success) {
                alert(result.message);
            }
            showManorView(); // Refresh
            updateUI();
        };

        facilityDiv.appendChild(upgradeButton);
        manorContainer.appendChild(facilityDiv);
    });

    const backButton = document.createElement('button');
    backButton.textContent = "Voltar ao Mapa";
    backButton.onclick = () => showView('map');
    manorContainer.appendChild(backButton);

    // Add Train button if sparring ground exists
    if (gameState.manor.sparringGroundLevel > 0) {
        const trainButton = document.createElement('button');
        trainButton.textContent = `Treinar no Campo de Treino (Passar 1 Mês)`;
        trainButton.onclick = () => {
            // This will call advanceMonth with a new action type
            window.advanceMonth('train_manor');
        };
        manorContainer.appendChild(trainButton);
    }
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
    listenButton.textContent = `Ouvir conversas (Custa ${allGameData.config.costs.listenToRumors} moedas)`;

    if (gameState.resources.money < allGameData.config.costs.listenToRumors) {
        listenButton.disabled = true;
    }

    listenButton.onclick = () => {
        applyEffects({ resources: { money: -allGameData.config.costs.listenToRumors } });
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
    elements.hubContentContainer.innerHTML += `<p><strong>Nível de Forja:</strong> ${gameState.skills.forging}</p><hr>`;

    const playerIngredients = gameState.inventory.reduce((acc, itemId) => {
        acc[itemId] = (acc[itemId] || 0) + 1;
        return acc;
    }, {});

    const recipesContainer = document.createElement('div');
    allGameData.forging_recipes.forEach(recipe => {
        const recipeDiv = document.createElement('div');
        recipeDiv.className = 'recipe'; // Re-use alchemy style for consistency

        let ingredientsText = '';
        let canCraft = true;
        recipe.ingredients.forEach(ing => {
            const itemData = allGameData.forging_ingredients.find(i => i.id === ing.id);
            const playerHas = playerIngredients[ing.id] || 0;
            const hasEnough = playerHas >= ing.quantity;
            if (!hasEnough) canCraft = false;
            ingredientsText += `<span style="color: ${hasEnough ? 'green' : 'red'};">${ing.quantity}x ${itemData.name} (Você tem ${playerHas})</span><br>`;
        });

        const resultItem = allGameData.equipment.find(i => i.id === recipe.result);
        recipeDiv.innerHTML = `
            <h4>${resultItem.name}</h4>
            <p><small>Requer (Nível de Forja ${recipe.skillRequired}):<br>${ingredientsText}</small></p>
        `;

        const craftButton = document.createElement('button');
        craftButton.textContent = 'Forjar';
        if (!canCraft || gameState.skills.forging < recipe.skillRequired) {
            craftButton.disabled = true;
        }
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

    // Show player's forging ingredients
    elements.hubContentContainer.innerHTML += '<hr><h3>Seus Materiais de Forja</h3>';
    const ingredientsList = document.createElement('ul');
    const playerForgingIngredients = gameState.inventory.filter(itemId => allGameData.forging_ingredients.some(ing => ing.id === itemId));
    const ingredientCounts = playerForgingIngredients.reduce((acc, itemId) => {
        acc[itemId] = (acc[itemId] || 0) + 1;
        return acc;
    }, {});

    if (Object.keys(ingredientCounts).length === 0) {
        ingredientsList.innerHTML = '<li>Você não possui materiais de forja.</li>';
    } else {
        for (const itemId in ingredientCounts) {
            const itemData = allGameData.forging_ingredients.find(i => i.id === itemId);
            const li = document.createElement('li');
            li.textContent = `${ingredientCounts[itemId]}x ${itemData.name}`;
            ingredientsList.appendChild(li);
        }
    }
    elements.hubContentContainer.appendChild(ingredientsList);
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

    // Lógica de Mentoria
    if (npc.mentorship && !gameState.storyFlags[`apprentice_${npc.id}`]) {
        const reqs = npc.mentorship.requirements;
        let meetsReqs = true;
        let reqsText = "Requisitos: ";

        if (reqs.relationship && gameState.relationships[npc.id].initialRelationship < reqs.relationship) {
            meetsReqs = false;
            reqsText += `Relacionamento ${reqs.relationship}, `;
        }
        if (reqs.skills) {
            for (const skill in reqs.skills) {
                if (gameState.skills[skill] < reqs.skills[skill]) {
                    meetsReqs = false;
                    reqsText += `${skill.charAt(0).toUpperCase() + skill.slice(1)} Nv. ${reqs.skills[skill]}, `;
                }
            }
        }

        const apprenticeButton = document.createElement('button');
        apprenticeButton.textContent = 'Pedir para ser aprendiz';
        if (meetsReqs) {
            apprenticeButton.onclick = () => {
                handleSpecialEffects(`become_apprentice_${npc.id}`);
                // Refresh a view para esconder o botão
                showInteractionView(npcId);
            };
        } else {
            apprenticeButton.disabled = true;
            apprenticeButton.title = reqsText.slice(0, -2);
        }
        elements.interactionOptionsContainer.appendChild(apprenticeButton);
    }

    // Lógica de Casamento
    if (npc.canMarry && !gameState.spouseId && npc.initialRelationship >= 100) {
        const marryButton = document.createElement('button');
        marryButton.textContent = 'Propor Casamento';
        marryButton.onclick = () => {
            handleSpecialEffects(`propose_marriage`, npc);
            showInteractionView(npcId); // Refresh view
        };
        elements.interactionOptionsContainer.appendChild(marryButton);
    }
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

    // Add discovered Points of Interest for the current region
    const currentRegionId = gameState.currentRegionId;
    const discoveredPoIs = gameState.discoveredPoIs.map(poiId => allGameData.points_of_interest.find(p => p.id === poiId));
    const poisInCurrentRegion = discoveredPoIs.filter(poi => poi && poi.regionId === currentRegionId);

    if (poisInCurrentRegion.length > 0) {
        const poiContainer = document.createElement('div');
        poiContainer.innerHTML = '<hr><h3>Locais Descobertos</h3>';
        poisInCurrentRegion.forEach(poi => {
            const poiButton = document.createElement('button');
            poiButton.className = 'poi-button';
            poiButton.textContent = `Revisitar: ${poi.name}`;
            poiButton.onclick = () => showEvent(poi.events[0]);
            poiContainer.appendChild(poiButton);
        });
        elements.regionsContainer.appendChild(poiContainer);
    }
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
        { button: elements.equipmentTab, content: elements.equipmentContent, onOpen: renderEquipmentView },
        { button: elements.relationshipsTab, content: elements.relationshipsContent, onOpen: updateRelationshipsList },
        { button: elements.familyTab, content: elements.familyContent, onOpen: renderFamilyView }
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

    // Setup Accordion
    const accordions = document.querySelectorAll('.accordion-header');
    accordions.forEach(accordion => {
        accordion.addEventListener('click', () => {
            accordion.classList.toggle('active');
            const content = accordion.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });

    // Setup NPC Search Bar
    elements.npcSearchBar.addEventListener('input', (e) => {
        updateRelationshipsList(e.target.value);
    });
}

export function renderTalents() {
    // ... implementation ...
}

export function showSectActions() {
    showView('event');
    const sect = getSect();
    elements.eventContent.innerHTML = `<h2>Ações da Seita: ${sect.name}</h2>`;
    elements.choicesContainer.innerHTML = '';

    // Mostra missões disponíveis
    elements.eventContent.innerHTML += '<h3>Missões Disponíveis</h3>';
    if (sect.missions && sect.missions.length > 0) {
        sect.missions.forEach(mission => {
            if (gameState.sect.rankIndex >= mission.rankRequired) {
                const missionButton = document.createElement('button');
                missionButton.textContent = `Aceitar: ${mission.name}`;
                missionButton.onclick = () => {
                    attemptMission(mission.id);
                    // For non-combat missions, we need to refresh the view to show results.
                    // Combat missions will automatically switch to the combat UI.
                    if (mission.check.type !== 'combat') {
                        showSectActions(); // Simple refresh for now
                        updateUI();
                    }
                };
                elements.choicesContainer.appendChild(missionButton);
            }
        });
    } else {
        elements.eventContent.innerHTML += '<p>Não há missões disponíveis no momento.</p>';
    }

    elements.eventContent.innerHTML += '<hr>';

    // Botão de Promoção
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

    // Botão do Tesouro da Seita
    if (sect.treasury && sect.treasury.length > 0) {
        const treasuryButton = document.createElement('button');
        treasuryButton.textContent = "Ver Tesouro da Seita";
        treasuryButton.onclick = () => showSectTreasury(sect);
        elements.choicesContainer.appendChild(treasuryButton);
    }

    // Botão do Conselho da Seita
    if (gameState.sect.rankIndex >= 2) { // Must be at least Elite Disciple
        const councilButton = document.createElement('button');
        councilButton.textContent = "Concílio da Seita";
        councilButton.onclick = () => showSectCouncilView(sect);
        elements.choicesContainer.appendChild(councilButton);
    }
}

function showSectTreasury(sect) {
    showView('event');
    elements.eventContent.innerHTML = `<h2>Tesouro da Seita: ${sect.name}</h2>`;
    elements.eventContent.innerHTML += `<p>Itens especiais podem ser adquiridos aqui com pontos de Contribuição ou Favor do Ancião.</p>`;
    elements.eventContent.innerHTML += `<p>Sua Contribuição: ${gameState.sect.contribution} | Seu Favor: ${gameState.sect.favor}</p><hr>`;
    elements.choicesContainer.innerHTML = '';

    sect.treasury.forEach(item => {
        const itemButton = document.createElement('button');
        const costType = item.costType || 'contribution'; // Padrão para contribuição
        const playerResource = gameState.sect[costType];

        itemButton.textContent = `Comprar ${item.name} (${item.cost} ${costType})`;

        if (playerResource < item.cost) {
            itemButton.disabled = true;
            itemButton.title = `Você precisa de ${item.cost} de ${costType}.`;
        }

        itemButton.onclick = () => {
            gameState.sect[costType] -= item.cost;
            gameState.inventory.push(item.id);
            logLifeEvent(`Você adquiriu ${item.name} do tesouro da seita.`);
            showSectTreasury(sect); // Refresh a view
            updateUI();
        };
        elements.choicesContainer.appendChild(itemButton);
    });

    const backButton = document.createElement('button');
    backButton.textContent = "Voltar às Ações da Seita";
    backButton.onclick = () => showSectActions();
    elements.choicesContainer.appendChild(backButton);
}

export function showTutorial(tutorial) {
    const overlay = document.getElementById('tutorial-overlay');
    document.getElementById('tutorial-title').textContent = tutorial.title;
    document.getElementById('tutorial-text').textContent = tutorial.text;
    overlay.style.display = 'flex';

    document.getElementById('tutorial-close-btn').onclick = () => {
        overlay.style.display = 'none';
    };
}

function showSectCouncilView(sect) {
    showView('event');
    elements.eventContent.innerHTML = `<h2>Concílio da Seita: ${sect.name}</h2>`;
    elements.choicesContainer.innerHTML = '';

    let content = `<p>Aqui você pode ver seu progresso para se tornar o líder da seita.</p>`;
    content += `<p><strong>Favor dos Anciãos:</strong> ${gameState.sect.favor}</p><hr>`;

    if (gameState.storyFlags.isSectLeader) {
        content += '<p>Você é o Mestre da Seita! Sua palavra é lei.</p>';
    } else {
        const nextRankIndex = gameState.sect.rankIndex + 1;
        if (nextRankIndex < sect.ranks.length) {
             content += '<p>Continue a subir nas fileiras e ganhar favor para provar seu valor.</p>';
        } else {
            content += '<p>Você está no auge das fileiras. Apenas um desafio final permanece.</p>';
            const favorNeeded = 100; // Hardcoded for now, should be in config
            if (gameState.sect.favor >= favorNeeded) {
                content += '<p style="color: green;">Você tem favor suficiente para desafiar a liderança!</p>';
            } else {
                content += `<p style="color: red;">Você precisa de mais ${favorNeeded - gameState.sect.favor} de favor para desafiar a liderança.</p>`;
            }
        }
    }

    elements.eventContent.innerHTML += content;

    const backButton = document.createElement('button');
    backButton.textContent = "Voltar às Ações da Seita";
    backButton.onclick = () => showSectActions();
    elements.choicesContainer.appendChild(backButton);
}
