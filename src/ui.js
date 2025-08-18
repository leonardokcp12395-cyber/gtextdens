import { gameState, allGameData, cultivationRealms } from './state.js';
// As importações de handlers e game serão adicionadas depois
// import { advanceYear } from './game.js';
// import { showSectActions } from './handlers.js';

/**
 * Cache de elementos do DOM para acesso rápido.
 */
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
    // Elements for the new tab system
    resourcesTab: document.getElementById('resources-tab'),
    historyTab: document.getElementById('history-tab'),
    resourcesContent: document.getElementById('resources-content'),
    historyLogContent: document.getElementById('history-log-content'),
    actionLogList: document.getElementById('action-log-list'),
    eventContent: document.getElementById('event-content'),
    choicesContainer: document.getElementById('choices-container'),
    nextYearBtn: document.getElementById('next-year-btn'),
    sectActionsBtn: document.getElementById('sect-actions-btn')
};

/**
 * Aplica uma animação CSS a um elemento para indicar mudança.
 * @param {HTMLElement} element - O elemento do DOM a ser animado.
 * @param {'increase' | 'decrease'} changeType - O tipo de mudança para a animação.
 */
export function flashStat(element, changeType) {
    const className = changeType === 'increase' ? 'stat-increased' : 'stat-decreased';
    element.classList.add(className);
    setTimeout(() => {
        element.classList.remove(className);
    }, 700);
}

/**
 * Atualiza a lista de inventário na UI.
 */
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
                // A lógica de usar o item será movida para handlers.js
                // applyEffects(itemData.effects);
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

/**
 * Atualiza a lista de relacionamentos na UI.
 */
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

/**
 * Atualiza todos os elementos da UI com base no gameState atual.
 */
export function updateUI() {
    if (!gameState || !gameState.attributes) return;

    if (!gameState.combat) {
        elements.nextYearBtn.style.display = 'block';
    }
    const currentRealm = cultivationRealms[gameState.cultivation.realmIndex];
    elements.age.textContent = gameState.age;
    elements.attrHealth.textContent = gameState.attributes.health;
    elements.attrMaxHealth.textContent = gameState.attributes.maxHealth;
    elements.attrEnergy.textContent = gameState.attributes.energy;
    elements.attrMaxEnergy.textContent = gameState.attributes.maxEnergy;
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

    // Lógica do legado que afeta a UI
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

/**
 * Mostra a tela de morte com o resumo da vida do jogador.
 */
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
        <h3 id="life-log-header">Diário de Vida:</h3>
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

/**
 * Renderiza o histórico de ações na UI.
 */
export function updateActionLogUI() {
    if (!elements.actionLogList) return;
    elements.actionLogList.innerHTML = '';
    // Mostra as ações mais recentes primeiro
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


/**
 * Configura os event listeners para o sistema de abas.
 */
export function setupTabs() {
    elements.resourcesTab.addEventListener('click', () => {
        elements.resourcesTab.classList.add('active');
        elements.historyTab.classList.remove('active');
        elements.resourcesContent.classList.add('active');
        elements.historyLogContent.classList.remove('active');
    });

    elements.historyTab.addEventListener('click', () => {
        elements.historyTab.classList.add('active');
        elements.resourcesTab.classList.remove('active');
        elements.historyLogContent.classList.add('active');
        elements.resourcesContent.classList.remove('active');
        // Atualiza o log sempre que a aba é aberta
        updateActionLogUI();
    });
}
