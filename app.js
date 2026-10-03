// LocalStorage keys
const STORAGE_KEY_DECKS = 'ankit_decks_data';
const STORAGE_KEY_CARDS = 'ankit_cards_data';

// App State
let decks = [];
let cards = [];
let currentDeckId = null;
let studyQueue = [];
let currentCardIndex = 0;
let isFlipped = false;

// Elements DOM
const viewDecks = document.getElementById('viewDecks');
const viewStudy = document.getElementById('viewStudy');
const viewComplete = document.getElementById('viewComplete');
const decksGrid = document.getElementById('decksGrid');

const flashcard = document.getElementById('flashcard');
const cardContent = document.getElementById('cardContent');
const cardHint = document.getElementById('cardHint');
const responseButtons = document.getElementById('responseButtons');
const studyProgress = document.getElementById('studyProgress');

const btnBackToDecks = document.getElementById('btnBackToDecks');
const btnBackHome = document.getElementById('btnBackHome');
const btnResetData = document.getElementById('btnResetData');

// --- 1. INITIALISATION & CHARGEMENT DE LA DATA ---

async function init() {
  const savedDecks = localStorage.getItem(STORAGE_KEY_DECKS);
  const savedCards = localStorage.getItem(STORAGE_KEY_CARDS);

  if (savedDecks && savedCards) {
    decks = JSON.parse(savedDecks);
    cards = JSON.parse(savedCards);
  } else {
    await resetDataFromJSON();
  }

  renderDecks();
  setupEventListeners();
}

async function resetDataFromJSON() {
  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error('Impossible de charger data.json');
    const data = await res.json();
    decks = data.decks;
    cards = data.cards;
    saveToStorage();
  } catch (err) {
    console.error("Erreur lors du chargement de data.json :", err);
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(decks));
  localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
}

// --- 2. AFFICHAGE DE LA LISTE DES DECKS ---

function renderDecks() {
  showView('decks');
  decksGrid.innerHTML = '';

  if (decks.length === 0) {
    decksGrid.innerHTML = `<p class="text-slate-500 text-sm col-span-2">Aucun paquet trouvé.</p>`;
    return;
  }

  const now = new Date();

  decks.forEach(deck => {
    const deckCards = cards.filter(c => c.deckId === deck._id);
    const dueCards = deckCards.filter(c => new Date(c.dueDate) <= now);

    const cardEl = document.createElement('div');
    cardEl.className = 'bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-xl p-5 flex items-center justify-between transition group';
    cardEl.innerHTML = `
      <div>
        <h3 class="font-semibold text-lg text-slate-100 group-hover:text-indigo-400 transition">${deck.name}</h3>
        <p class="text-xs text-slate-400 mt-1">${deckCards.length} cartes au total</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="px-2.5 py-1 text-xs font-semibold rounded-md ${dueCards.length > 0 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-700/50 text-slate-400'}">
          ${dueCards.length} à réviser
        </span>
        <button data-id="${deck._id}" class="btn-start-study px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition disabled:opacity-40 disabled:hover:bg-indigo-600" ${dueCards.length === 0 ? 'disabled' : ''}>
          Réviser
        </button>
      </div>
    `;
    decksGrid.appendChild(cardEl);
  });
}

// --- 3. LOGIQUE DE RÉVISION (SM-2) ---

function startStudy(deckId) {
  currentDeckId = deckId;
  const now = new Date();

  studyQueue = cards.filter(c => c.deckId === deckId && new Date(c.dueDate) <= now);

  if (studyQueue.length === 0) {
    showView('complete');
    return;
  }

  currentCardIndex = 0;
  showView('study');
  renderCurrentCard();
}

function renderCurrentCard() {
  if (currentCardIndex >= studyQueue.length) {
    saveToStorage();
    showView('complete');
    return;
  }

  isFlipped = false;
  const currentCard = studyQueue[currentCardIndex];

  cardContent.textContent = currentCard.front;
  cardHint.textContent = 'Clique pour voir la réponse';
  responseButtons.classList.add('hidden');

  studyProgress.textContent = `${currentCardIndex + 1} / ${studyQueue.length} cartes`;
}

function flipCard() {
  if (isFlipped) return;
  isFlipped = true;
  const currentCard = studyQueue[currentCardIndex];
  cardContent.textContent = currentCard.back;
  cardHint.textContent = 'Évalue ta réponse :';
  responseButtons.classList.remove('hidden');
}

function processAnswer(grade) {
  const card = studyQueue[currentCardIndex];
  grade = parseInt(grade);

  // Algorithme SM-2 simplifié
  let repetition = card.repetition || 0;
  let interval = card.interval || 1;
  let efactor = card.efactor || 2.5;

  if (grade >= 3) {
    if (repetition === 0) interval = 1;
    else if (repetition === 1) interval = 6;
    else interval = Math.round(interval * efactor);
    repetition++;
  } else {
    repetition = 0;
    interval = 1;
  }

  efactor = efactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (efactor < 1.3) efactor = 1.3;

  const nextDueDate = new Date();
  if (grade < 3) {
    // Si échec, reprogrammé immédiatement plus tard dans la journée
    nextDueDate.setMinutes(nextDueDate.getMinutes() + 10);
  } else {
    nextDueDate.setDate(nextDueDate.getDate() + interval);
  }

  // Mettre à jour la carte globale
  const cardIndexInGlobal = cards.findIndex(c => c._id === card._id);
  if (cardIndexInGlobal !== -1) {
    cards[cardIndexInGlobal] = {
      ...card,
      repetition,
      interval,
      efactor,
      dueDate: nextDueDate.toISOString()
    };
  }

  saveToStorage();
  currentCardIndex++;
  renderCurrentCard();
}

// --- 4. NAVIGATION & ÉVÉNEMENTS ---

function showView(viewName) {
  viewDecks.classList.add('hidden');
  viewStudy.classList.add('hidden');
  viewComplete.classList.add('hidden');

  if (viewName === 'decks') viewDecks.classList.remove('hidden');
  if (viewName === 'study') viewStudy.classList.remove('hidden');
  if (viewName === 'complete') viewComplete.classList.remove('hidden');
}

function setupEventListeners() {
  decksGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-start-study');
    if (btn) {
      startStudy(btn.dataset.id);
    }
  });

  flashcard.addEventListener('click', flipCard);

  responseButtons.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-grade');
    if (btn) {
      processAnswer(btn.dataset.grade);
    }
  });

  btnBackToDecks.addEventListener('click', () => renderDecks());
  btnBackHome.addEventListener('click', () => renderDecks());

  btnResetData.addEventListener('click', async () => {
    if (confirm("Réinitialiser les paquets et cartes à leur état initial (depuis data.json) ?")) {
      localStorage.clear();
      await resetDataFromJSON();
      renderDecks();
    }
  });
}

// Démarrage
init();