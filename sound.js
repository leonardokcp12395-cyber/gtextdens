// js/systems/sound.js

import { DEBUG_MODE } from "../config.js";

// O objeto Tone é global, carregado pelo script na index.html
const SoundManager = {
    initialized: false,
    sfx: {},
    bgm: null,

    init() {
        if (this.initialized) return;
        this.initialized = true;

        const masterVolume = new Tone.Volume(-10).toDestination();
        const sfxVolume = new Tone.Volume(-5).connect(masterVolume);
        const bgmVolumeNode = new Tone.Volume(-20).connect(masterVolume);

        // SFX de XP
        this.sfx.xp = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 }, volume: -12 }).connect(sfxVolume);
        
        // SFX de Subir de Nível
        this.sfx.levelUp = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.1, release: 0.3 }, volume: -8 }).connect(sfxVolume);

        // SFX de Dano
        this.sfx.damage = new Tone.NoiseSynth({ noise: { type: "brown" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 }, volume: -3 }).connect(sfxVolume);

        // SFX de Lança
        this.sfx.lance = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 8, envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 }, volume: -15 }).connect(sfxVolume);

        // SFX de Nuke
        this.sfx.nuke = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.01, decay: 0.8, sustain: 0, release: 1 }, volume: 0 }).connect(sfxVolume);

        // SFX de Disparo de Inimigo
        this.sfx.enemyShot = new Tone.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }, volume: -10 }).connect(sfxVolume);

        // SFX de Explosão de Partículas
        this.sfx.particleBurst = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.3 }, volume: -5 }).connect(sfxVolume);

        // SFX de UI Click
        this.sfx.uiClick = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 }, volume: -20 }).connect(sfxVolume);

        // SFX de Aterrissagem
        this.sfx.land = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }, volume: -15 }).connect(sfxVolume);

        // Música de Fundo
        this.bgm = new Tone.Loop(time => {
            const notes = ["C3", "E3", "G3", "A3", "F3", "D3"];
            const synth = new Tone.Synth().connect(bgmVolumeNode);
            synth.triggerAttackRelease(notes[Math.floor(Math.random() * notes.length)], "2n", time);
        }, "2n").start(0);
        
        Tone.Transport.pause();
    },

    async startAudioContext() {
        if (Tone.context.state !== 'running') {
            try {
                await Tone.start();
                Tone.Transport.start();
            } catch (e) {
                if (DEBUG_MODE) console.error("Falha ao iniciar o contexto de áudio:", e);
            }
        }
    },
    
    play(effectName, noteOrDuration = null) {
        this.startAudioContext();
        const sfx = this.sfx[effectName];
        if (sfx) {
            try {
                if (sfx instanceof Tone.NoiseSynth) {
                    sfx.triggerAttackRelease(noteOrDuration || "8n");
                } else if (sfx instanceof Tone.MembraneSynth) {
                    sfx.triggerAttackRelease(noteOrDuration || "C4", "8n");
                } else {
                    sfx.triggerAttackRelease(noteOrDuration || "C5", "8n");
                }
            } catch (e) {
                if (DEBUG_MODE) console.error(`Erro ao reproduzir o efeito sonoro '${effectName}':`, e);
            }
        }
    }
};

export default SoundManager;