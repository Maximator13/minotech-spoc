// Source unique du contenu du site MinOtech SPOC. Données pures : aucune fonction, aucun DOM.
// Les chiffres affichés sont ceux du CDC CEA ; tout statut 'valide' exige une preuve (evidence).
// Faits techniques : architecture de conception détaillée (juin 2026), en révision depuis le 15/09/2026,
// source : voir v2/README.md. Choix de conception, jamais résultats.

export const siteConfig = {
  baseUrl: 'https://maximator13.github.io/minotech-spoc',
  contactEmail: '',
  linkedinUrl: '',
  formspreeId: '',
  analytics: { enabled: false, src: '', domain: '' },
  searchConsoleToken: '',
  legal: { editeur: '', directeurPublication: '', adresse: '' },
};

export const STATUS = {
  'a-venir': { label: 'À venir', tone: 'muted' },
  'en-cours': { label: 'En cours', tone: 'warn' },
  'realise': { label: 'Réalisé', tone: 'ok' }, // période terminée, livrable daté (jalons) ; pas une validation
  'valide': { label: 'Validé', tone: 'ok' }, // preuve référencée obligatoire ; jamais pour les jalons
};

const poles = {
  heph: {
    key: 'heph',
    name: 'HÉPHAÏSTOS',
    domain: 'Pôle Mécanique',
    logo: 'assets/logos/logo_hephaistos-320.webp',
    lead: 'Maelan HERVÉ',
    summary: 'Conception du bâti, du module linéaire, du module de planéité, des préhenseurs et de l\'interface porteur.',
    highlights: [
      'Module linéaire de 300 mm conçu par l\'équipe : vis Igus drylin, rails inox HPC, moteur Nema 23 et courroie',
      'Module de planéité à deux vérins électriques et rotule, orientation réglable ± 5°',
      'Trois préhenseurs interchangeables pour sondes carrées et cylindriques',
      'Fixation porteur symétrique : sol, mur et plafond',
    ],
  },
  zeus: {
    key: 'zeus',
    name: 'ZEUS',
    domain: 'Pôle Électronique',
    logo: 'assets/logos/logo_zeus-320.webp',
    lead: 'Zinedine DJADJA',
    summary: 'Architecture électrique, cartes, capteurs et contrôle temps réel.',
    highlights: [
      'Raspberry Pi 5 et microcontrôleur ESP32 temps réel reliés par SPI',
      'Caméra de profondeur Intel RealSense D435 et centrale inertielle BMI270 (choix en révision)',
      'Distribution 24 V / 5 V / 3,3 V, batterie LiFePO4 24 V dimensionnée pour 8 h',
      'Deux schémas KiCad : alimentation, capteurs et drivers',
    ],
  },
  hermes: {
    key: 'hermes',
    name: 'HERMES',
    domain: 'Pôle Informatique',
    logo: 'assets/logos/logo_hermes-320.webp',
    lead: 'Noémie BEKHIT',
    summary: 'Logiciel embarqué, échanges réseau, base de données et poste de pilotage.',
    highlights: [
      'Logiciel embarqué et application de pilotage en Java sur Raspberry Pi OS',
      'Échanges Wi-Fi UDP et TCP, trames TLV, heartbeat 100 ms',
      'Base SQLite sur SSD, rapports PDF et JSON',
      'Choix du système, de la base et de l\'environnement (Java ou ROS) en révision',
    ],
  },
};

const member = (name, role, pole, demiGroupe, isLead, slug, bio) =>
  ({ name, role, pole, demiGroupe, isLead, photo: 'assets/team/' + slug, bio });

const team = [
  member('Evan MENANTEAU', 'Chef de projet (3A) · Pôle Électronique', 'zeus', 'G1', false, 'evan_menanteau',
    'Coordonne les trois pôles, le calendrier des périodes et la relation avec le CEA Marcoule. Membre du pôle électronique depuis la 2e année.'),
  member('Adrien MEGEVAND', 'Responsable IVTV · Pôle Électronique', 'zeus', 'G1', false, 'adrien_megevand',
    'Responsable de l\'intégration, de la vérification, des tests et de la validation depuis la 2e année : matrice de conformité, plan de validation et banc d\'essai.'),
  member('Mathurin GAZEAU', 'Ingénieur Électronique & Puissance', 'zeus', 'G1', false, 'mathurin_elec',
    'A rejoint l\'équipe en septembre 2026. Participe à la révision de la conception électronique (cartes, capteurs) en vue de la fabrication.'),
  member('Noémie BEKHIT', 'Cheffe du Pôle Informatique & IHM', 'hermes', 'G1', true, 'noemie_info',
    'A rejoint MinOtech en septembre 2026. Pilote la révision des choix logiciels (système, base de données, Java ou ROS) et le poste de pilotage.'),
  member('Zinedine DJADJA', 'Chef du Pôle Électronique & Capteurs', 'zeus', 'G1', true, 'zineddine_djadja',
    'Dirige le pôle électronique depuis la 2e année : distribution 24 V / 5 V / 3,3 V, schémas KiCad des cartes alimentation et capteurs, chaîne de sécurité.'),
  member('Alexis FOURQUIER', 'Ingénieur Réseaux & Systèmes Embarqués', 'hermes', 'G1', false, 'alexis_info',
    'A rejoint l\'équipe en septembre 2026. Travaille sur les échanges réseau et le poste de pilotage.'),
  member('Marouane EL ALAOUI', 'Ingénieur Mécanique & Cinématique', 'heph', 'G1', false, 'marouanne_meca',
    'A rejoint l\'équipe en septembre 2026. Participe à la finalisation des préhenseurs et des interfaces mécaniques en 3e année.'),
  member('Maelan HERVÉ', 'Chef du Pôle Mécanique & CAO', 'heph', 'G2', true, 'maelan_herve',
    'Dirige le pôle mécanique depuis la 2e année : auteur des mises en plan de juin 2026, module linéaire, module de planéité et demandes de devis.'),
  member('Kilian PARISI', 'Ingénieur Mécanique · Responsable achats (3A)', 'heph', 'G2', false, 'killian_parisi',
    'Vérification des mises en plan, guidage linéaire ; suit les devis et les achats de l\'équipe en 3e année.'),
  member('Victor GOYA', 'Ingénieur Mécanique · Responsable banc d\'essais (3A)', 'heph', 'G2', false, 'victor_goya',
    'Recherche et intégration des composants du commerce, vérification des plans ; responsable du banc d\'essais modulaire sol, mur et plafond.'),
  member('Maxime COQUET', 'Ingénieur Mécanique · Responsable communication (3A)', 'heph', 'G2', false, 'maxime_meca',
    'A rejoint l\'équipe en septembre 2026. Responsable de la communication (site, publications par période) ; participe à la fabrication.'),
  member('Thomas TAGLIALAVORE MORENO', 'Ingénieur Électronique & Alimentation', 'zeus', 'G2', false, 'thomas_taglialavore',
    'Membre du Groupe 10 depuis la 1re année ; chaîne d\'alimentation 24 V et sécurités matérielles.'),
  member('Léo RÉGINARD', 'Ingénieur Informatique · Responsable planning (3A)', 'hermes', 'G2', false, 'leo_reginard',
    'Chef de projet de l\'équipe en 2e année ; architecture logicielle embarquée et diagrammes UML ; tient le planning en 3e année.'),
  member('Melvin PATEUX', 'Ingénieur Informatique & Télémétrie', 'hermes', 'G2', false, 'melvin_pateux',
    'Responsable du pôle informatique en 2e année ; logiciel embarqué Java, échanges UDP et TCP, télémétrie et dépôt Git.'),
];

// Numéros de besoin repris du CDC (docs/extracted_pdf.txt).
// La charge utile (masse du capteur, jusqu'à 50 kg) est dans la section « performances » du CDC,
// dont la numérotation repart de BESOIN. 1 : l'équipe la numérote B32 pour éviter le doublon avec le BESOIN. 1 initial
// (le B32 du CDC lui-même concerne l'environnement).
// `method` : méthode de vérification prévue au plan de validation, jamais une preuve ; `evidence` reste vide tant qu'aucun essai n'a eu lieu.
const requirements = [
  { id: 'B29', label: 'Consigne de distance capteur / surface', value: '5 mm – 30 cm', method: 'Consignes 5 mm et 300 mm, mesure au pied à coulisse' },
  { id: 'B30', label: 'Précision de distance', value: '± 1 mm', method: 'Mesure au pied à coulisse numérique' },
  { id: 'B31', label: 'Parallélisme', value: '± 1°', method: 'Deux distances aux extrémités, angle déduit' },
  { id: 'B32', label: 'Charge utile (numérotation équipe)', value: '≤ 50 kg', method: 'Pesée des maquettes de capteurs' },
  { id: 'B14', label: 'Autonomie continue', value: '≥ 8 h', method: 'Suivi de la charge batterie sur la séance d\'essai' },
].map((r) => ({ ...r, source: 'CDC CEA', status: 'a-venir', evidence: '' }));

// 'realise' / « Soutenu » = période terminée et livrable daté ; 'valide' est réservé aux preuves référencées.
const milestones = [
  { sem: '1re année 2024-2025', title: 'Besoin, exigences et architectures', status: 'realise', statusLabel: 'Réalisé',
    desc: 'Cahier des charges du CEA (octobre 2024), référentiel d\'exigences, analyse de mission et architectures fonctionnelles et logiques ; soutenance en juin 2025.' },
  { sem: 'Période 7.1 · oct.-nov. 2025', title: 'Du système global au démonstrateur', status: 'realise', statusLabel: 'Réalisé',
    desc: 'Matrice de conformité du démonstrateur, plan de validation, cahier des charges du banc d\'essai, premières revues techniques.' },
  { sem: 'Période 7.2 · déc. 2025-févr. 2026', title: 'Conception préliminaire', status: 'realise', statusLabel: 'Soutenu',
    desc: 'Choix du calculateur et du microcontrôleur temps réel, module linéaire de 300 mm, planéité par vérins et rotule ; dossier et soutenance le 6 février 2026.' },
  { sem: 'Période 8.1 · mars-avril 2026', title: 'Conception détaillée', status: 'realise', statusLabel: 'Réalisé',
    desc: 'Bâti optimisé à deux vérins et rotule, bilan de puissance, schémas KiCad initiés, réseau UDP et TCP, base SQLite.' },
  { sem: 'Période 8.2 · mai-juin 2026', title: 'Dossier de conception détaillée', status: 'realise', statusLabel: 'Soutenu',
    desc: 'Mises en plan, nomenclature, flyer et dossier rendus le 22 juin ; soutenance le 25 juin 2026.' },
  { sem: 'Période 9.1 · sept.-oct. 2026', title: 'Préparation de la fabrication', status: 'en-cours', statusLabel: 'En cours',
    desc: 'Révision de la conception, références des pièces, demandes de devis et achats, maquette 3D.' },
  { sem: 'Période 9.2 · nov.-déc. 2026', title: 'Fabrication et intégration', status: 'a-venir', statusLabel: 'À venir',
    desc: 'Fabrication, intégration, premiers essais et banc d\'essais.' },
  { sem: 'Période 9.3 · févr.-mars 2027', title: 'Essais et qualification', status: 'a-venir', statusLabel: 'À venir',
    desc: 'Essais, qualification opérationnelle avec le CEA et dossier de livraison ; soutenance en mars 2027.' },
];

// Exemples de capteurs cités par le CEA : familles seulement, aucune masse ni performance (le CDC n'en donne pas par capteur).
const sensors = [
  { name: 'Sonde Alpha ZnS(Ag)', type: 'Rayonnement alpha',
    desc: 'Scintillateur ZnS(Ag) cité par le CDC pour la mesure du rayonnement alpha.' },
  { name: 'Sonde NaI(Tl)', type: 'Rayonnement gamma',
    desc: 'Scintillateur NaI(Tl) cité par le CDC pour la mesure du rayonnement gamma.' },
  { name: 'Sonde EJ200', type: 'Rayonnement bêta',
    desc: 'Scintillateur EJ200 cité par le CDC pour la mesure du rayonnement bêta.' },
  { name: 'Détecteur BEGe', type: 'Spectrométrie',
    desc: 'Détecteur BEGe cité par le CDC pour la spectrométrie des rayonnements.' },
];

const media = {
  hero: null, // schéma inline dans index.html
  showcase: {
    team: {
      type: 'image',
      src: 'assets/photo-groupe-960.webp',
      srcset: 'assets/photo-groupe-480.webp 480w, assets/photo-groupe-960.webp 960w, assets/photo-groupe-1200.webp 1200w, assets/photo-groupe-1600.webp 1600w',
      sizes: '(min-width: 1152px) 1104px, 100vw',
      width: 1600,
      height: 1200,
      alt: 'Photo de groupe des 14 apprentis ingénieurs de l\'équipe MinOtech',
    },
    robot: {
      type: 'svg',
      src: 'assets/tech/prototype_robot_schema.svg',
      width: 1600,
      height: 900,
      alt: 'Schéma du SPOC : module linéaire de 300 mm, module de planéité à deux vérins et rotule, préhenseur et caméra de profondeur face à la paroi',
    },
    system: {
      type: 'svg',
      src: 'assets/tech/architecture_systeme_schema.svg',
      width: 1600,
      height: 900,
      alt: 'Schéma de l\'architecture : caméra et capteurs, ESP32 temps réel, Raspberry Pi 5, liaison Wi-Fi UDP/TCP et poste de pilotage',
    },
  },
  solution: {
    type: 'svg',
    src: 'assets/tech/architecture_systeme_schema.svg',
    width: 1600,
    height: 900,
    alt: 'Schéma de l\'architecture : caméra et capteurs, ESP32 temps réel, Raspberry Pi 5, liaison Wi-Fi UDP/TCP et poste de pilotage',
  },
};

export const projectData = { poles, team, sensors, requirements, milestones, media };
