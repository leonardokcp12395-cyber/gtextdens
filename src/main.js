import { initializeGameState, setGameData, loadGame } from './state.js';
import { initializeGame, advanceMonth } from './game.js';
import * as handlers from './handlers.js';
import { updateUI } from './ui.js';

/**
 * Carrega todos os dados do jogo a partir dos arquivos JSON.
 * @returns {Promise<Object>} Uma promessa que resolve com um objeto contendo todos os dados do jogo.
 */
async function loadGameData() {
    try {
        const dataSources = ['strings', 'events', 'items', 'sects', 'enemies', 'random_events', 'regions', 'talents', 'npcs', 'npc_templates', 'npc_life_events', 'dialogue', 'ingredients', 'recipes', 'rumors', 'equipment', 'forging_ingredients', 'forging_recipes', 'config', 'quest_whispering_blade', 'legacies', 'world_events', 'points_of_interest', 'sect_skills', 'tutorials', 'quest_blood_cult'];
        const dataPromises = dataSources.map(source => fetch(`data/${source}.json`));
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

        // Attach strings to the main data object for easier access
        allGameData.strings = allGameData.strings || {};

        console.log("Todos os dados do jogo foram carregados com sucesso!");
        return allGameData;
    } catch (error) {
        console.error("Falha crítica ao carregar os dados do jogo:", error);
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.textContent = `Erro fatal: Não foi possível carregar os dados essenciais do jogo. Verifique a consola (F12) para mais detalhes. Erro: ${error.message}`;
            errorContainer.style.display = 'block';
        }
        return null;
    }
}

/**
 * Função principal que inicializa o jogo.
 */
async function main() {
    console.log("Main function started.");
    const gameData = await loadGameData();
    console.log("loadGameData finished.");

    if (gameData) {
        console.log("Entering gameData block.");
        setGameData(gameData);
        console.log("setGameData finished.");
        initializeGameState();
        console.log("initializeGameState finished.");
        loadGame();
        console.log("loadGame finished.");
        initializeGame(gameData);
        console.log("initializeGame finished.");

        // Expose necessary handlers to the window object for dynamic UI
        window.unlockSectSkill = handlers.unlockSectSkill;
        window.advanceMonth = advanceMonth; // Correctly reference the imported function
        console.log("Handlers exposed to window.");

        updateUI();
        console.log("updateUI finished.");
        document.body.classList.add('game-loaded');
        console.log("game-loaded class added.");
    } else {
        console.error("gameData is null or undefined. Initialization cannot proceed.");
    }
}

// Ponto de entrada da aplicação
document.addEventListener('DOMContentLoaded', main);
