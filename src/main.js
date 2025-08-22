import { initializeGameState, setGameData, loadGame } from './state.js';
import { initializeGame } from './game.js';
import * as handlers from './handlers.js';

/**
 * Carrega todos os dados do jogo a partir dos arquivos JSON.
 * @returns {Promise<Object>} Uma promessa que resolve com um objeto contendo todos os dados do jogo.
 */
async function loadGameData() {
    // DEBUG: Return a minimal object to bypass file loading
    return {
        strings: { factions: {} },
        events: [],
        items: [],
        sects: [],
        enemies: [],
        random_events: [],
        regions: [],
        talents: [],
        npcs: [],
        npc_templates: [],
        npc_life_events: [],
        dialogue: {},
        ingredients: [],
        recipes: [],
        rumors: [],
        equipment: [],
        forging_ingredients: [],
        forging_recipes: [],
        config: { costs: { manor_upgrades: {} }, chances: {}, rewards: {}, penalties: {}, combat: { damage: {} }, aging: { declineAge: {} }, npc: { cultivation: {}, relationships: {}, lifeEvent: {} }, xp: { alchemy: {}, forging: {} } },
        quest_whispering_blade: [],
        legacies: [],
        world_events: [],
        points_of_interest: [],
        sect_skills: [],
        tutorials: [],
    const dataSources = ['strings', 'events', 'items', 'sects', 'enemies', 'random_events', 'regions', 'talents', 'npcs', 'npc_templates', 'npc_life_events', 'dialogue', 'ingredients', 'recipes', 'rumors', 'equipment', 'forging_ingredients', 'forging_recipes', 'config', 'quest_whispering_blade', 'legacies'];
    const dataPromises = dataSources.map(source => fetch(`data/${source}.json`));

    try {
        const responses = await Promise.all(dataPromises);
        for (const res of responses) {
            if (!res.ok) {
                throw new Error(`Falha ao carregar o arquivo: ${res.url}`);
            }
        }
        const jsonData = await Promise.all(responses.map(res => res.json()));
        const allGameData = jsonData.reduce((acc, data, index) => {
            acc[dataSources[index]] = data;
            return acc;
        }, {});
        return allGameData;
    } catch (error) {
        console.error("Falha ao carregar os dados do jogo:", error);
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.textContent = `Erro fatal: Não foi possível carregar os dados essenciais do jogo. Por favor, recarregue a página. Detalhe: ${error.message}`;
            errorContainer.style.display = 'block';
        }
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.style.display = 'none';
        }
        return null;
    }
}

/**
 * Função principal que inicializa o jogo.
 */
async function main() {
    const gameData = await loadGameData();
    if (gameData) {
        setGameData(gameData);
        initializeGameState();
        loadGame();
        initializeGame(gameData);
        // Expose necessary handlers to the window object for dynamic UI
        window.unlockSectSkill = handlers.unlockSectSkill;
        window.advanceMonth = handlers.advanceMonth;

        updateUI();
        document.body.classList.add('game-loaded');
    }
}

// Ponto de entrada da aplicação
document.addEventListener('DOMContentLoaded', main);
