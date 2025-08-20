/**
 * Este módulo gerencia o estado completo do jogo.
 */

// O estado principal do jogo, contendo os dados do jogador e da sessão.
export const gameState = {};

// Dados carregados dos arquivos JSON.
export let allGameData = {};

// Estado específico do combate.
export let combatState = null;

// Constante com as definições dos reinos de cultivo.
export const cultivationRealms = [
    {
        name: "Mortal",
        qiMax: 100,
        subRealms: ["Comum", "Desperto", "Iniciado"]
    },
    {
        name: "Condensação de Qi",
        qiMax: 500,
        subRealms: ["Estágio Inicial", "Estágio Intermediário", "Estágio Avançado"],
        breakthroughRequirements: { mind: 12, soul: 12 }
    },
    {
        name: "Estabelecimento de Fundação",
        qiMax: 2000,
        subRealms: ["Estágio Inicial", "Estágio Intermediário", "Estágio Avançado"],
        breakthroughRequirements: { body: 20, mind: 20 }
    },
    {
        name: "Núcleo Dourado",
        qiMax: 10000,
        subRealms: ["Estágio Inicial", "Estágio Intermediário", "Estágio Avançado"],
        breakthroughRequirements: { soul: 30, luck: 10 }
    }
];

/**
 * Inicializa ou reseta o gameState para um novo jogo.
 */
export function initializeGameState() {
    // Limpa o estado antigo para garantir que não haja propriedades residuais
    Object.keys(gameState).forEach(key => delete gameState[key]);

    // Define o estado inicial usando Object.assign para modificar o objeto existente
    Object.assign(gameState, {
        age: 0,
        attributes: {
            health: 100, maxHealth: 100,
            energy: 100, maxEnergy: 100,
            body: 10, mind: 10, soul: 10, luck: 5,
            defense: 5, critChance: 0.05, dodgeChance: 0.05
        },
        cultivation: { realmIndex: 0, subRealmIndex: 0, qi: 0 },
        resources: { money: 10, reputation: 0 },
        inventory: [],
        relationships: {},
        lifeLog: [],
        actionLog: [],
        unlockedTalents: [],
        talentPoints: 0,
        triggeredEvents: [],
        storyFlags: {},
        skills: {
            alchemy: 0,
            alchemyXp: 0,
            alchemyXpToNextLevel: 10,
            forging: 0,
            forgingXp: 0,
            forgingXpToNextLevel: 10
        },
        techniqueSlots: 1,
        equippedTechniques: [],
        heardRumors: [],
        equipment: {
            weapon: null,
            armor: null,
            accessory: null
        },
        sect: {
            id: null,
            rankIndex: 0,
            contribution: 0
        },
        combat: null,
        currentRegionId: "vila_inicial"
    });

    // Aplica bônus de legado de jogos anteriores
    const legacyData = localStorage.getItem('wuxiaLegacy');
    if (legacyData) {
        try {
            const legacyBonus = JSON.parse(legacyData);
            if (legacyBonus && legacyBonus.attribute && legacyBonus.value) {
                gameState.attributes[legacyBonus.attribute] += legacyBonus.value;
            }
        } catch (e) {
            console.error("Erro ao processar o legado:", e);
        } finally {
            localStorage.removeItem('wuxiaLegacy');
        }
    }
}

/**
 * Define os dados do jogo carregados e inicializa os NPCs no estado.
 */
export function setGameData(data) {
    allGameData = data;
    // Inicializa os NPCs no estado do jogo (para um novo jogo)
    if (Object.keys(gameState.relationships).length === 0 && allGameData.npcs) {
        allGameData.npcs.forEach(npc => {
            // Adiciona apenas NPCs que começam desbloqueados
            if (npc.unlocked) {
                // Cria uma cópia profunda para evitar mutação do estado original
                gameState.relationships[npc.id] = JSON.parse(JSON.stringify(npc));
            }
        });
    }
}

/**
 * Define o estado de combate.
 */
export function setCombatState(state) {
    combatState = state;
    gameState.combat = state;
}

/**
 * Salva o estado atual do jogo no localStorage.
 */
export function saveGame() {
    try {
        localStorage.setItem('wuxiaGameState', JSON.stringify(gameState));
    } catch (e) {
        console.error("Falha ao salvar o jogo:", e);
    }
}

export function getEffectiveAttributes() {
    const effective = { ...gameState.attributes };
    const allItems = [...(allGameData.items || []), ...(allGameData.equipment || []), ...(allGameData.sects.flatMap(s => s.store) || [])];

    for (const slot in gameState.equipment) {
        const itemId = gameState.equipment[slot];
        if (itemId) {
            const itemData = allItems.find(i => i.id === itemId);
            if (itemData && itemData.effects) {
                for (const attr in itemData.effects) {
                    if (effective[attr] !== undefined) {
                        effective[attr] += itemData.effects[attr];
                    }
                }
            }
        }
    }

    // Aplica bônus de especialização
    const spec = gameState.storyFlags.specialization;
    if (spec && effective[spec]) {
        effective[spec] = Math.floor(effective[spec] * 1.20); // Bônus de 20%
    }

    return effective;
}

/**
 * Carrega o estado do jogo do localStorage, se existir.
 */
export function loadGame() {
    try {
        const savedStateJSON = localStorage.getItem('wuxiaGameState');
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);

            // Tratamento especial para relacionamentos para fundir com dados base
            const savedRelationships = savedState.relationships || {};
            delete savedState.relationships;

            // Carrega o resto do estado do jogo
            Object.keys(gameState).forEach(key => delete gameState[key]);
            Object.assign(gameState, savedState);

            // Funde os dados de relacionamento salvos com os dados base de NPCs
            gameState.relationships = {}; // Reseta antes de popular
            if (allGameData.npcs) {
                allGameData.npcs.forEach(baseNpc => {
                    const savedNpc = savedRelationships[baseNpc.id];
                    // Funde o NPC salvo sobre o NPC base
                    gameState.relationships[baseNpc.id] = {
                        ...JSON.parse(JSON.stringify(baseNpc)),
                        ...(savedNpc || {})
                    };
                });
            }
        }
    } catch (e) {
        console.error("Falha ao carregar o jogo salvo:", e);
        // Em caso de erro, re-inicializa para evitar um estado quebrado
        initializeGameState();
    }
}
