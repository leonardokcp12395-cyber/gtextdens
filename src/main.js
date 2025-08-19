import { initializeGameState, setGameData, loadGame } from './state.js';
import { initializeGame } from './game.js';

/**
 * Carrega todos os dados do jogo a partir dos arquivos JSON.
 * @returns {Promise<Object>} Uma promessa que resolve com um objeto contendo todos os dados do jogo.
 */
async function loadGameData() {
    const dataSources = ['strings', 'events', 'items', 'sects', 'enemies', 'random_events', 'regions', 'talents'];
    // Ajuste no caminho para refletir a estrutura de pastas correta
    const dataPromises = dataSources.map(source => fetch(`data/${source}.json`));

    try {
        const responses = await Promise.all(dataPromises);
        // Verifica se todas as respostas da rede foram bem-sucedidas
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
        // TODO: Exibir uma mensagem de erro amigável na UI
        return null;
    }
}

/**
 * Função principal que inicializa o jogo.
 */
async function main() {
    const gameData = await loadGameData();
    if (gameData) {
        // Define o estado inicial do jogador
        initializeGameState();
        // Carrega o progresso salvo, se houver
        loadGame();
        // Passa os dados carregados para o módulo de estado
        setGameData(gameData);
        // Inicia os listeners do jogo
        initializeGame(gameData);
    }
}

// Ponto de entrada da aplicação
document.addEventListener('DOMContentLoaded', main);
