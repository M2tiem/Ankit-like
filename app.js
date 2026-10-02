// --- Données & État ---
let data = JSON.parse(localStorage.getItem('flashcards_data')) || {
  decks: [
    { id: 'default', name: 'Général' }
  ],
  cards: [
    {
      id: 'c1',
      deckId: 'default',
      front: 'Quelle est la vitesse de la lumière ?',
      back: '~ 300 000 km/s',
      dueDate: new Date().toISOString(),
      interval: 1
    }
  ]
};

let currentStudyQueue = [];
let currentCardIndex = 0;
let isFlipped = false;

// --- Éléments DOM ---
const views = {
  decks: document.getElementById('view-decks'),
  study: document.getElementById('view-study'),
  addCard: document.getElementById('view-add-card')
};

const deckListEl = document.getElementById('deck-list');
const cardContainer = document.getElementById('card-container');
const cardInner = document.getElementById('card-inner');
const cardFrontText = document.getElementById('card-front-text');
const cardBackText = document.getElementById('card-back-text');
const studyControls = document.getElementById('study-controls');
const studyProgress = document.getElementById('study-progress');
const formAddCard = document.getElementById('form-add-card');
const selectDeck = document.getElementById('select-deck');

// --- Sauvegarde ---
function saveData() {
  localStorage.setItem('flashcards_data', JSON.stringify(data));
}

// --- Navigation ---
function showView(viewName) {
  Object.keys(views).forEach(key => {
    views[key].classList.toggle('hidden', key !== viewName);
  });
}

document.getElementById('btn-nav-decks').addEventListener('click', () => {
  renderDecks();
  showView('decks');
});

document.getElementById('btn-nav-add').addEventListener('click', () => {
  populateDeckSelect();
  showView('addCard');
});

document.getElementById('btn-back-decks').addEventListener('click', () => {
  renderDecks();
  showView('decks');
});

// --- Gestion des Paquets (Decks) ---
document.getElementById('btn-create-deck').addEventListener('click', () => {
  const name = prompt('Nom du nouveau paquet :');
  if (name && name.trim()) {
    const newDeck = { id: 'deck_' + Date.now(), name: name.trim() };
    data.decks.push(newDeck);
    saveData();
    renderDecks();
  }
});

function renderDecks() {
  deckListEl.innerHTML = '';
  const now = new Date();

  data.decks.forEach(deck => {
    const deckCards = data.cards.filter(c => c.deckId === deck.id);
    const dueCards = deckCards.filter(c => new Date(c.dueDate) <= now);

    const cardEl = document.createElement('div');
    cardEl.className = 'bg-slate-800 border border-slate-700 p-5 rounded-xl flex justify-between items-center hover:border-slate-600 transition';
    cardEl.innerHTML = `
      <div>
        <h3 class="font-bold text-lg text-slate-100">${deck.name}</h3>
        <p class="text-sm text-slate-400">${deckCards.length} cartes au total</p>
      </div>
      <button onclick="startStudy('${deck.id}')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium text-sm transition">
        Réviser (${dueCards.length})
      </button>
    `;
    deckListEl.appendChild(cardEl);
  });
}

// --- Session de Révision (Spaced Repetition) ---
window.startStudy = function(deckId) {
  const now = new Date();
  // Filtrer les cartes à réviser aujourd'hui
  currentStudyQueue = data.cards.filter(c => c.deckId === deckId && new Date(c.dueDate) <= now);

  if (currentStudyQueue.length === 0) {
    alert("Aucune carte à réviser dans ce paquet pour le moment !");
    return;
  }

  currentCardIndex = 0;
  showView('study');
  loadCard();
};

function loadCard() {
  if (currentCardIndex >= currentStudyQueue.length) {
    alert("Session terminée ! Bravo ! 🎉");
    renderDecks();
    showView('decks');
    return;
  }

  const card = currentStudyQueue[currentCardIndex];
  cardFrontText.textContent = card.front;
  cardBackText.textContent = card.back;
  
  // Réinitialiser le flip
  isFlipped = false;
  cardInner.classList.remove('flipped');
  studyControls.classList.add('hidden');

  studyProgress.textContent = `Carte ${currentCardIndex + 1} / ${currentStudyQueue.length}`;
}

// Cliquer sur la carte pour la retourner
cardContainer.addEventListener('click', () => {
  if (!isFlipped) {
    isFlipped = true;
    cardInner.classList.add('flipped');
    studyControls.classList.remove('hidden');
  }
});

// Évaluation et calcul de la prochaine date (Algorithme SRS simplifié)
studyControls.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;

  const grade = parseInt(button.dataset.grade);
  const card = currentStudyQueue[currentCardIndex];

  // Algorithme d'intervalle simple (multiplicateurs de jours)
  let daysToAdd = 1;
  if (grade === 1) daysToAdd = 1;      // À revoir demain
  if (grade === 2) daysToAdd = 2;      // Difficile
  if (grade === 3) daysToAdd = 4;      // Correct
  if (grade === 4) daysToAdd = 7 * (card.interval || 1); // Facile

  // Mettre à jour la carte originale
  const originalCard = data.cards.find(c => c.id === card.id);
  if (originalCard) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    originalCard.dueDate = nextDate.toISOString();
    originalCard.interval = daysToAdd;
    saveData();
  }

  currentCardIndex++;
  loadCard();
});

// --- Ajout de Cartes ---
function populateDeckSelect() {
  selectDeck.innerHTML = '';
  data.decks.forEach(deck => {
    const opt = document.createElement('option');
    opt.value = deck.id;
    opt.textContent = deck.name;
    selectDeck.appendChild(opt);
  });
}

formAddCard.addEventListener('submit', (e) => {
  e.preventDefault();
  const front = document.getElementById('input-front').value.trim();
  const back = document.getElementById('input-back').value.trim();
  const deckId = selectDeck.value;

  if (front && back) {
    data.cards.push({
      id: 'c_' + Date.now(),
      deckId: deckId,
      front: front,
      back: back,
      dueDate: new Date().toISOString(),
      interval: 1
    });

    saveData();
    formAddCard.reset();
    alert('Carte ajoutée avec succès !');
  }
});

// --- Initialisation ---
renderDecks();