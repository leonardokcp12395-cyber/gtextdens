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
        relationships: [],
        lifeLog: [],
        actionLog: [],
        unlockedTalents: [],
        talentPoints: 0,
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
 * Define os dados do jogo carregados para que possam ser acessados globalmente.
 */
export function setGameData(data) {
    allGameData = data;
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

/**
 * Carrega o estado do jogo do localStorage, se existir.
 */
export function loadGame() {
    try {
        const savedStateJSON = localStorage.getItem('wuxiaGameState');
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);
            // Sobrescreve completamente o estado inicial com o estado salvo
            Object.keys(gameState).forEach(key => delete gameState[key]);
            Object.assign(gameState, savedState);
        }
    } catch (e) {
        console.error("Falha ao carregar o jogo salvo:", e);
    }
}
