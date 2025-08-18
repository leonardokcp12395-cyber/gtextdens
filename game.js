document.addEventListener('DOMContentLoaded', () => {
    // --- CACHE DE ELEMENTOS DO DOM ---
    const elements = {
        name: document.getElementById('char-name'),
        age: document.getElementById('char-age'),
        attrBody: document.getElementById('attr-body'),
        attrMind: document.getElementById('attr-mind'),
        attrSoul: document.getElementById('attr-soul'),
        attrLuck: document.getElementById('attr-luck'),
        cultRealm: document.getElementById('cult-realm'),
        cultQi: document.getElementById('cult-qi'),
        resMoney: document.getElementById('res-money'),
        resReputation: document.getElementById('res-reputation'),
        inventoryList: document.getElementById('inventory-list'),
        relationshipsList: document.getElementById('relationships-list'),
        eventText: document.getElementById('event-text'),
        choicesContainer: document.getElementById('choices-container'),
        nextYearBtn: document.getElementById('next-year-btn')
    };

    // --- ESTADO INICIAL DO JOGO ---
    let gameState = {
        age: 0,
        attributes: { body: 10, mind: 10, soul: 10, luck: 5 },
        cultivation: { realm: "Mortal", qi: 0, qiMax: 100 },
        resources: { money: 10, reputation: "Neutra" },
        inventory: [],
        relationships: []
    };

    // --- BANCO DE DADOS DE EVENTOS (MVP) ---
    const events = [
        {
            age: 3,
            text: "Você começa a andar e balbuciar suas primeiras palavras. Seus pais notam sua curiosidade.",
            choices: [
                {
                    text: "Tentar explorar o quintal.",
                    action: () => {
                        gameState.attributes.body += 1;
                        return "Sua pequena aventura fortalece seu corpo. (+1 Corpo)";
                    }
                },
                {
                    text: "Ouvir atentamente as conversas dos adultos.",
                    action: () => {
                        gameState.attributes.mind += 1;
                        return "Você absorve conhecimento, aguçando sua mente. (+1 Mente)";
                    }
                }
            ]
        },
        {
            age: 5,
            text: "Um velho monge viajante passa pela sua vila. Ele olha para você com um brilho nos olhos e diz: 'Jovem, vejo um potencial extraordinário em você. Mas o caminho do cultivo é árduo. O que você fará?'",
            choices: [
                {
                    text: "Pedir para se tornar seu discípulo.",
                    action: () => {
                        if (Math.random() > 0.5) { // 50% de chance
                            gameState.inventory.push("Técnica de Respiração Básica");
                            gameState.cultivation.qi += 5;
                            return "O monge ri e lhe ensina os fundamentos da respiração. Você sente o Qi pela primeira vez! (+5 Qi, ganhou Técnica de Respiração Básica)";
                        } else {
                            gameState.attributes.luck += 1;
                            return "O monge ri, diz que ainda é cedo, e lhe dá um doce. (+1 Sorte)";
                        }
                    }
                },
                {
                    text: "Ignorá-lo.",
                    action: () => "Você o ignora. O monge suspira e continua seu caminho. Uma oportunidade foi perdida."
                }
            ]
        },
        {
            age: 8,
            text: "Durante uma brincadeira, você tropeça e cai perto de um riacho. Algo brilhante chama sua atenção na lama.",
            choices: [
                {
                    text: "Pegar o objeto brilhante.",
                    action: () => {
                        gameState.resources.money += 5;
                        return "É uma moeda de prata! Você a guarda cuidadosamente. (+5 Moedas)";
                    }
                },
                {
                    text: "Ignorar e voltar para casa.",
                    action: () => "Você decide não se sujar e volta para casa. A imagem do brilho permanece em sua mente."
                }
            ]
        }
    ];

    // --- FUNÇÕES PRINCIPAIS ---

    /** Atualiza toda a UI com base no gameState atual */
    function updateUI() {
        elements.age.textContent = gameState.age;
        elements.attrBody.textContent = gameState.attributes.body;
        elements.attrMind.textContent = gameState.attributes.mind;
        elements.attrSoul.textContent = gameState.attributes.soul;
        elements.attrLuck.textContent = gameState.attributes.luck;
        elements.cultRealm.textContent = gameState.cultivation.realm;
        elements.cultQi.textContent = `${gameState.cultivation.qi} / ${gameState.cultivation.qiMax}`;
        elements.resMoney.textContent = `${gameState.resources.money} Moedas de Cobre`;
        elements.resReputation.textContent = gameState.resources.reputation;

        updateList(elements.inventoryList, gameState.inventory);
        updateList(elements.relationshipsList, gameState.relationships);
    }

    /** Helper para atualizar listas na UI */
    function updateList(listElement, items) {
        listElement.innerHTML = '';
        if (items.length === 0) {
            listElement.innerHTML = '<li>Nenhum</li>';
        } else {
            items.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                listElement.appendChild(li);
            });
        }
    }

    /** Mostra um evento e suas escolhas na UI */
    function showEvent(event) {
        elements.eventText.textContent = event.text;
        elements.choicesContainer.innerHTML = '';

        event.choices.forEach(choice => {
            const button = document.createElement('button');
            button.textContent = choice.text;
            button.onclick = () => {
                const resultText = choice.action();
                elements.eventText.textContent = resultText;
                elements.choicesContainer.innerHTML = '';
                elements.nextYearBtn.style.display = 'block';
                updateUI();
            };
            elements.choicesContainer.appendChild(button);
        });

        elements.nextYearBtn.style.display = 'none';
    }

    /** Ação principal do botão "Avançar Ano" */
    function advanceYear() {
        gameState.age++;
        // Ganho passivo de Qi por ano (placeholder)
        if (gameState.inventory.includes("Técnica de Respiração Básica")) {
            gameState.cultivation.qi += 2;
        } else {
            gameState.cultivation.qi += 1;
        }

        const currentEvent = events.find(event => event.age === gameState.age);

        if (currentEvent) {
            showEvent(currentEvent);
        } else {
            elements.eventText.textContent = `Você passou um ano tranquilo meditando e treinando. Nada de extraordinário aconteceu.`;
        }

        updateUI();
    }

    // --- INICIALIZAÇÃO ---
    elements.nextYearBtn.addEventListener('click', advanceYear);
    updateUI(); // Exibe o estado inicial do jogo
});
