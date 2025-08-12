# Sc 1.0 

/assets
    /images        -> sprites, ícones, fundos
    /audio         -> sons e músicas
/css
    style.css      -> estilos gerais
/js
    main.js        -> ponto de entrada do jogo (inicialização e loop principal)
    config.js      -> constantes e parâmetros globais (CONFIG, SKILL_DATABASE, WAVE_CONFIGS)
    entities/
        player.js  -> classe Player
        enemy.js   -> classes de inimigos
        platform.js-> classe Platform
        projectile.js -> projéteis
        vortex.js  -> vórtices e áreas de efeito
    systems/
        sound.js   -> SoundManager
        ui.js      -> menus, HUD e interações
        pooling.js -> createPool, getFromPool, releaseToPool
        skills.js  -> lógica de habilidades
        waves.js   -> spawn de inimigos e configuração de ondas
        save.js    -> loadPermanentData, savePermanentData
index.html
