export const GAME_IMAGE_URLS = [
  "./assets/images/currency128_Coin.png",
  "./assets/images/tittleRibbon_Yellow.png",
  "./assets/images/tittleRibbon_Red.png",
];

export const GAME_POP_SOUND_FILES = [
  "oga-pop1.ogg",
  "oga-pop3.ogg",
  "oga-pop4.ogg",
  "oga-pop5.ogg",
  "oga-pop6.ogg",
  "oga-pop7.ogg",
  "oga-pop8.ogg",
  "oga-pop9.ogg",
  "oga-pop10.ogg",
];

export const GAME_POP_SOUND_URLS = GAME_POP_SOUND_FILES.map((file) => `./assets/audio/pop/${file}`);

export const GAME_UI_AUDIO_URLS = [
  "./assets/audio/pop/click.wav",
  "./assets/audio/pop/gain_coin.wav",
];

export const GAME_AUDIO_URLS = [...GAME_POP_SOUND_URLS, ...GAME_UI_AUDIO_URLS];