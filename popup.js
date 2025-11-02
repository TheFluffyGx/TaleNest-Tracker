// ===== Storage Manager (Chrome API instead of localStorage) =====
const Storage = {
  get: (key) => new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] || null);
    });
  }),
  
  set: (key, value) => new Promise((resolve) => {
    chrome.storage.local.set({[key]: value}, resolve);
  }),
  
  // Batch operations for better performance
  getMultiple: (keys) => new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  }),
  
  setMultiple: (items) => new Promise((resolve) => {
    chrome.storage.local.set(items, resolve);
  })
};

// ===== Default Categories =====
const defaultCategories = {
  anime: ["favorite","watching","completed"],
  manga: ["favorite","reading","completed"],
  fiction: ["favorite","fanfics","novel","completed"]
};

// ===== State Management =====
let state = {
  currentTab: 'anime',
  openState: {},
  categories: {},
  entries: {},
  defaults: {},
  searchQuery: '',
  isInitialized: false,
  hasChanges: false
};

// ===== Initialize Extension =====
async function initializeExtension() {
  try {
    // Load all data in one batch operation
    const keys = [
      'lastTab', 'openState',
      'anime-categories', 'manga-categories', 'fiction-categories',
      'anime-entries', 'manga-entries', 'fiction-entries',
      'anime-default', 'manga-default', 'fiction-default'
    ];
    
    const data = await Storage.getMultiple(keys);
    
    // Initialize defaults if needed
    const updates = {};
    ['anime','manga','fiction'].forEach(tab => {
      if(!data[tab+'-categories']) {
        updates[tab+'-categories'] = defaultCategories[tab];
      }
      if(!data[tab+'-entries']) {
        updates[tab+'-entries'] = {};
      }
    });
    
    if(Object.keys(updates).length > 0) {
      await Storage.setMultiple(updates);
      Object.assign(data, updates);
    }
    
    // Load state
    state.currentTab = data.lastTab || 'anime';
    state.openState = data.openState || {};
    
    ['anime','manga','fiction'].forEach(tab => {
      state.categories[tab] = data[tab+'-categories'] || defaultCategories[tab];
      state.entries[tab] = data[tab+'-entries'] || {};
      state.defaults[tab] = data[tab+'-default'] || state.categories[tab][0];
    });
    
    state.isInitialized = true;
    
    // Initial render
    activateTab(state.currentTab);
    
  } catch(error) {
    console.error('Failed to initialize:', error);
    alert('Failed to load data. Please reload the extension.');
  }
}

// ===== AUTO-EXPORT EVERY 6 HOURS (only if changes detected) =====
async function autoExportData() {
  if (!state.hasChanges) {
    console.log('No changes detected, skipping auto-backup');
    return;
  }
  
  const data = {
    categories: state.categories,
    entries: state.entries,
    defaults: state.defaults,
    openState: state.openState,
    lastTab: state.currentTab
  };
  
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `talenest-auto-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  state.hasChanges = false;
  console.log('Auto-backup created');
}

async function initAutoExport() {
  const lastExport = await Storage.get('lastAutoExport');
  const now = Date.now();
  const sixHours = 6 * 60 * 60 * 1000;
  
  if (!lastExport || (now - lastExport) >= sixHours) {
    autoExportData();
    await Storage.set('lastAutoExport', now);
  }
  
  // Set interval for next auto-export
  setInterval(async () => {
    autoExportData();
    await Storage.set('lastAutoExport', Date.now());
  }, sixHours);
}

// ===== SMART TITLE GROUPING =====
function findSimilarTitleIndex(entries, newTitle) {
  // Extract base title by removing common patterns
  const baseTitle = newTitle
    .replace(/Chapter\s+\d+/i, '')
    .replace(/Episode\s+\d+/i, '')
    .replace(/E\d+/i, '')
    .replace(/CH\s*\d+/i, '')
    .replace(/V\d+/i, '')
    .replace(/S\d+/i, '')
    .replace(/\s*-\s*[A-Z-]+\s*$/i, '') // Remove source tags like "- WTR-LAB"
    .trim()
    .toLowerCase();
  
  // Find last occurrence of similar title
  let lastIndex = -1;
  
  for (let i = entries.length - 1; i >= 0; i--) {
    const entryBase = entries[i]
      .replace(/Chapter\s+\d+/i, '')
      .replace(/Episode\s+\d+/i, '')
      .replace(/E\d+/i, '')
      .replace(/CH\s*\d+/i, '')
      .replace(/V\d+/i, '')
      .replace(/S\d+/i, '')
      .replace(/\s*-\s*[A-Z-]+\s*$/i, '')
      .trim()
      .toLowerCase();
    
    // Check if base titles match (allowing for small differences)
    if (entryBase === baseTitle || 
        (baseTitle.length > 10 && entryBase.includes(baseTitle)) ||
        (baseTitle.length > 10 && baseTitle.includes(entryBase))) {
      lastIndex = i;
      break;
    }
  }
  
  return lastIndex;
}

// ===== Data Functions (with caching) =====
function getCategories(tab){ return state.categories[tab] || []; }
function getEntries(tab){ return state.entries[tab] || {}; }
function getDefaultCategory(tab){ return state.defaults[tab] || getCategories(tab)[0]; }

async function saveCategories(tab, cats) {
  state.categories[tab] = cats;
  state.hasChanges = true;
  await Storage.set(tab+'-categories', cats);
}

async function saveEntries(tab, entries) {
  state.entries[tab] = entries;
  state.hasChanges = true;
  await Storage.set(tab+'-entries', entries);
}

async function setDefaultCategory(tab, cat) {
  state.defaults[tab] = cat;
  state.hasChanges = true;
  await Storage.set(tab+'-default', cat);
  renderTab(tab);
}

// ===== Tab Management =====
function activateTab(tab) {
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById(tab)?.classList.add('active');
  state.currentTab = tab;
  Storage.set('lastTab', tab);
  renderTab(tab);
}

document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    if(tab.classList.contains('settings-tab')){
      document.getElementById('settings-popup').classList.remove('hidden');
    } else {
      activateTab(tab.dataset.tab);
      document.getElementById('settings-popup').classList.add('hidden');
    }
  });
});

// ===== Render Tab (Optimized) =====
function renderTab(tab){
  const container = document.getElementById(tab);
  
  // Create document fragment for better performance
  const fragment = document.createDocumentFragment();
  
  let cats = getCategories(tab);
  let entries = getEntries(tab);
  let defaultCat = state.defaults[tab];

  cats.forEach(cat=>{
    const card = createCategoryCard(tab, cat, entries[cat] || [], defaultCat);
    fragment.appendChild(card);
  });
  
  // Single DOM update
  container.innerHTML = '';
  container.appendChild(fragment);
  
  // Enable drag after rendering
  enableCategoryDrag(tab);
  enableTitleDrag();
  
  // Reapply search highlight if active
  if(state.searchQuery) {
    highlightMatches();
  }
}

// ===== Create Category Card (Extracted for clarity) =====
function createCategoryCard(tab, cat, items, defaultCat) {
  const card = document.createElement('div');
  card.className = 'category-card';
  card.dataset.cat = cat;
  
  // Create header
  const header = createCategoryHeader(tab, cat, defaultCat);
  
  // Create list
  const ul = createCategoryList(tab, cat, items);
  
  // Set initial open state
  if(state.openState[tab+'-'+cat]) {
    card.classList.add('open');
    header.querySelector('.arrow').style.transform = 'rotate(90deg)';
  }
  
  card.appendChild(header);
  card.appendChild(ul);
  
  return card;
}

// ===== Create Category Header =====
function createCategoryHeader(tab, cat, defaultCat) {
  const header = document.createElement('div');
  header.className = 'category-header';
  header.setAttribute('draggable','true');
  header.style.cursor = 'grab';
  
  const arrow = document.createElement('span');
  arrow.className = 'arrow';
  arrow.textContent = '▶';
  
  const catName = document.createElement('span');
  catName.textContent = cat.toUpperCase();
  catName.style.flex = '1';
  catName.style.marginLeft = '6px';
  
  header.appendChild(arrow);
  header.appendChild(catName);
  
  // Rename button
  const renameCatBtn = document.createElement('span');
  renameCatBtn.textContent = '✏️';
  renameCatBtn.className = 'rename';
  renameCatBtn.style.fontSize = '14px';
  renameCatBtn.addEventListener('click', (e) => handleCategoryRename(e, tab, cat, header, catName));
  header.appendChild(renameCatBtn);
  
  // Delete button
  const deleteCatBtn = document.createElement('span');
  deleteCatBtn.textContent = '✖';
  deleteCatBtn.className = 'delete';
  deleteCatBtn.addEventListener('click', (e) => handleCategoryDelete(e, tab, cat));
  header.appendChild(deleteCatBtn);
  
  // Default star
  const defaultBtn = document.createElement('span');
  defaultBtn.textContent = '☆';
  defaultBtn.className = 'default-btn';
  if(cat === defaultCat) defaultBtn.classList.add('default');
  defaultBtn.addEventListener('click', e => { 
    e.stopPropagation(); 
    setDefaultCategory(tab, cat); 
  });
  header.appendChild(defaultBtn);
  
  // Toggle open/close
  header.addEventListener('click', (e) => {
    if(e.target.classList.contains('delete') || 
       e.target.classList.contains('default-btn') ||
       e.target.classList.contains('rename')) return;
    
    const card = header.parentElement;
    card.classList.toggle('open');
    state.openState[tab+'-'+cat] = card.classList.contains('open');
    Storage.set('openState', state.openState);
    arrow.style.transform = card.classList.contains('open') ? 'rotate(90deg)' : 'rotate(0deg)';
  });
  
  return header;
}

// ===== Handle Category Rename =====
function handleCategoryRename(e, tab, cat, header, catName) {
  e.stopPropagation();
  
  header.setAttribute('draggable','false');
  header.style.cursor = 'text';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = cat;
  input.style.flex = '1';
  input.style.background = '#1f2028';
  input.style.border = '1px solid #4a90e2';
  input.style.borderRadius = '4px';
  input.style.padding = '2px 6px';
  input.style.color = '#eee';
  input.style.fontSize = '14px';
  input.style.marginLeft = '6px';
  input.style.textTransform = 'uppercase';
  
  header.replaceChild(input, catName);
  input.focus();
  input.select();
  
  const saveEdit = async () => {
    const newName = input.value.trim().toLowerCase();
    if(newName && newName !== cat && !state.categories[tab].includes(newName)){
      const idx = state.categories[tab].indexOf(cat);
      state.categories[tab][idx] = newName;
      
      state.entries[tab][newName] = state.entries[tab][cat];
      delete state.entries[tab][cat];
      
      if(state.openState[tab+'-'+cat]){
        state.openState[tab+'-'+newName] = state.openState[tab+'-'+cat];
        delete state.openState[tab+'-'+cat];
      }
      
      if(state.defaults[tab] === cat){
        state.defaults[tab] = newName;
      }
      
      // Batch save
      await Storage.setMultiple({
        [tab+'-categories']: state.categories[tab],
        [tab+'-entries']: state.entries[tab],
        [tab+'-default']: state.defaults[tab],
        'openState': state.openState
      });
    }
    renderTab(tab);
  };
  
  input.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') saveEdit();
    if(e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      renderTab(tab);
    }
  });
  input.addEventListener('blur', saveEdit);
}

// ===== Handle Category Delete =====
async function handleCategoryDelete(e, tab, cat) {
  e.stopPropagation();
  if(confirm(`Delete category "${cat}"? This will remove all entries in it.`)){
    state.categories[tab] = state.categories[tab].filter(c => c !== cat);
    delete state.entries[tab][cat];
    delete state.openState[tab+'-'+cat];
    
    await Storage.setMultiple({
      [tab+'-categories']: state.categories[tab],
      [tab+'-entries']: state.entries[tab],
      'openState': state.openState
    });
    
    renderTab(tab);
  }
}

// ===== Create Category List =====
function createCategoryList(tab, cat, items) {
  const ul = document.createElement('ul');
  ul.className = 'list';
  ul.id = `${tab}-${cat}`;
  
  items.forEach((item, idx) => {
    const li = createListItem(tab, cat, item, idx);
    ul.appendChild(li);
  });
  
  return ul;
}

// ===== Create List Item =====
function createListItem(tab, cat, item, idx) {
  const li = document.createElement('li');
  li.setAttribute('draggable','true');
  li.dataset.idx = idx;
  li.dataset.cat = cat;
  li.style.cursor = 'grab';
  
  const spanText = document.createElement('span');
  spanText.textContent = item;
  spanText.className = 'title-text';
  spanText.style.flex = '1';
  spanText.style.marginRight = '4px';
  
  const renameBtn = document.createElement('span');
  renameBtn.textContent = '✏️';
  renameBtn.className = 'rename';
  renameBtn.addEventListener('click', (e) => handleItemRename(e, tab, cat, idx, item, li, spanText));
  
  const deleteBtn = document.createElement('span');
  deleteBtn.textContent = '✖';
  deleteBtn.className = 'delete';
  deleteBtn.addEventListener('click', () => handleItemDelete(tab, cat, idx));
  
  li.appendChild(spanText);
  li.appendChild(renameBtn);
  li.appendChild(deleteBtn);
  
  return li;
}

// ===== Handle Item Rename =====
function handleItemRename(e, tab, cat, idx, item, li, spanText) {
  e.stopPropagation();
  
  li.setAttribute('draggable','false');
  li.style.cursor = 'text';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = item;
  input.style.flex = '1';
  input.style.background = '#1f2028';
  input.style.border = '1px solid #4a90e2';
  input.style.borderRadius = '4px';
  input.style.padding = '2px 6px';
  input.style.color = '#eee';
  input.style.fontSize = '14px';
  input.style.marginRight = '4px';
  
  li.replaceChild(input, spanText);
  input.focus();
  input.select();
  
  const saveEdit = async () => {
    const newVal = input.value.trim();
    if(newVal && newVal !== item){
      state.entries[tab][cat][idx] = newVal;
      await saveEntries(tab, state.entries[tab]);
    }
    renderTab(tab);
  };
  
  input.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') saveEdit();
    if(e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      renderTab(tab);
    }
  });
  input.addEventListener('blur', saveEdit);
}

// ===== Handle Item Delete =====
async function handleItemDelete(tab, cat, idx) {
  state.entries[tab][cat].splice(idx, 1);
  await saveEntries(tab, state.entries[tab]);
  renderTab(tab);
}

// ===== CATEGORY DRAG & DROP =====
let draggedCategory = null;

function enableCategoryDrag(tab){
  const headers = document.querySelectorAll(`#${tab} .category-header`);
  headers.forEach(header => {
    const card = header.parentElement;
    
    header.addEventListener('dragstart', e => {
      draggedCategory = card.dataset.cat;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'category'); // Needed for Firefox
      header.style.cursor = 'grabbing';
    });
    
    header.addEventListener('dragend', e => {
      header.style.cursor = 'grab';
      draggedCategory = null;
    });
    
    card.addEventListener('dragover', e => {
      if(draggedCategory && !draggedTitle) { // Only for category drag
        e.preventDefault();
      }
    });
    
    card.addEventListener('drop', async e => {
      if(draggedCategory && !draggedTitle){
        e.preventDefault();
        e.stopPropagation();
        
        const targetCat = card.dataset.cat;
        if(draggedCategory === targetCat) return;
        
        let cats = state.categories[tab];
        const fromIdx = cats.indexOf(draggedCategory);
        const toIdx = cats.indexOf(targetCat);
        cats.splice(fromIdx, 1);
        cats.splice(toIdx, 0, draggedCategory);
        await saveCategories(tab, cats);
        renderTab(tab);
      }
    });
  });
}

// ===== TITLE DRAG & DROP =====
let draggedTitle = null;
let draggedIdx = null;
let draggedCat = null;

function enableTitleDrag() {
  document.querySelectorAll('.list li').forEach(item => {
    item.draggable = true;

    item.addEventListener('dragstart', e => {
      e.stopPropagation();
      draggedTitle = item;
      draggedIdx = Number(item.dataset.idx);
      draggedCat = item.dataset.cat;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData('text/plain', 'title'); // Needed for Firefox
      item.style.opacity = '0.4';
      item.style.cursor = 'grabbing';
    });

    item.addEventListener('dragend', e => {
      item.style.opacity = '1';
      item.style.cursor = 'grab';
      draggedTitle = null;
      draggedIdx = null;
      draggedCat = null;
    });

    item.addEventListener('dragover', e => {
      if(draggedTitle && draggedCat === item.dataset.cat) {
        e.preventDefault();
        e.stopPropagation();
        item.style.borderTop = '2px solid #4a90e2';
      }
    });

    item.addEventListener('dragleave', e => {
      item.style.borderTop = '';
    });

    item.addEventListener('drop', async e => {
      e.preventDefault();
      e.stopPropagation();
      item.style.borderTop = '';
      
      if(!draggedTitle || draggedTitle === item) return;

      const dropCat = item.dataset.cat;
      const dropIdx = Number(item.dataset.idx);

      if(draggedCat !== dropCat) return;

      const [movedItem] = state.entries[state.currentTab][draggedCat].splice(draggedIdx, 1);
      state.entries[state.currentTab][draggedCat].splice(dropIdx, 0, movedItem);
      await saveEntries(state.currentTab, state.entries[state.currentTab]);
      renderTab(state.currentTab);
    });
  });

  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('dragover', e => {
      const toCat = card.dataset.cat;
      if(draggedCat && draggedCat !== toCat) {
        e.preventDefault();
        e.stopPropagation();
        const list = card.querySelector('.list');
        if(list) list.style.background = 'rgba(74, 144, 226, 0.2)';
      }
    });
    
    card.addEventListener('dragleave', e => {
      const list = card.querySelector('.list');
      if(list) list.style.background = '';
    });

    card.addEventListener('drop', async e => {
      const list = card.querySelector('.list');
      if(list) list.style.background = '';
      
      if(!draggedTitle) return;
      
      const toCat = card.dataset.cat;
      if(!toCat || draggedCat === toCat) return;
      
      e.preventDefault();
      e.stopPropagation();

      const [movedItem] = state.entries[state.currentTab][draggedCat].splice(draggedIdx, 1);

      if(!state.entries[state.currentTab][toCat]) {
        state.entries[state.currentTab][toCat] = [];
      }
      state.entries[state.currentTab][toCat].push(movedItem);

      await saveEntries(state.currentTab, state.entries[state.currentTab]);
      renderTab(state.currentTab);
    });
  });
}

// ===== AUTO-FORMAT TITLE =====
function formatTitle(title){
  title = title.replace(/(S\d+)[ .-]?E(\d+)/i,'$1 - E$2');
  title = title.replace(/(V\d+)[ .-]?CH(\d+)/i,'$1 CH$2');
  return title;
}

// ===== ADD ENTRY BUTTON =====
document.getElementById('add-btn').addEventListener('click', () => {
  const tab = state.currentTab;
  const defaultCat = state.defaults[tab];

  chrome.tabs.query({active:true, currentWindow:true}, async tabs => {
    let title = tabs[0]?.title || '';
    if(title) title = formatTitle(title);
    if(!state.entries[tab][defaultCat]) state.entries[tab][defaultCat] = [];
    
    // Smart grouping: find similar title and insert after it
    const similarIndex = findSimilarTitleIndex(state.entries[tab][defaultCat], title);
    let newIndex;
    
    if (similarIndex !== -1) {
      // Insert right after the last similar title
      newIndex = similarIndex + 1;
      state.entries[tab][defaultCat].splice(newIndex, 0, title || 'New Entry');
    } else {
      // No similar title found, add to end
      newIndex = state.entries[tab][defaultCat].length;
      state.entries[tab][defaultCat].push(title || 'New Entry');
    }
    
    await saveEntries(tab, state.entries[tab]);
    
    // Make sure category is open
    if(!state.openState[tab + '-' + defaultCat]) {
      state.openState[tab + '-' + defaultCat] = true;
      await Storage.set('openState', state.openState);
    }
    
    renderTab(tab);
    
    // Scroll to the newly added item
    setTimeout(() => {
      const list = document.getElementById(`${tab}-${defaultCat}`);
      if(list) {
        const items = list.querySelectorAll('li');
        const newItem = items[newIndex];
        if(newItem) {
          newItem.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          // Highlight briefly
          newItem.style.background = '#4a90e2';
          setTimeout(() => {
            newItem.style.background = '';
          }, 800);
        }
      }
    }, 350);
  });
});

// ===== SETTINGS MANAGEMENT =====
const tabSelect = document.getElementById('settings-tab-select');
const newCatInput = document.getElementById('new-category-input');
const addCatBtn = document.getElementById('add-category-btn');

// First divider
const divider1 = document.createElement('div');
divider1.className = 'settings-divider';
document.querySelector('#settings-popup .settings-body').appendChild(divider1);

// Export button
const exportBtn = document.createElement('button');
exportBtn.textContent = 'Export Data';
exportBtn.style.marginTop = '8px';
exportBtn.style.width = '100%';
exportBtn.addEventListener('click', async () => {
  const data = {
    categories: state.categories,
    entries: state.entries,
    defaults: state.defaults,
    openState: state.openState,
    lastTab: state.currentTab
  };
  
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `talenest-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
});
document.querySelector('#settings-popup .settings-body').appendChild(exportBtn);

// Import button
const importBtn = document.createElement('button');
importBtn.textContent = 'Import Data';
importBtn.style.marginTop = '8px';
importBtn.style.width = '100%';
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.json';
fileInput.style.display = 'none';

importBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;
  
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target.result);
      
      if(!data.categories || !data.entries) {
        alert('Invalid backup file format!');
        return;
      }
      
      if(confirm('This will replace all your current data. Continue?')){
        // Update state
        state.categories = data.categories;
        state.entries = data.entries;
        state.defaults = data.defaults || {};
        state.openState = data.openState || {};
        state.currentTab = data.lastTab || 'anime';
        
        // Save to storage
        const updates = {
          'openState': state.openState,
          'lastTab': state.currentTab
        };
        
        ['anime','manga','fiction'].forEach(tab => {
          updates[tab+'-categories'] = state.categories[tab];
          updates[tab+'-entries'] = state.entries[tab];
          updates[tab+'-default'] = state.defaults[tab];
        });
        
        await Storage.setMultiple(updates);
        
        alert('Data imported successfully!');
        location.reload();
      }
    } catch(err) {
      alert('Error reading backup file: ' + err.message);
    }
  };
  reader.readAsText(file);
  fileInput.value = '';
});

document.querySelector('#settings-popup .settings-body').appendChild(importBtn);
document.querySelector('#settings-popup .settings-body').appendChild(fileInput);

// Second divider
const divider2 = document.createElement('div');
divider2.className = 'settings-divider';
document.querySelector('#settings-popup .settings-body').appendChild(divider2);

// Reset button
const resetBtn = document.createElement('button');
resetBtn.textContent = 'Reset Extension';
resetBtn.style.marginTop = '16px';
resetBtn.style.width = '100%';
resetBtn.style.background = '#e74c3c';
resetBtn.addEventListener('click', () => {
  if(confirm('Are you sure you want to reset? You will lose everything up till now.')){
    chrome.storage.local.clear(() => {
      location.reload();
    });
  }
});
document.querySelector('#settings-popup .settings-body').appendChild(resetBtn);

addCatBtn.addEventListener('click', async () => {
  const name = newCatInput.value.trim();
  if(!name) return;
  const tab = tabSelect.value;
  let cats = state.categories[tab];
  if(!cats.includes(name)) {
    cats.push(name);
    await saveCategories(tab, cats);
  }
  newCatInput.value = '';
  renderTab(tab);
});

document.getElementById('close-settings').addEventListener('click', () => {
  document.getElementById('settings-popup').classList.add('hidden');
});

// ===== SEARCH FUNCTIONALITY (Optimized with debounce) =====
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
let searchMatches = [];
let currentMatchIndex = 0;
let searchTimeout = null;

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  clearSearch();
  searchInput.focus();
});

// Debounced search for better performance
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim().toLowerCase();
  
  if (!query) {
    clearSearch();
    return;
  }
  
  // Debounce search by 150ms
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    performSearch(query);
  }, 150);
});

searchInput.addEventListener('keydown', (e) => {
  if (searchMatches.length === 0) return;
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
    scrollToMatch(searchMatches[currentMatchIndex]);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    scrollToMatch(searchMatches[currentMatchIndex]);
  }
});

function performSearch(query) {
  state.searchQuery = query;
  
  document.querySelectorAll('.search-match').forEach(el => {
    el.classList.remove('search-match');
  });
  
  searchMatches = [];
  
  ['anime', 'manga', 'fiction'].forEach(tab => {
    const entries = state.entries[tab];
    
    Object.keys(entries).forEach(cat => {
      entries[cat].forEach((title, idx) => {
        if (title.toLowerCase().includes(query)) {
          searchMatches.push({ tab, cat, idx, title });
        }
      });
    });
  });
  
  if (searchMatches.length > 0) {
    currentMatchIndex = 0;
    highlightMatches();
  }
}

function highlightMatches() {
  const currentTabMatches = searchMatches.filter(m => m.tab === state.currentTab);
  
  currentTabMatches.forEach(match => {
    const listId = `${match.tab}-${match.cat}`;
    const list = document.getElementById(listId);
    if (list) {
      const items = list.querySelectorAll('li');
      if (items[match.idx]) {
        items[match.idx].classList.add('search-match');
      }
    }
  });
}

function scrollToMatch(match) {
  if (match.tab !== state.currentTab) {
    activateTab(match.tab);
    setTimeout(() => scrollToMatchInTab(match), 100);
  } else {
    scrollToMatchInTab(match);
  }
}

function scrollToMatchInTab(match) {
  const cards = document.querySelectorAll(`#${match.tab} .category-card`);
  let targetCard = null;
  
  cards.forEach(card => {
    if (card.dataset.cat === match.cat) {
      targetCard = card;
    }
  });
  
  if (!targetCard) return;
  
  if (!targetCard.classList.contains('open')) {
    targetCard.classList.add('open');
    state.openState[match.tab + '-' + match.cat] = true;
    Storage.set('openState', state.openState);
    const arrow = targetCard.querySelector('.arrow');
    if (arrow) arrow.style.transform = 'rotate(90deg)';
  }
  
  setTimeout(() => {
    const list = document.getElementById(`${match.tab}-${match.cat}`);
    if (list) {
      const items = list.querySelectorAll('li');
      const targetItem = items[match.idx];
      
      if (targetItem) {
        targetItem.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        document.querySelectorAll('.search-match').forEach(el => {
          el.classList.remove('search-match');
        });
        targetItem.classList.add('search-match');
      }
    }
  }, 300);
}

function clearSearch() {
  state.searchQuery = '';
  searchMatches = [];
  currentMatchIndex = 0;
  document.querySelectorAll('.search-match').forEach(el => {
    el.classList.remove('search-match');
  });
}

// ===== INITIALIZE ON LOAD =====
initializeExtension();
initAutoExport();