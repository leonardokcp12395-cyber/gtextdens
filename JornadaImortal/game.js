document.addEventListener('DOMContentLoaded', () => {
    // --- DATABASE DE EVENTOS (Onde todos os eventos possíveis vivem) ---
    const events = [
        {
            id: 'found_coin',
            text: 'Enquanto caminhava por uma estrada poeirenta, você avista algo brilhando no chão. É uma moeda de cobre!',
            choices: [
                {
                    text: 'Apanhar a moeda.',
                    effect: (gs) => {
                        gs.resources.money++;
                        return "Você guardou a moeda na sua bolsa.";
                    }
                }
            ],
            condition: (gs) => gs.age > 4
        },
        {
            id: 'study_or_play',
            text: 'O dia está lindo lá fora, perfeito para correr e treinar o corpo. No entanto, um livro antigo sobre táticas de batalha também chama a sua atenção na prateleira.',
            choices: [
                {
                    text: 'Ir treinar lá fora.',
                    effect: (gs) => {
                        gs.attributes.body++;
                        return "Você passou a tarde a correr e a sentir os seus músculos a fortalecerem-se.";
                    }
                },
                {
                    text: 'Ficar e estudar o livro.',
                    effect: (gs) => {
                        gs.attributes.mind++;
                        return "Você mergulhou no livro, e sente que a sua compreensão do mundo ficou um pouco mais nítida.";
                    }
                }
            ],
            condition: (gs) => gs.age > 6
        }
    ];

    // --- ESTADO DO JOGO (Onde todos os dados vivem) ---
    let gameState = {
        age: 0,
        attributes: {
            body: 10,
            mind: 10
        },
        cultivation: {
            realm: 'Mortal',
            level: 1,
            qi: 0,
            maxQi: 100
        },
        resources: {
            money: 10
        },
        lastEventId: null
    };

    // --- ELEMENTOS DA UI (Para não os procurar a toda a hora) ---
    const elements = {
        // Personagem
        age: document.getElementById('char-age'),
        body: document.getElementById('attr-body'),
        mind: document.getElementById('attr-mind'),
        // Cultivo
        realm: document.getElementById('cult-realm'),
        level: document.getElementById('cult-level'),
        qi: document.getElementById('cult-qi'),
        maxQi: document.getElementById('cult-max-qi'),
        // Recursos
        money: document.getElementById('res-money'),
        // Eventos
        eventContent: document.getElementById('event-content'),
        choicesContainer: document.getElementById('choices-container'),
        // Ações
        meditateBtn: document.getElementById('meditate-btn'),
        nextYearBtn: document.getElementById('next-year-btn')
    };

    // --- FUNÇÃO PARA ATUALIZAR A UI ---
    function updateUI() {
        // Painel Personagem
        elements.age.textContent = gameState.age;
        elements.body.textContent = gameState.attributes.body;
        elements.mind.textContent = gameState.attributes.mind;
        // Painel Cultivo
        elements.realm.textContent = gameState.cultivation.realm;
        elements.level.textContent = gameState.cultivation.level;
        elements.qi.textContent = gameState.cultivation.qi;
        elements.maxQi.textContent = gameState.cultivation.maxQi;
        // Painel Recursos
        elements.money.textContent = gameState.resources.money;

        // Atualizar estado do botão de meditação/avanço
        const { cultivation } = gameState;
        if (cultivation.qi >= cultivation.maxQi) {
            elements.meditateBtn.textContent = `Tentar Avanço (Nível ${cultivation.level + 1})`;
            elements.meditateBtn.classList.add('breakthrough-ready');
        } else {
            elements.meditateBtn.textContent = 'Meditar';
            elements.meditateBtn.classList.remove('breakthrough-ready');
        }
    }

    // --- LÓGICA DE EVENTOS ---
    function displayEvent(event) {
        elements.eventContent.innerHTML = `<p>${event.text}</p>`;
        elements.choicesContainer.innerHTML = '';

        event.choices.forEach(choice => {
            const button = document.createElement('button');
            button.textContent = choice.text;
            button.onclick = () => resolveEvent(choice);
            elements.choicesContainer.appendChild(button);
        });

        elements.nextYearBtn.style.display = 'none';
    }

    function resolveEvent(choice) {
        // A implementação completa virá no próximo passo.
        // Por agora, apenas limpamos a UI para o próximo ano.
        const outcomeText = choice.effect(gameState);
        elements.eventContent.innerHTML = `<p>${outcomeText}</p>`;
        elements.choicesContainer.innerHTML = '';
        elements.nextYearBtn.style.display = 'block';
        updateUI();
    }

    // --- LÓGICA DE AÇÕES DO JOGADOR ---
    function tryBreakthrough() {
        const { cultivation } = gameState;
        if (cultivation.qi < cultivation.maxQi) return; // Safeguard

        // Sucesso no avanço
        cultivation.level++;
        cultivation.qi = 0;
        cultivation.maxQi = Math.floor(cultivation.maxQi * 1.5);

        elements.eventContent.innerHTML = `<p><strong>Sucesso!</strong> Você rompeu as suas amarras e alcançou o Nível ${cultivation.level} do Reino ${cultivation.realm}! Sua capacidade de Qi aumentou.</p>`;
        updateUI();
    }

    function meditate() {
        const { cultivation, attributes } = gameState;
        const qiGained = 10 + attributes.mind;
        cultivation.qi = Math.min(cultivation.qi + qiGained, cultivation.maxQi);

        elements.eventContent.innerHTML = `<p>Você senta-se em silêncio e sente o Qi a fluir para o seu corpo. Você ganhou ${qiGained} de Qi.</p>`;
        updateUI();
    }

    function handleMeditateOrBreakthrough() {
        if (gameState.cultivation.qi >= gameState.cultivation.maxQi) {
            tryBreakthrough();
        } else {
            meditate();
        }
    }

    // --- LÓGICA PRINCIPAL DO JOGO ---
    function advanceYear() {
        gameState.age++;

        const availableEvents = events.filter(event => {
            if (gameState.lastEventId === event.id) return false; // Previne evento repetido
            return event.condition(gameState);
        });

        if (availableEvents.length > 0) {
            const event = availableEvents[Math.floor(Math.random() * availableEvents.length)];
            gameState.lastEventId = event.id;
            displayEvent(event);
        } else {
            elements.eventContent.innerHTML = `<p>Você completou ${gameState.age} anos. O tempo passa...</p>`;
        }

        updateUI();
    }

    // --- LIGAÇÃO DOS EVENTOS ---
    elements.nextYearBtn.addEventListener('click', advanceYear);
    elements.meditateBtn.addEventListener('click', handleMeditateOrBreakthrough);

    // --- INICIALIZAÇÃO ---
    console.log("O coração do jogo está a pulsar!");
    updateUI(); // Garante que a UI inicial está correta
});
