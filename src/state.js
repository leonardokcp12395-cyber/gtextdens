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
    },
    {
        name: "Alma Nascente",
        qiMax: 50000,
        subRealms: ["Estágio Inicial", "Estágio Intermediário", "Estágio Avançado"],
        breakthroughRequirements: { "soul": 80, "daoComprehension": 50 }
    },
    {
        name: "Rei Divino",
        qiMax: 200000,
        subRealms: ["Estágio Inicial", "Estágio Intermediário", "Estágio Avançado"],
        breakthroughRequirements: { "body": 100, "mind": 100, "soul": 100, "daoComprehension": 200 }
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
        month: 0,
        attributes: {
            health: 100, maxHealth: 100,
            energy: 100, maxEnergy: 100,
            body: 10, mind: 10, soul: 10, luck: 5,
            defense: 5, critChance: 0.05, dodgeChance: 0.05
        },
        cultivation: { realmIndex: 0, subRealmIndex: 0, qi: 0, daoComprehension: 0 },
        resources: {
            money: 10,
            reputation: {
                hidden_cloud: 0,
                scorching_mountain: 0,
                golden_pavilion: 0,
                blood_demon: 0,
                secular_world: 0
            }
        },
        inventory: [],
        relationships: {},
        lifeLog: [],
        actionLog: [],
        unlockedTalents: [],
        talentPoints: 0,
        triggeredEvents: [],
        storyFlags: {},
        discoveredPoIs: [],
        spouseId: null,
        children: [],
        shownTutorials: [],
        manor: {
            owned: false,
            alchemyLabLevel: 0,
            spiritGatheringFormationLevel: 0,
            sparringGroundLevel: 0
        },
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
            contribution: 0,
            favor: 0,
            discipleCount: 10,
            unlockedSkills: [],
            missionTimer: 0
        },
        combat: null,
        currentRegionId: "vila_inicial"
    });

    // Aplica bônus de legado de jogos anteriores
    const legacyData = localStorage.getItem('wuxiaLegacyChoice');
    if (legacyData) {
        try {
            const legacyEffects = JSON.parse(legacyData);
            if (legacyEffects) {
                // A função applyEffects ainda não está disponível aqui, então aplicamos manualmente.
                if (legacyEffects.resources) {
                    for (const res in legacyEffects.resources) {
                        gameState.resources[res] += legacyEffects.resources[res];
                    }
                }
                if (legacyEffects.attributes) {
                    for (const attr in legacyEffects.attributes) {
                        gameState.attributes[attr] += legacyEffects.attributes[attr];
                    }
                }
                if (legacyEffects.skills) {
                    for (const skill in legacyEffects.skills) {
                        gameState.skills[skill] += legacyEffects.skills[skill];
                    }
                }
            }
        } catch (e) {
            console.error("Erro ao processar o legado:", e);
        } finally {
            localStorage.removeItem('wuxiaLegacyChoice');
        }
    }

    // Aplica herança se o jogador continuar como herdeiro
    const heirDataJSON = localStorage.getItem('wuxiaHeirInheritance');
    if (heirDataJSON) {
        try {
            const heirData = JSON.parse(heirDataJSON);
            const npcData = heirData.heirData;

            // Sobrepõe o estado inicial com os dados do herdeiro
            gameState.age = npcData.age;
            Object.assign(gameState.attributes, npcData.attributes);
            gameState.resources.money = heirData.money;
            gameState.unlockedTalents.push(...heirData.talents);
            gameState.storyFlags.playerIsHeir = true;

            // Log do evento de herança
            console.log(`Iniciando como herdeiro: ${npcData.name}, Idade: ${npcData.age}`);

        } catch (e) {
            console.error("Erro ao processar a herança:", e);
        } finally {
            localStorage.removeItem('wuxiaHeirInheritance');
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

    // Calcula atributos secundários
    effective.attackPower = Math.floor(effective.body * 1.5 + effective.mind * 0.5);
    effective.magicDefense = Math.floor(effective.soul * 1.2);
    effective.critDamage = 1.5 + Math.floor(effective.luck / 10) * 0.1; // 150% base + 10% per 10 luck

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
