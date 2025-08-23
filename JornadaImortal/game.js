document.addEventListener('DOMContentLoaded', () => {
    // --- VARIÁVEIS GLOBAIS ---
    let gameState = {};
    let allGameData = {};
    let allStrings = {};

    // --- ELEMENTOS DA UI ---
    const elements = {
        age: document.getElementById('char-age'),
        body: document.getElementById('attr-body'),
        mind: document.getElementById('attr-mind'),
        money: document.getElementById('res-money'),
        eventContent: document.getElementById('event-content'),
        choicesContainer: document.getElementById('choices-container'),
        nextYearBtn: document.getElementById('next-year-btn')
    };

    // --- FUNÇÃO DE CARREGAMENTO DE DADOS (Já a tens, está perfeita) ---
    async function loadGameData() {
        try {
            const [eventsRes, itemsRes, sectsRes, enemiesRes, talentsRes, stringsRes] = await Promise.all([
                fetch('events.json'),
                fetch('items.json'),
                fetch('sects.json'),
                fetch('enemies.json'),
                fetch('talents.json'),
                fetch('strings.json')
                // Nota: random_events.json será usado numa fase futura
            ]);

            allGameData = {
                events: await eventsRes.json(),
                items: await itemsRes.json(),
                sects: await sectsRes.json(),
                enemies: await enemiesRes.json(),
                talents: await talentsRes.json()
            };
            allStrings = await stringsRes.json();

            console.log("Dados do jogo carregados!", allGameData);
            initializeGame();
        } catch (error) {
            console.error("Falha ao carregar os dados do jogo:", error);
        }
    }

    // --- FUNÇÃO PARA APLICAR EFEITOS (NOVA!) ---
    // Esta função lê os efeitos de uma escolha e atualiza o estado do jogo.
    function applyEffects(effects) {
        if (!effects) return; // Se não houver efeitos, não faz nada.

        // Atualiza os atributos
        if (effects.attributes) {
            for (const attr in effects.attributes) {
                if (gameState.attributes.hasOwnProperty(attr)) {
                    gameState.attributes[attr] += effects.attributes[attr];
                }
            }
        }
        // Atualiza os recursos
        if (effects.resources) {
            for (const res in effects.resources) {
                if (gameState.resources.hasOwnProperty(res)) {
                    gameState.resources[res] += effects.resources[res];
                }
            }
        }
        // No futuro, adicionaremos aqui a lógica para itens, relações, etc.
    }

    // --- FUNÇÃO PARA MOSTRAR UM EVENTO (ATUALIZADA!) ---
    // Agora, a lógica onclick está preenchida.
    function showEvent(event) {
        elements.eventContent.innerHTML = `<p>${event.text}</p>`;
        elements.choicesContainer.innerHTML = ''; // Limpa as escolhas antigas

        event.choices.forEach(choice => {
            const button = document.createElement('button');
            button.textContent = choice.text;

            // A MÁGICA ACONTECE AQUI!
            button.onclick = () => {
                // 1. Aplica os efeitos da escolha ao estado do jogo
                applyEffects(choice.effects);

                // 2. Procura o texto de resultado no ficheiro de strings
                const resultText = allStrings[choice.resultKey] || "Chave de texto não encontrada: " + choice.resultKey;
                elements.eventContent.innerHTML = `<p>${resultText}</p>`;

                // 3. Limpa os botões de escolha para o jogador não poder clicar de novo
                elements.choicesContainer.innerHTML = '';

                // 4. Mostra o botão de avançar o ano novamente
                elements.nextYearBtn.style.display = 'block';

                // 5. Atualiza todos os valores na UI
                updateUI();
            };

            elements.choicesContainer.appendChild(button);
        });

        elements.nextYearBtn.style.display = 'none'; // Esconde "Avançar Ano" enquanto o jogador decide
    }

    // --- FUNÇÃO PARA ATUALIZAR A UI (Sem alterações) ---
    function updateUI() {
        elements.age.textContent = gameState.age;
        elements.body.textContent = gameState.attributes.body;
        elements.mind.textContent = gameState.attributes.mind;
        elements.money.textContent = gameState.resources.money;
    }

    // --- LÓGICA PRINCIPAL DO JOGO (ATUALIZADA!) ---
    // Agora, procura por um evento a cada ano.
    function advanceYear() {
        gameState.age++;

        // Procura no array de eventos se existe um para a idade atual
        const eventForAge = allGameData.events.find(event => event.age === gameState.age);

        if (eventForAge) {
            // Se encontrar, mostra o evento!
            showEvent(eventForAge);
        } else {
            // Se não houver evento fixo, mostra um texto padrão.
            elements.eventContent.innerHTML = `<p>Você completou ${gameState.age} anos. O tempo passa em meditação e treino.</p>`;
        }

        updateUI();
    }

    // --- FUNÇÃO DE INICIALIZAÇÃO (ATUALIZADA!) ---
    function initializeGame() {
        gameState = {
            age: 0,
            attributes: { body: 10, mind: 10, soul: 10, luck: 5 }, // Adicionei os outros atributos
            resources: { money: 10, reputation: 0, talentPoints: 0 }
            // O resto do estado do jogo virá depois
        };

        elements.nextYearBtn.addEventListener('click', advanceYear);

        console.log("O jogo começou!");
        updateUI();
    }

    // --- PONTO DE PARTIDA ---
    loadGameData();
});
