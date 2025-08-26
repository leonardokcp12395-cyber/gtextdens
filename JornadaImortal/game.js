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
        resources: {
            money: 10
        },
        lastEventId: null
    };

    // --- ELEMENTOS DA UI (Para não os procurar a toda a hora) ---
    const elements = {
        age: document.getElementById('char-age'),
        body: document.getElementById('attr-body'),
        mind: document.getElementById('attr-mind'),
        money: document.getElementById('res-money'),
        eventContent: document.getElementById('event-content'),
        choicesContainer: document.getElementById('choices-container'),
        nextYearBtn: document.getElementById('next-year-btn')
    };

    // --- FUNÇÃO PARA ATUALIZAR A UI ---
    function updateUI() {
        elements.age.textContent = gameState.age;
        elements.body.textContent = gameState.attributes.body;
        elements.mind.textContent = gameState.attributes.mind;
        elements.money.textContent = gameState.resources.money;
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

    // --- INICIALIZAÇÃO ---
    console.log("O coração do jogo está a pulsar!");
    updateUI(); // Garante que a UI inicial está correta
});
