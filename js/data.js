// Source unique du contenu du site MinOtech SPOC. Données pures : aucune fonction, aucun DOM.
// Les chiffres affichés sont ceux du CDC CEA ; tout statut 'valide' exige une preuve (evidence).

export const siteConfig = {
  baseUrl: 'https://minotech-spoc.vercel.app',
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
  'valide': { label: 'Validé', tone: 'ok' },
};

const poles = {
  heph: {
    key: 'heph',
    name: 'HÉPHAÏSTOS',
    domain: 'Pôle Mécanique & Cinématique',
    logo: 'assets/logos/logo_hephaistos-320.webp',
    lead: 'Maelan HERVÉ',
    summary: "Conception de la cinématique, du module de translation et des interfaces décontaminables.",
    highlights: [
      'Module linéaire de translation Rollon à vis à billes',
      'Rotule de parallélisme multi-angles pour les configurations sol, mur et plafond',
      'Préhenseurs modulaires adaptés aux géométries cubiques et cylindriques des sondes',
    ],
  },
  zeus: {
    key: 'zeus',
    name: 'ZEUS',
    domain: 'Pôle Électronique & Énergie',
    logo: 'assets/logos/logo_zeus-320.webp',
    lead: 'Zinedine DJADJA',
    summary: "Architecture de puissance, contrôle temps réel microcontrôlé et instrumentation multi-capteurs ToF.",
    highlights: [
      'Capteurs ToF laser et caméra de profondeur pour mesurer la distance à la paroi',
      'Contrôle temps réel sur microcontrôleur STM32, interfacé sur bus CAN et I2C',
    ],
  },
  hermes: {
    key: 'hermes',
    name: 'HERMES',
    domain: 'Pôle Informatique, Réseaux & Supervision',
    logo: 'assets/logos/logo_hermes-320.webp',
    lead: 'Noémie BEKHIT',
    summary: "Système embarqué, réseau de transmission et poste de pilotage IHM pour le CEA.",
    highlights: [
      'Interface Homme-Machine (IHM) de supervision et de téléopération pour les opérateurs',
    ],
  },
};

const member = (name, role, pole, demiGroupe, isLead, slug, bio) =>
  ({ name, role, pole, demiGroupe, isLead, photo: 'assets/team/' + slug, bio });

const team = [
  member('Evan MENANTEAU', 'Chef de Projet MinOtech', 'zeus', 'G1', false, 'evan_menanteau',
    "Pilote l'ensemble du projet MinOtech, planifie les jalons semestriels, coordonne les 3 pôles techniques et assure la relation avec la maîtrise d'ouvrage du CEA Marcoule."),
  member('Adrien MEGEVAND', 'Responsable IVTV & Pôle Électronique', 'zeus', 'G1', false, 'adrien_megevand',
    "Responsable des protocoles d'Intégration, Vérification, Test et Validation (IVTV). Suit la conformité du prototype aux exigences du cahier des charges CEA."),
  member('Mathurin GAZEAU', 'Ingénieur Électronique & Puissance', 'zeus', 'G1', false, 'mathurin_elec',
    'Intégration et conditionnement des capteurs ToF laser, filtrage des bus I2C/CAN et interfaçage avec les microcontrôleurs STM32.'),
  member('Noémie BEKHIT', 'Cheffe du Pôle Informatique & IHM', 'hermes', 'G1', true, 'noemie_info',
    "Coordonne l'architecture logicielle sur Raspberry Pi 5, la supervision temps réel, la communication réseau avec l'IHM et l'acquisition des sondes radiologiques."),
  member('Zinedine DJADJA', 'Chef du Pôle Électronique & Capteurs', 'zeus', 'G1', true, 'zineddine_djadja',
    "Pilote la conception de l'architecture électrique en étoile, la régulation des tensions, les schémas de câblage PCB et la sécurité de puissance."),
  member('Alexis FOURQUIER', 'Ingénieur Réseaux & Systèmes Embarqués', 'hermes', 'G1', false, 'alexis_info',
    "Conçoit l'Interface Homme-Machine (IHM) tactile de téléopération pour les opérateurs du CEA et l'affichage des cartographies radiologiques."),
  member('Marouane EL ALAOUI', 'Ingénieur Mécanique & Cinématique', 'heph', 'G1', false, 'marouanne_meca',
    'Conçoit les préhenseurs modulaires adaptés aux géométries cylindriques et cubiques des sondes radiologiques, avec des surfaces décontaminables.'),
  member('Maelan HERVÉ', 'Chef du Pôle Mécanique & CAO', 'heph', 'G2', true, 'maelan_herve',
    "Supervise la cinématique, le module linéaire de translation Rollon, la modélisation CAO et l'intégration mécanique sur le robot porteur."),
  member('Kilian PARISI', 'Ingénieur Mécanique & Guidage Rollon', 'heph', 'G2', false, 'killian_parisi',
    'Fabrication atelier, usinage des préhenseurs de capteurs et montage du module linéaire de translation Rollon.'),
  member('Victor GOYA', 'Ingénieur Mécanique & Intégration', 'heph', 'G2', false, 'victor_goya',
    'Modélisation cinématique, dimensionnement des liaisons rotules, simulation des contraintes de charge utile et intégration sur porteur chenillé.'),
  member('Maxime COQUET', 'Ingénieur Mécanique & Préhenseurs', 'heph', 'G2', false, 'maxime_meca',
    "Développe le banc d'essai, ajuste les guidages Rollon et instrumente les futurs essais de charge."),
  member('Thomas TAGLIALAVORE MORENO', 'Ingénieur Électronique & ToF', 'zeus', 'G2', false, 'thomas_taglialavore',
    "Architecture de puissance, dimensionnement du pack batterie Li-Ion pour l'autonomie demandée par le CDC et sécurités matérielles."),
  member('Léo RÉGINARD', 'Ingénieur Informatique & Linux RT', 'hermes', 'G2', false, 'leo_reginard',
    "Développe les algorithmes d'asservissement en boucle fermée pour le maintien de la distance et du parallélisme à la paroi."),
  member('Melvin PATEUX', 'Ingénieur Informatique & Télémétrie', 'hermes', 'G2', false, 'melvin_pateux',
    'Configure Linux temps réel sur Raspberry Pi 5, met en place les serveurs de communication TCP/IP et la télémétrie des mesures.'),
];

// Numéros de besoin repris du CDC (docs/extracted_pdf.txt).
// La charge utile (masse du capteur, jusqu'à 50 kg) est dans la section « performances » du CDC,
// dont la numérotation repart de BESOIN. 1 : id sans numéro pour éviter le doublon avec le BESOIN. 1 initial.
const requirements = [
  { id: 'B29', label: 'Consigne de distance capteur / surface', value: '5 mm – 30 cm' },
  { id: 'B30', label: 'Précision de distance', value: '± 1 mm' },
  { id: 'B31', label: 'Parallélisme', value: '± 1°' },
  { id: 'CDC-charge', label: 'Charge utile', value: '≤ 50 kg' },
  { id: 'B14', label: 'Autonomie continue', value: '≥ 8 h' },
].map((r) => ({ ...r, source: 'CDC CEA', status: 'a-venir', evidence: '' }));

const milestones = [
  { sem: 'Semestre 7.1', title: 'Analyse du besoin & cahier des charges',
    desc: 'Analyse des exigences du CEA Marcoule, étude fonctionnelle et choix conceptuels.' },
  { sem: 'Semestre 7.2', title: 'Revue de conception préliminaire',
    desc: 'Soutenance de conception préliminaire devant le jury CEA et académique : architecture en étoile et rotule 3 axes.' },
  { sem: 'Semestre 8.1', title: 'Conception détaillée & approvisionnement',
    desc: "Plans d'usinage, sélection des actionneurs, schémas de PCB et architecture logicielle TCP/IP sur Raspberry Pi 5." },
  { sem: 'Semestre 8.2', title: 'Intégration & prototype',
    desc: "Assemblage en laboratoire, réglage des asservissements, essais d'emport et validation du prototype." },
].map((m) => ({ ...m, status: 'a-venir' }));

const sensors = [
  { name: 'Sonde Alpha ZnS(Ag)', type: 'Rayonnement alpha', target: 'Uranium & actinides',
    desc: "Scintillateur sulfure de zinc activé à l'argent. Exige une faible distance sans contact mécanique pour éviter l'abrasion." },
  { name: 'Sonde NaI(Tl)', type: 'Rayonnement gamma', target: 'Spectrométrie isotopique',
    desc: "Cristal d'iodure de sodium dopé au thallium sous blindage en plomb : c'est le capteur le plus lourd que SPOC doit porter." },
  { name: 'Sonde EJ200', type: 'Rayonnement bêta', target: 'Contamination surfacique',
    desc: 'Scintillateur plastique à réponse rapide, adapté aux balayages continus le long des parois de démantèlement.' },
  { name: 'Détecteur BEGe', type: 'Spectrométrie haute résolution', target: "Raies d'énergie précises",
    desc: 'Germanium ultra-pur pour une discrimination isotopique fine dans les spectres radiologiques complexes.' },
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
      alt: "Photo de groupe des 14 élèves-ingénieurs de l'équipe MinOtech",
    },
    robot: {
      type: 'svg',
      src: 'assets/tech/prototype_robot_schema.svg',
      width: 1600,
      height: 900,
      alt: 'Schéma du prototype SPOC : module de translation, rotule et sonde face à la paroi',
    },
    system: {
      type: 'svg',
      src: 'assets/tech/architecture_systeme_schema.svg',
      width: 1600,
      height: 900,
      alt: "Schéma de l'architecture du système : capteurs, contrôleur temps réel, unité embarquée et poste de pilotage",
    },
  },
  solution: {
    type: 'svg',
    src: 'assets/tech/architecture_systeme_schema.svg',
    width: 1600,
    height: 900,
    alt: "Schéma de l'architecture de la solution SPOC, du capteur au poste de pilotage",
  },
};

export const projectData = { poles, team, sensors, requirements, milestones, media };
