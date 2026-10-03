const STORAGE_KEY_DECKS = 'ankit_decks_data';
const STORAGE_KEY_CARDS = 'ankit_cards_data';

let decks = [];
let cards = [];
let currentDeckId = null;
let studyQueue = [];
let currentCardIndex = 0;
let isFlipped = false;

// Éléments UI
const viewDecks = document.getElementById('viewDecks');
const viewManageDeck = document.getElementById('viewManageDeck');
const viewStudy = document.getElementById('viewStudy');
const viewComplete = document.getElementById('viewComplete');

const decksGrid = document.getElementById('decksGrid');
const manageDeckTitle = document.getElementById('manageDeckTitle');
const manageCardsList = document.getElementById('manageCardsList');

const flashcard = document.getElementById('flashcard');
const cardContent = document.getElementById('cardContent');
const cardHint = document.getElementById('cardHint');
const responseButtons = document.getElementById('responseButtons');
const studyProgress = document.getElementById('studyProgress');

const btnBackToDecks = document.getElementById('btnBackToDecks');
const btnBackToDecksFromManage = document.getElementById('btnBackToDecksFromManage');
const btnBackHome = document.getElementById('btnBackHome');
const btnResetData = document.getElementById('btnResetData');
const btnExportJSON = document.getElementById('btnExportJSON');

// Formulaires & Modale
const formAddDeck = document.getElementById('formAddDeck');
const formAddCard = document.getElementById('formAddCard');
const inputDeckName = document.getElementById('inputDeckName');
const selectDeckForCard = document.getElementById('selectDeckForCard');
const inputCardFront = document.getElementById('inputCardFront');
const inputCardBack = document.getElementById('inputCardBack');

const modalEdit = document.getElementById('modalEdit');
const editCardId = document.getElementById('editCardId');
const editCardFront = document.getElementById('editCardFront');
const editCardBack = document.getElementById('editCardBack');
const btnCancelEdit = document.getElementById('btnCancelEdit');
const btnSaveEdit = document.getElementById('btnSaveEdit');

// --- 1. INITIALISATION ---

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
  updateDeckSelect();
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
    console.error("Erreur chargement JSON :", err);
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(decks));
  localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
}

// --- 2. AFFICHAGE DES DECKS ---

function renderDecks() {
  showView('decks');
  decksGrid.innerHTML = '';

  if (decks.length === 0) {
    decksGrid.innerHTML = `<p class="text-slate-500 text-sm col-span-2">Aucun paquet disponible.</p>`;
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
      <div class="flex items-center gap-2">
        <button data-id="${deck._id}" class="btn-manage-deck p-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs rounded-lg transition" title="Gérer les cartes">
          ⚙️
        </button>
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

function updateDeckSelect() {
  selectDeckForCard.innerHTML = '<option value="">-- Choisir un paquet --</option>';
  decks.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d._id;
    opt.textContent = d.name;
    selectDeckForCard.appendChild(opt);
  });
}

// --- 3. VUE DE GESTION / ÉDITION DES CARTES ---

function openManageDeck(deckId) {
  currentDeckId = deckId;
  const deck = decks.find(d => d._id === deckId);
  if (!deck) return;

  manageDeckTitle.textContent = `Gestion : ${deck.name}`;
  renderManageCards();
  showView('manage');
}

function renderManageCards() {
  manageCardsList.innerHTML = '';
  const deckCards = cards.filter(c => c.deckId === currentDeckId);

  if (deckCards.length === 0) {
    manageCardsList.innerHTML = `<p class="text-slate-500 text-sm">Aucune carte dans ce paquet.</p>`;
    return;
  }

  deckCards.forEach(c => {
    const item = document.createElement('div');
    item.className = 'bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex items-center justify-between gap-4';
    item.innerHTML = `
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-slate-100 truncate"><span class="text-slate-400">R:</span> ${c.front}</p>
        <p class="text-xs text-slate-400 truncate mt-0.5"><span class="text-slate-500">V:</span> ${c.back}</p>
      </div>
      <div class="flex items-center gap-2">
        <button data-id="${c._id}" class="btn-open-edit px-2.5 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition">✏️ Modifier</button>
        <button data-id="${c._id}" class="btn-delete-card px-2.5 py-1.5 text-xs bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/40 rounded-lg transition">🗑️ Supprimer</button>
      </div>
    `;
    manageCardsList.appendChild(item);
  });
}

function openEditModal(cardId) {
  const card = cards.find(c => c._id === cardId);
  if (!card) return;

  editCardId.value = card._id;
  editCardFront.value = card.front;
  editCardBack.value = card.back;
  modalEdit.classList.remove('hidden');
}

function saveCardEdit() {
  const id = editCardId.value;
  const cardIndex = cards.findIndex(c => c._id === id);

  if (cardIndex !== -1) {
    cards[cardIndex].front = editCardFront.value.trim();
    cards[cardIndex].back = editCardBack.value.trim();
    saveToStorage();
    renderManageCards();
    modalEdit.classList.add('hidden');
  }
}

function deleteCard(cardId) {
  if (confirm("Supprimer cette carte définitivement ?")) {
    cards = cards.filter(c => c._id !== cardId);
    saveToStorage();
    renderManageCards();
  }
}

// --- 4. AJOUT & EXPORT ---

function addDeck(name) {
  const newDeck = { _id: 'deck-' + Date.now(), name: name.trim() };
  decks.push(newDeck);
  saveToStorage();
  renderDecks();
  updateDeckSelect();
}

function addCard(deckId, front, back) {
  const newCard = {
    _id: 'card-' + Date.now(),
    deckId: deckId,
    front: front.trim(),
    back: back.trim(),
    dueDate: new Date().toISOString(),
    interval: 1,
    repetition: 0,
    efactor: 2.5
  };
  cards.push(newCard);
  saveToStorage();
  renderDecks();
}

function exportJSON() {
  const data = { decks, cards };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- 5. LOGIQUE DE RÉVISION (SM-2) ---

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
    nextDueDate.setMinutes(nextDueDate.getMinutes() + 10);
  } else {
    nextDueDate.setDate(nextDueDate.getDate() + interval);
  }

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

function showView(viewName) {
  viewDecks.classList.add('hidden');
  viewManageDeck.classList.add('hidden');
  viewStudy.classList.add('hidden');
  viewComplete.classList.add('hidden');

  if (viewName === 'decks') viewDecks.classList.remove('hidden');
  if (viewName === 'manage') viewManageDeck.classList.remove('hidden');
  if (viewName === 'study') viewStudy.classList.remove('hidden');
  if (viewName === 'complete') viewComplete.classList.remove('hidden');
}

// --- 6. ÉVÉNEMENTS ---

function setupEventListeners() {
  formAddDeck.addEventListener('submit', (e) => {
    e.preventDefault();
    if (inputDeckName.value) {
      addDeck(inputDeckName.value);
      inputDeckName.value = '';
    }
  });

  formAddCard.addEventListener('submit', (e) => {
    e.preventDefault();
    if (selectDeckForCard.value && inputCardFront.value && inputCardBack.value) {
      addCard(selectDeckForCard.value, inputCardFront.value, inputCardBack.value);
      inputCardFront.value = '';
      inputCardBack.value = '';
    }
  });

  btnExportJSON.addEventListener('click', exportJSON);

  // Clics sur la grille des decks (Réviser ou Gérer)
  decksGrid.addEventListener('click', (e) => {
    const btnStudy = e.target.closest('.btn-start-study');
    if (btnStudy) startStudy(btnStudy.dataset.id);

    const btnManage = e.target.closest('.btn-manage-deck');
    if (btnManage) openManageDeck(btnManage.dataset.id);
  });

  // Événements dans la vue de gestion des cartes
  manageCardsList.addEventListener('click', (e) => {
    const btnEdit = e.target.closest('.btn-open-edit');
    if (btnEdit) openEditModal(btnEdit.dataset.id);

    const btnDelete = e.target.closest('.btn-delete-card');
    if (btnDelete) deleteCard(btnDelete.dataset.id);
  });

  // Actions de la modale d'édition
  btnCancelEdit.addEventListener('click', () => modalEdit.classList.add('hidden'));
  btnSaveEdit.addEventListener('click', saveCardEdit);

  flashcard.addEventListener('click', flipCard);

  responseButtons.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-grade');
    if (btn) processAnswer(btn.dataset.grade);
  });

  btnBackToDecks.addEventListener('click', () => renderDecks());
  btnBackToDecksFromManage.addEventListener('click', () => renderDecks());
  btnBackHome.addEventListener('click', () => renderDecks());

  btnResetData.addEventListener('click', async () => {
    if (confirm("Réinitialiser les données au contenu d'origine du fichier data.json ?")) {
      localStorage.clear();
      await resetDataFromJSON();
      renderDecks();
      updateDeckSelect();
    }
  });
}

init();