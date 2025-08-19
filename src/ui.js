import { gameState, allGameData, cultivationRealms } from './state.js';
import { travelToRegion } from './game.js';
import { unlockTalent, takeCombatTurn, endCombat } from './handlers.js';

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
    resourcesContent: document.getElementById('resources-content'),
    historyLogContent: document.getElementById('history-log-content'),
    talentsContent: document.getElementById('talents-content'),
    actionLogList: document.getElementById('action-log-list'),
    talentPoints: document.getElementById('talent-points'),
    talentsContainer: document.getElementById('talents-container'),
    mapView: document.getElementById('map-view'),
    eventView: document.getElementById('event-view'),
    regionsContainer: document.getElementById('regions-container'),
    eventContent: document.getElementById('event-content'),
    choicesContainer: document.getElementById('choices-container'),
    nextYearBtn: document.getElementById('next-year-btn'),
    sectActionsBtn: document.getElementById('sect-actions-btn')
};

export function flashStat(element, changeType) {
    const className = changeType === 'increase' ? 'stat-increased' : 'stat-decreased';
    element.classList.add(className);
    setTimeout(() => {
        element.classList.remove(className);
    }, 700);
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

export function updateUI() {
    if (!gameState || !gameState.attributes) return;

    if (!combatState) {
        elements.nextYearBtn.style.display = 'block';
    }
    renderMap();
    const currentRealm = cultivationRealms[gameState.cultivation.realmIndex];
    const subRealmName = currentRealm.subRealms[gameState.cultivation.subRealmIndex];
    elements.age.textContent = gameState.age;
    elements.attrHealth.textContent = gameState.attributes.health;
    elements.attrMaxHealth.textContent = gameState.attributes.maxHealth;
    elements.attrEnergy.textContent = gameState.attributes.energy;
    elements.attrMaxEnergy.textContent = gameState.attributes.maxEnergy;
    elements.attrBody.textContent = gameState.attributes.body;
    elements.attrMind.textContent = gameState.attributes.mind;
    elements.attrSoul.textContent = gameState.attributes.soul;
    elements.attrLuck.textContent = gameState.attributes.luck;
    elements.cultRealm.textContent = `${currentRealm.name} - ${subRealmName}`;
    elements.cultQi.textContent = gameState.cultivation.qi;
    elements.cultQiMax.textContent = currentRealm.qiMax;
    elements.resMoney.textContent = `${gameState.resources.money} Moedas de Cobre`;
    elements.resReputation.textContent = gameState.resources.reputation;
    elements.talentPoints.textContent = gameState.talentPoints;

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

    const legacyData = localStorage.getItem('wuxiaLegacy');
    if (legacyData) {
        const legacyBonus = JSON.parse(legacyData);
         if (legacyBonus && legacyBonus.attribute && legacyBonus.value) {
            const legacyMessage = document.createElement('p');
            legacyMessage.innerHTML = `Você sente a bênção de um ancestral. (+${legacyBonus.value} ${legacyBonus.attribute})`;
            legacyMessage.style.color = '#a29bfe';
            elements.eventContent.prepend(legacyMessage);
         }
    }
}

export function showDeathScreen() {
    if (gameState.cultivation.realmIndex >= 2) {
        const legacyBonus = { attribute: 'luck', value: 1 };
        localStorage.setItem('wuxiaLegacy', JSON.stringify(legacyBonus));
    }
    const finalRealm = cultivationRealms[gameState.cultivation.realmIndex].name;
    const lifeLogHTML = gameState.lifeLog.map(log => `<li>${log}</li>`).join('');
    const summaryHTML = `
        <h2>Fim da Jornada</h2>
        <p>Você viveu até os <strong>${gameState.age}</strong> anos.</p>
        <p>Seu cultivo alcançou o reino de <strong>${finalRealm}</strong>.</p>
        <p>Sua reputação final foi de <strong>${gameState.resources.reputation}</strong>.</p>
        <hr>
        <h3>Diário de Vida:</h3>
        <ul>${lifeLogHTML}</ul>
        <hr>
        <p>O Dao é eterno, e o ciclo recomeça. Uma nova vida o aguarda.</p>
    `;
    elements.eventContent.innerHTML = summaryHTML;
    elements.choicesContainer.innerHTML = '';
    const restartButton = document.createElement('button');
    restartButton.textContent = "Começar Nova Vida";
    restartButton.onclick = () => location.reload();
    elements.choicesContainer.appendChild(restartButton);
    elements.nextYearBtn.style.display = 'none';
    elements.sectActionsBtn.style.display = 'none';
}

function handleCombatTurn(action) {
    const result = takeCombatTurn(action);
    if (result === 'win' || result === 'loss') {
        const resultText = endCombat(result);
        elements.eventContent.innerHTML = `<p>${resultText}</p>`;
        const backToMapButton = document.createElement('button');
        backToMapButton.textContent = "Voltar ao Mapa";
        backToMapButton.onclick = () => {
            showView('map');
            updateUI();
        };
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
    const combatHTML = `
        <h2>Combate!</h2>
        <p><strong>${combatState.enemy.name}</strong> - Saúde: ${combatState.enemyHealth}</p>
        <p><strong>Você</strong> - Saúde: ${gameState.attributes.health}</p>
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
}

export function showView(viewName) {
    elements.mapView.classList.remove('active');
    elements.eventView.classList.remove('active');
    if (viewName === 'map') {
        elements.mapView.classList.add('active');
    } else {
        elements.eventView.classList.add('active');
    }
}

export function renderMap() {
    if (!allGameData.regions) return;
    elements.regionsContainer.innerHTML = '';
    allGameData.regions.forEach(region => {
        let isUnlocked = region.unlocked;
        if (region.unlockRequirements) {
            if (region.unlockRequirements.age && gameState.age >= region.unlockRequirements.age) {
                isUnlocked = true;
            }
            if (region.unlockRequirements.sect && gameState.sect.id) {
                isUnlocked = true;
            }
        }
        if (isUnlocked) {
            const regionButton = document.createElement('button');
            regionButton.className = 'region-button';
            regionButton.innerHTML = `<strong>${region.name}</strong><br><small>${region.description}</small>`;
            regionButton.onclick = () => {
                travelToRegion(region.id);
            };
            elements.regionsContainer.appendChild(regionButton);
        }
    });
}

export function updateActionLogUI() {
    if (!elements.actionLogList) return;
    elements.actionLogList.innerHTML = '';
    [...gameState.actionLog].reverse().forEach(log => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>Idade: ${log.age}</strong><br>
            <em>${log.eventText}</em><br>
            <span class="choice-made">Sua escolha: ${log.choiceText}</span><br>
            <span>Resultado: ${log.resultText}</span>
        `;
        elements.actionLogList.appendChild(li);
    });
}

export function setupTabs() {
    const tabs = [
        { button: elements.resourcesTab, content: elements.resourcesContent },
        { button: elements.historyTab, content: elements.historyLogContent, onOpen: updateActionLogUI },
        { button: elements.talentsTab, content: elements.talentsContent, onOpen: renderTalents }
    ];
    tabs.forEach(tab => {
        tab.button.addEventListener('click', () => {
            tabs.forEach(t => {
                t.button.classList.remove('active');
                t.content.classList.remove('active');
            });
            tab.button.classList.add('active');
            tab.content.classList.add('active');
            if (tab.onOpen) {
                tab.onOpen();
            }
        });
    });
}

export function renderTalents() {
    if (!allGameData.talents) return;
    elements.talentsContainer.innerHTML = '';
    allGameData.talents.forEach(talent => {
        const talentDiv = document.createElement('div');
        talentDiv.className = 'talent';
        let status = 'locked';
        const isUnlocked = gameState.unlockedTalents.includes(talent.id);
        const canAfford = gameState.talentPoints >= talent.cost;
        const meetsReqs = talent.requirements.every(req => gameState.unlockedTalents.includes(req));
        if (isUnlocked) status = 'unlocked';
        else if (canAfford && meetsReqs) status = 'unlockable';
        talentDiv.classList.add(status);
        talentDiv.innerHTML = `<strong>${talent.name}</strong> (Custo: ${talent.cost})<br><small>${talent.description}</small>`;
        if (status === 'unlockable') {
            talentDiv.onclick = () => {
                unlockTalent(talent.id);
                updateUI();
                renderTalents();
            };
        }
        elements.talentsContainer.appendChild(talentDiv);
    });
}
