// src/content/mayorDialogue.ts
//
// Banque de phrases du Maire. Centralisée pour pouvoir varier facilement.
// Tutoiement systématique. Ludique côté UI, jamais sur les chiffres.

import type { MayorMood } from '../components/Mayor';

export interface MayorLine {
  mood: MayorMood;
  text: string;
}

export const mayorLines = {
  // ─── LANDING ──────────────────────────────────────────────────────────
  landing: {
    mood: 'welcome',
    text: "Salut. Je m'occupe de ta ville depuis trois récessions, et je n'ai perdu personne. On commence ?",
  } as MayorLine,

  // ─── ONBOARDING (4 étapes) ────────────────────────────────────────────
  onboarding: [
    {
      mood: 'welcome',
      text: "Je suis le Maire. Pendant trente secondes, je te montre ta ville. Trois étapes, pas plus. Tu pourras toujours me rappeler depuis le bouton en haut à droite.",
    },
    {
      mood: 'point',
      text: "Ta ville, c'est ton portefeuille. Chaque immeuble est une ligne. Sa taille, c'est l'exposition. Sa couleur, la classe d'actifs. Tout ce que tu vois ici est vrai et à jour.",
    },
    {
      mood: 'neutral',
      text: "À gauche, le détail par classe d'actifs. Click sur un quartier pour zoomer dessus. Les chantiers en bas sont les échéances proches.",
    },
    {
      mood: 'cheer',
      text: "Construis. Démolis. Réorganise. Cette barre, c'est ta boîte à outils. Tu peux toujours annuler — je note tout.",
    },
  ] as MayorLine[],

  onboardingDone: {
    mood: 'cheer',
    text: "Tu es prêt. Si tu hésites, clique sur moi, je suis là.",
  } as MayorLine,

  // ─── ÉVÉNEMENTS ───────────────────────────────────────────────────────
  firstDeposit: {
    mood: 'cheer',
    text: "Ta première ligne est posée. Bien joué. La ville commence à respirer.",
  } as MayorLine,

  upcomingMaturity: {
    mood: 'point',
    text: "Trois chantiers à clôturer cette semaine, dont deux à risque modéré. Je peux t'en lister les détails.",
  } as MayorLine,

  demolitionRisk: {
    mood: 'concern',
    text: "Hmm. Un immeuble du quartier Distressed perd de la hauteur. Je t'ouvre le dossier ?",
  } as MayorLine,

  positiveVariation: {
    mood: 'cheer',
    text: "Bien joué. Ton ratio s'est amélioré de 0.3 point cette semaine.",
  } as MayorLine,

  demolitionDone: {
    mood: 'neutral',
    text: "C'est plié. Ligne fermée, ville plus propre. On passe à la suivante ?",
  } as MayorLine,

  errorImpossible: {
    mood: 'concern',
    text: "Ça ne va pas marcher comme ça. La ligne dépasse l'allocation du quartier — il faut soit redimensionner, soit changer de quartier.",
  } as MayorLine,
};

// ─── LEXIQUE FINANCE → VILLE ────────────────────────────────────────────
// Pour traduire les termes métier en termes ludiques dans l'UI.
// Côté chiffres on garde le terme métier ; côté UI on peut alterner.

export const cityLexicon = {
  portfolio:    'ville',
  assetClass:   'quartier',
  issuer:       'citoyen',
  position:     'immeuble',
  exposure:     'taille',
  maturity:     'échéance',
  default:      'démolition',
  newPosition:  'construction',
  rebalance:    'urbanisme',
  manager:      'maire',
  riskMatrix:   "plan d'urbanisme",
  pnl:          'santé de la ville',
} as const;
