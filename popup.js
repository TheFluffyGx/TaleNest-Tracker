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
  fiction: ["favorite","fanfics","novel","completed"],
  misc: ["favorite","watching","completed"]
};

// ===== State Management =====
let state = {
  currentTab: 'anime',
  openState: {},
  categories: {},
  entries: {},
  entryUrls: {},
  entryColors: {},
  savedColors: [],
  defaults: {},
  searchQuery: '',
  isInitialized: false
};

// ===== Initialize Extension =====
async function initializeExtension() {
  try {
    // Load all data in one batch operation
    const keys = [
      'lastTab', 'openState', 'savedColors',
      'anime-categories', 'manga-categories', 'fiction-categories', 'misc-categories',
      'anime-entries', 'manga-entries', 'fiction-entries', 'misc-entries',
      'anime-urls', 'manga-urls', 'fiction-urls', 'misc-urls',
      'anime-colors', 'manga-colors', 'fiction-colors', 'misc-colors',
      'anime-default', 'manga-default', 'fiction-default', 'misc-default'
    ];
    
    const data = await Storage.getMultiple(keys);
    
    // Initialize defaults if needed
    const updates = {};
    ['anime','manga','fiction','misc'].forEach(tab => {
      if(!data[tab+'-categories']) {
        updates[tab+'-categories'] = defaultCategories[tab];
      }
      if(!data[tab+'-entries']) {
        updates[tab+'-entries'] = {};
      }
      if(!data[tab+'-urls']) {
        updates[tab+'-urls'] = {};
      }
      if(!data[tab+'-colors']) {
        updates[tab+'-colors'] = {};
      }
    });
    
    if(Object.keys(updates).length > 0) {
      await Storage.setMultiple(updates);
      Object.assign(data, updates);
    }
    
    // Load state
    state.currentTab = data.lastTab || 'anime';
    state.openState = data.openState || {};
    state.savedColors = data.savedColors || [];
    
    ['anime','manga','fiction','misc'].forEach(tab => {
      state.categories[tab] = data[tab+'-categories'] || defaultCategories[tab] || [];
      state.entries[tab] = data[tab+'-entries'] || {};
      state.entryUrls[tab] = data[tab+'-urls'] || {};
      state.entryColors[tab] = data[tab+'-colors'] || {};
      state.defaults[tab] = data[tab+'-default'] || (state.categories[tab] && state.categories[tab][0]);
    });
    
    state.isInitialized = true;
    
    // Initial render
    activateTab(state.currentTab);
    
  } catch(error) {
    console.error('Failed to initialize:', error);
    alert('Failed to load data. Please reload the extension.');
  }
}

// ===== SMART TITLE GROUPING (SINGLE CATEGORY) =====
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

// ===== NEW: CROSS-CATEGORY SMART GROUPING =====
function findSimilarTitleInAllCategories(tab, newTitle) {
  const baseTitle = newTitle
    .replace(/Chapter\s+\d+/i, '')
    .replace(/Episode\s+\d+/i, '')
    .replace(/E\d+/i, '')
    .replace(/CH\s*\d+/i, '')
    .replace(/V\d+/i, '')
    .replace(/S\d+/i, '')
    .replace(/\s*-\s*[A-Z-]+\s*$/i, '')
    .trim()
    .toLowerCase();
  
  const entries = state.entries[tab];
  const matches = [];
  
  // Search through all categories
  Object.keys(entries).forEach(category => {
    const categoryEntries = entries[category];
    
    for (let i = categoryEntries.length - 1; i >= 0; i--) {
      const entryBase = categoryEntries[i]
        .replace(/Chapter\s+\d+/i, '')
        .replace(/Episode\s+\d+/i, '')
        .replace(/E\d+/i, '')
        .replace(/CH\s*\d+/i, '')
        .replace(/V\d+/i, '')
        .replace(/S\d+/i, '')
        .replace(/\s*-\s*[A-Z-]+\s*$/i, '')
        .trim()
        .toLowerCase();
      
      if (entryBase === baseTitle || 
          (baseTitle.length > 10 && entryBase.includes(baseTitle)) ||
          (baseTitle.length > 10 && baseTitle.includes(entryBase))) {
        matches.push({
          category: category,
          index: i,
          title: categoryEntries[i]
        });
        break; // Only get last match per category
      }
    }
  });
  
  return matches;
}

// ===== Data Functions (with caching) =====
function getCategories(tab){ return state.categories[tab] || []; }
function getEntries(tab){ return state.entries[tab] || {}; }
function getDefaultCategory(tab){ 
  if (!state.defaults[tab] && state.categories[tab] && state.categories[tab].length > 0) {
    state.defaults[tab] = state.categories[tab][0];
  }
  return state.defaults[tab] || (state.categories[tab] && state.categories[tab][0]);
}

async function saveCategories(tab, cats) {
  state.categories[tab] = cats;
  await Storage.set(tab+'-categories', cats);
}

async function saveEntries(tab, entries) {
  state.entries[tab] = entries;
  await Storage.set(tab+'-entries', entries);
}

async function saveEntryUrls(tab, urls) {
  if (!state.entryUrls) state.entryUrls = {};
  state.entryUrls[tab] = urls;
  await Storage.set(tab+'-urls', urls);
}

async function saveEntryColors(tab, colors) {
  if (!state.entryColors) state.entryColors = {};
  state.entryColors[tab] = colors;
  await Storage.set(tab+'-colors', colors);
}

async function setDefaultCategory(tab, cat) {
  state.defaults[tab] = cat;
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

// ===== NEW: Show Color Picker =====
function showColorPicker(tab, cat, idx, item, li) {
  // Remove any existing color pickers
  document.querySelectorAll('.color-picker-popup').forEach(el => el.remove());
  
  const picker = document.createElement('div');
  picker.className = 'color-picker-popup';
  picker.style.cssText = `
    position: fixed;
    background: #2a2b33;
    border-radius: 10px;
    padding: 16px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
    z-index: 9999;
    width: 230px;
    border: 1px solid #3a3b44;
    display: flex;
    flex-direction: column;
    align-items: center;
  `;
  
  // Get current color
  const colorKey = `${cat}:${item}`;
  const currentColor = (state.entryColors[tab] && state.entryColors[tab][colorKey]) || '#4a90e2';
  
  // Convert hex to HSL
  function hexToHSL(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
  }
  
  // Convert HSL to hex
  function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }
  
  let currentHSL = hexToHSL(currentColor);
  
  // Circular color wheel canvas
  const wheelCanvas = document.createElement('canvas');
  wheelCanvas.width = 160;
  wheelCanvas.height = 160;
  wheelCanvas.style.cssText = `
    display: block;
    margin: 0 auto 12px auto;
    cursor: crosshair;
    border-radius: 50%;
  `;
  
  const ctx = wheelCanvas.getContext('2d');
  
  function drawColorWheel(lightness) {
    const centerX = 80;
    const centerY = 80;
    const radius = 80;
    
    for (let angle = 0; angle < 360; angle++) {
      for (let r = 0; r < radius; r++) {
        const saturation = (r / radius) * 100;
        const color = hslToHex(angle, saturation, lightness);
        
        ctx.fillStyle = color;
        ctx.beginPath();
        const rad = (angle * Math.PI) / 180;
        const x = centerX + r * Math.cos(rad);
        const y = centerY + r * Math.sin(rad);
        ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }
  
  drawColorWheel(currentHSL.l);
  
  // Lightness slider
  const lightnessContainer = document.createElement('div');
  lightnessContainer.style.cssText = `
    margin-bottom: 12px;
    width: 160px;
  `;
  
  const lightnessLabel = document.createElement('div');
  lightnessLabel.textContent = 'Brightness';
  lightnessLabel.style.cssText = `
    font-size: 11px;
    color: #bbb;
    margin-bottom: 4px;
    text-align: center;
  `;
  
  const lightnessSlider = document.createElement('input');
  lightnessSlider.type = 'range';
  lightnessSlider.min = '20';
  lightnessSlider.max = '80';
  lightnessSlider.value = currentHSL.l;
  lightnessSlider.style.cssText = `
    width: 100%;
    cursor: pointer;
  `;
  
  lightnessSlider.addEventListener('input', (e) => {
    currentHSL.l = parseFloat(e.target.value);
    drawColorWheel(currentHSL.l);
    updatePreview();
  });
  
  lightnessContainer.appendChild(lightnessLabel);
  lightnessContainer.appendChild(lightnessSlider);
  
  // Color preview
  const previewContainer = document.createElement('div');
  previewContainer.style.cssText = `
    margin-bottom: 12px;
    width: 160px;
  `;
  
  const previewLabel = document.createElement('div');
  previewLabel.textContent = 'Preview';
  previewLabel.style.cssText = `
    font-size: 11px;
    color: #bbb;
    margin-bottom: 4px;
    text-align: center;
  `;
  
  const colorPreview = document.createElement('div');
  colorPreview.style.cssText = `
    width: 100%;
    height: 35px;
    border-radius: 6px;
    border: 2px solid #3a3b44;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    text-shadow: 0 1px 3px rgba(0,0,0,0.5);
  `;
  
  function updatePreview() {
    const hex = hslToHex(currentHSL.h, currentHSL.s, currentHSL.l);
    colorPreview.style.background = hex;
    colorPreview.textContent = hex.toUpperCase();
  }
  
  updatePreview();
  
  previewContainer.appendChild(previewLabel);
  previewContainer.appendChild(colorPreview);
  
  // Handle wheel clicks
  wheelCanvas.addEventListener('click', (e) => {
    const rect = wheelCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left - 80;
    const y = e.clientY - rect.top - 80;
    
    const distance = Math.sqrt(x * x + y * y);
    if (distance > 80) return; // Outside circle
    
    currentHSL.h = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    currentHSL.s = Math.min((distance / 80) * 100, 100);
    
    updatePreview();
  });
  
  // Saved Colors Section
  if (state.savedColors.length > 0) {
    const savedTitle = document.createElement('div');
    savedTitle.textContent = '★ Saved Colors';
    savedTitle.style.cssText = `
      font-size: 11px;
      font-weight: 600;
      color: #bbb;
      margin-bottom: 6px;
      text-align: center;
    `;
    picker.appendChild(savedTitle);
    
    const savedColorsContainer = document.createElement('div');
    savedColorsContainer.style.cssText = `
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      justify-content: center;
      margin-bottom: 12px;
      max-height: 50px;
      overflow-y: auto;
    `;
    
    state.savedColors.forEach((savedColor, savedIdx) => {
      const savedBtn = document.createElement('button');
      savedBtn.style.cssText = `
        width: 28px;
        height: 28px;
        border-radius: 5px;
        border: 2px solid #3a3b44;
        cursor: pointer;
        transition: all 0.2s;
        background: ${savedColor};
      `;
      savedBtn.title = `Click: Use ${savedColor}\nRight-click: Delete`;
      
      // Click to use color AND auto-apply
      savedBtn.addEventListener('click', async () => {
        currentHSL = hexToHSL(savedColor);
        lightnessSlider.value = currentHSL.l;
        drawColorWheel(currentHSL.l);
        updatePreview();
        
        // AUTO-APPLY: Save color immediately
        if (!state.entryColors[tab]) state.entryColors[tab] = {};
        state.entryColors[tab][colorKey] = savedColor;
        await saveEntryColors(tab, state.entryColors[tab]);
        
        // Update the list item background
        applyColorToListItem(li, savedColor);
        
        // Remove picker
        picker.remove();
      });
      
      // Right-click to delete
      savedBtn.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        if (confirm(`Delete color ${savedColor}?`)) {
          state.savedColors.splice(savedIdx, 1);
          await Storage.set('savedColors', state.savedColors);
          savedBtn.remove();
          if (state.savedColors.length === 0) {
            savedTitle.remove();
            savedColorsContainer.remove();
          }
        }
      });
      
      savedBtn.addEventListener('mouseenter', () => {
        savedBtn.style.transform = 'scale(1.15)';
        savedBtn.style.borderColor = '#4a90e2';
      });
      
      savedBtn.addEventListener('mouseleave', () => {
        savedBtn.style.transform = 'scale(1)';
        savedBtn.style.borderColor = '#3a3b44';
      });
      
      savedColorsContainer.appendChild(savedBtn);
    });
    
    picker.appendChild(savedColorsContainer);
  }
  
  // Assemble picker
  picker.appendChild(wheelCanvas);
  picker.appendChild(lightnessContainer);
  picker.appendChild(previewContainer);
  
  // Buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = `
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px;
    width: 160px;
  `;
  
  // Save Color button
  const saveColorBtn = document.createElement('button');
  saveColorBtn.textContent = '💾';
  saveColorBtn.title = 'Save to favorites';
  saveColorBtn.style.cssText = `
    padding: 8px;
    border-radius: 5px;
    border: none;
    background: #9b59b6;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  `;
  saveColorBtn.addEventListener('mouseenter', () => {
    saveColorBtn.style.background = '#8e44ad';
    saveColorBtn.style.transform = 'scale(1.05)';
  });
  saveColorBtn.addEventListener('mouseleave', () => {
    saveColorBtn.style.background = '#9b59b6';
    saveColorBtn.style.transform = 'scale(1)';
  });
  saveColorBtn.addEventListener('click', async () => {
    const colorToSave = hslToHex(currentHSL.h, currentHSL.s, currentHSL.l);
    if (!state.savedColors.includes(colorToSave)) {
      state.savedColors.push(colorToSave);
      await Storage.set('savedColors', state.savedColors);
      saveColorBtn.textContent = '✓';
      setTimeout(() => {
        saveColorBtn.textContent = '💾';
      }, 1000);
    }
  });
  
  // Apply button
  const applyBtn = document.createElement('button');
  applyBtn.textContent = '✓';
  applyBtn.title = 'Apply color';
  applyBtn.style.cssText = `
    padding: 8px;
    border-radius: 5px;
    border: none;
    background: #27ae60;
    color: #fff;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  `;
  applyBtn.addEventListener('mouseenter', () => {
    applyBtn.style.background = '#229954';
    applyBtn.style.transform = 'scale(1.05)';
  });
  applyBtn.addEventListener('mouseleave', () => {
    applyBtn.style.background = '#27ae60';
    applyBtn.style.transform = 'scale(1)';
  });
  applyBtn.addEventListener('click', async () => {
    const selectedColor = hslToHex(currentHSL.h, currentHSL.s, currentHSL.l);
    
    // Save color
    if (!state.entryColors[tab]) state.entryColors[tab] = {};
    state.entryColors[tab][colorKey] = selectedColor;
    await saveEntryColors(tab, state.entryColors[tab]);
    
    // Update the list item background
    applyColorToListItem(li, selectedColor);
    
    // Remove picker
    picker.remove();
  });
  
  // Remove button
  const removeBtn = document.createElement('button');
  removeBtn.textContent = '✖';
  removeBtn.title = 'Remove color';
  removeBtn.style.cssText = `
    padding: 8px;
    border-radius: 5px;
    border: none;
    background: #e74c3c;
    color: #fff;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  `;
  removeBtn.addEventListener('mouseenter', () => {
    removeBtn.style.background = '#c0392b';
    removeBtn.style.transform = 'scale(1.05)';
  });
  removeBtn.addEventListener('mouseleave', () => {
    removeBtn.style.background = '#e74c3c';
    removeBtn.style.transform = 'scale(1)';
  });
  removeBtn.addEventListener('click', async () => {
    // Remove color
    if (state.entryColors[tab] && state.entryColors[tab][colorKey]) {
      delete state.entryColors[tab][colorKey];
      await saveEntryColors(tab, state.entryColors[tab]);
    }
    
    // Update the list item background
    applyColorToListItem(li, null);
    
    // Remove picker
    picker.remove();
  });
  
  buttonsContainer.appendChild(saveColorBtn);
  buttonsContainer.appendChild(applyBtn);
  buttonsContainer.appendChild(removeBtn);
  picker.appendChild(buttonsContainer);
  
  // Position picker in center of screen
  picker.style.position = 'fixed';
  picker.style.top = '50%';
  picker.style.left = '50%';
  picker.style.transform = 'translate(-50%, -50%)';
  
  document.body.appendChild(picker);
  
  // Close picker when clicking outside
  setTimeout(() => {
    const closeHandler = (e) => {
      if (!picker.contains(e.target)) {
        picker.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    document.addEventListener('click', closeHandler);
  }, 100);
}

// ===== NEW: Apply Color to List Item =====
function applyColorToListItem(li, color) {
  if (color) {
    // Subtle gradient: 30% color at start, fades to UI theme by 45%
    li.style.background = `linear-gradient(90deg, ${color}4D 0%, #1f2028 45%)`;
  } else {
    li.style.background = '#1f2028';
  }
}

// ===== Create List Item =====
function createListItem(tab, cat, item, idx) {
  const li = document.createElement('li');
  li.setAttribute('draggable','true');
  li.dataset.idx = idx;
  li.dataset.cat = cat;
  li.style.cursor = 'grab';
  
  // Apply saved color if exists
  const colorKey = `${cat}:${item}`;
  const savedColor = state.entryColors[tab] && state.entryColors[tab][colorKey];
  if (savedColor) {
    applyColorToListItem(li, savedColor);
  }
  
  // URL dot button
  const urlDot = document.createElement('span');
  urlDot.textContent = '●';
  urlDot.className = 'url-dot';
  urlDot.style.fontSize = '20px';
  urlDot.style.marginRight = '8px';
  urlDot.style.cursor = 'pointer';
  urlDot.style.transition = 'all 0.2s';
  urlDot.style.flexShrink = '0';
  
  // Check if URL exists - using title as key
  const hasUrl = state.entryUrls[tab] && state.entryUrls[tab][item];
  
  if (hasUrl) {
    urlDot.style.color = '#4a90e2';
    urlDot.style.opacity = '1';
    urlDot.title = 'Open saved page';
  } else {
    urlDot.style.color = '#666';
    urlDot.style.opacity = '0.3';
    urlDot.title = 'No URL saved';
  }
  
  urlDot.addEventListener('click', (e) => {
    e.stopPropagation();
    if (hasUrl) {
      const url = state.entryUrls[tab][item];
      chrome.tabs.create({ url: url });
    }
  });
  
  urlDot.addEventListener('mouseenter', () => {
    if (hasUrl) {
      urlDot.style.transform = 'scale(1.3)';
      urlDot.style.opacity = '1';
    }
  });
  
  urlDot.addEventListener('mouseleave', () => {
    urlDot.style.transform = 'scale(1)';
    if (!hasUrl) {
      urlDot.style.opacity = '0.3';
    }
  });
  
  const spanText = document.createElement('span');
  spanText.textContent = item;
  spanText.className = 'title-text';
  spanText.style.flex = '1';
  spanText.style.marginRight = '4px';
  spanText.style.cursor = 'text';
  
  // DOUBLE-CLICK TO RENAME
  spanText.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    handleItemRename(e, tab, cat, idx, item, li, spanText);
  });
  
  // Color picker button
  const colorBtn = document.createElement('span');
  colorBtn.textContent = '🎨';
  colorBtn.className = 'color-btn';
  colorBtn.style.cursor = 'pointer';
  colorBtn.style.opacity = '0.7';
  colorBtn.style.marginLeft = '6px';
  colorBtn.style.fontSize = '14px';
  colorBtn.title = 'Change color';
  colorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showColorPicker(tab, cat, idx, item, li);
  });
  colorBtn.addEventListener('mouseenter', () => { colorBtn.style.opacity = '1'; });
  colorBtn.addEventListener('mouseleave', () => { colorBtn.style.opacity = '0.7'; });
  
  const copyBtn = document.createElement('span');
  copyBtn.textContent = '📋';
  copyBtn.className = 'copy';
  copyBtn.style.cursor = 'pointer';
  copyBtn.style.opacity = '0.7';
  copyBtn.style.marginLeft = '6px';
  copyBtn.style.fontSize = '14px';
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item).then(() => {
      // Visual feedback
      copyBtn.textContent = '✓';
      copyBtn.style.color = '#4a90e2';
      setTimeout(() => {
        copyBtn.textContent = '📋';
        copyBtn.style.color = '';
      }, 1000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      copyBtn.textContent = '✗';
      copyBtn.style.color = '#e74c3c';
      setTimeout(() => {
        copyBtn.textContent = '📋';
        copyBtn.style.color = '';
      }, 1000);
    });
  });
  copyBtn.addEventListener('mouseenter', () => { copyBtn.style.opacity = '1'; });
  copyBtn.addEventListener('mouseleave', () => { copyBtn.style.opacity = '0.7'; });
  
  const deleteBtn = document.createElement('span');
  deleteBtn.textContent = '✖';
  deleteBtn.className = 'delete';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleItemDelete(tab, cat, idx, item);
  });
  
  li.appendChild(urlDot);
  li.appendChild(spanText);
  li.appendChild(colorBtn);
  li.appendChild(copyBtn);
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
      // Update color key if exists
      const oldColorKey = `${cat}:${item}`;
      const newColorKey = `${cat}:${newVal}`;
      if (state.entryColors[tab] && state.entryColors[tab][oldColorKey]) {
        state.entryColors[tab][newColorKey] = state.entryColors[tab][oldColorKey];
        delete state.entryColors[tab][oldColorKey];
        await saveEntryColors(tab, state.entryColors[tab]);
      }
      
      // Update the entry
      state.entries[tab][cat][idx] = newVal;
      
      // Transfer URL from old title to new title
      if (state.entryUrls[tab] && state.entryUrls[tab][item]) {
        state.entryUrls[tab][newVal] = state.entryUrls[tab][item];
        delete state.entryUrls[tab][item];
        await saveEntryUrls(tab, state.entryUrls[tab]);
      }
      
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
async function handleItemDelete(tab, cat, idx, item) {
  // Remove color if exists
  const colorKey = `${cat}:${item}`;
  if (state.entryColors[tab] && state.entryColors[tab][colorKey]) {
    delete state.entryColors[tab][colorKey];
    await saveEntryColors(tab, state.entryColors[tab]);
  }
  
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

// ===== EXTRACT EPISODE/CHAPTER FROM URL AND PAGE =====
async function extractEpisodeInfo(tab) {
  // Skip extraction for chrome:// and other restricted URLs
  if (tab.url.startsWith('chrome://') || 
      tab.url.startsWith('chrome-extension://') || 
      tab.url.startsWith('about:') ||
      tab.url.startsWith('edge://')) {
    return { title: tab.title, episodeNum: null, type: null };
  }
  
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const url = window.location.href;
        const title = document.title;
        const bodyText = document.body.innerText.substring(0, 500);
        
        const patterns = [
          /[?&]ep=(\d+)/i,
          /[?&]episode=(\d+)/i,
          /[?&]ch=(\d+)/i,
          /[?&]chapter=(\d+)/i,
          /episode[-_](\d+)/i,
          /ep[-_](\d+)/i,
          /-e(\d+)/i,
          /\/e(\d+)/i,
          /chapter[-_](\d+)/i,
          /ch[-_](\d+)/i,
          /episode\s*(\d+)/i,
          /ep\.\s*(\d+)/i,
          /chapter\s*(\d+)/i,
          /ch\.\s*(\d+)/i,
          /s(\d+)e(\d+)/i,
          /season\s*(\d+)\s*episode\s*(\d+)/i,
          /v(\d+)\s*ch(\d+)/i,
          /vol\.\s*(\d+)\s*ch\.\s*(\d+)/i
        ];
        
        let episodeNum = null;
        let seasonNum = null;
        let volumeNum = null;
        let type = null;
        
        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match) {
            if (pattern.source.includes('season')) {
              seasonNum = match[1];
              episodeNum = match[2];
              type = 'season-episode';
              break;
            } else if (pattern.source.includes('s(') && pattern.source.includes('e(')) {
              seasonNum = match[1];
              episodeNum = match[2];
              type = 'season-episode';
              break;
            } else if (pattern.source.includes('v(') || pattern.source.includes('vol')) {
              volumeNum = match[1];
              episodeNum = match[2];
              type = 'volume-chapter';
              break;
            } else if (pattern.source.includes('ep')) {
              episodeNum = match[1];
              type = 'episode';
              break;
            } else if (pattern.source.includes('chapter') || pattern.source.includes('ch')) {
              episodeNum = match[1];
              type = 'chapter';
              break;
            }
          }
        }
        
        if (!episodeNum) {
          for (const pattern of patterns) {
            const match = title.match(pattern);
            if (match) {
              if (pattern.source.includes('season')) {
                seasonNum = match[1];
                episodeNum = match[2];
                type = 'season-episode';
                break;
              } else if (pattern.source.includes('s(') && pattern.source.includes('e(')) {
                seasonNum = match[1];
                episodeNum = match[2];
                type = 'season-episode';
                break;
              } else if (pattern.source.includes('v(') || pattern.source.includes('vol')) {
                volumeNum = match[1];
                episodeNum = match[2];
                type = 'volume-chapter';
                break;
              } else if (pattern.source.includes('ep')) {
                episodeNum = match[1];
                type = 'episode';
                break;
              } else if (pattern.source.includes('chapter') || pattern.source.includes('ch')) {
                episodeNum = match[1];
                type = 'chapter';
                break;
              }
            }
          }
        }
        
        if (!episodeNum) {
          for (const pattern of patterns) {
            const match = bodyText.match(pattern);
            if (match) {
              if (pattern.source.includes('chapter') || pattern.source.includes('ch')) {
                episodeNum = match[1];
                type = 'chapter';
                break;
              } else if (pattern.source.includes('ep')) {
                episodeNum = match[1];
                type = 'episode';
                break;
              }
            }
          }
        }
        
        return { title, url, episodeNum, seasonNum, volumeNum, type };
      }
    });
    
    return result.result;
  } catch (error) {
    console.error('Failed to extract episode info:', error);
    // Return basic info if extraction fails
    return { title: tab.title, episodeNum: null, type: null };
  }
}

// ===== SMART TITLE BUILDER =====
function buildSmartTitle(info) {
  let title = info.title;
  
  // Remove "Watch" prefix and streaming site names
  title = title.replace(/^(Watch|Read|Stream)\s+/i, '');
  title = title.replace(/\s*[-|]\s*(Crunchyroll|Funimation|Netflix|Hulu|MAL|MyAnimeList|MangaDex|Anicrush|AnimeDao|GogoAnime|9anime|Zoro\.to|AnimeFlix).*$/i, '');
  title = title.replace(/\s+(Online|Free|HD|Dubbed|Subbed|Sub|Dub)\s*(on|at)?\s*.*$/i, '');
  
  // Extract season number from title if present
  const seasonMatch = title.match(/Season\s*(\d+)/i);
  let seasonNum = info.seasonNum;
  if (seasonMatch && !seasonNum) {
    seasonNum = seasonMatch[1];
  }
  
  // If we found episode/chapter info, append it in a clean format
  if (info.episodeNum) {
    // Remove any existing episode/chapter info from title
    title = title.replace(/\s*[-—]\s*(Episode|EP|Chapter|CH|Ch)\s*\d+.*/i, '');
    title = title.replace(/\s*S\d+\s*E\d+.*/i, '');
    title = title.replace(/\s*Season\s*\d+.*/i, '');
    title = title.replace(/\s*\d+\s*$/, '');
    
    title = title.trim();
    
    // Add formatted episode/chapter info
    if (seasonNum) {
      title += ` S${seasonNum} - E${info.episodeNum}`;
    } else if (info.type === 'volume-chapter' && info.volumeNum) {
      title += ` V${info.volumeNum} CH${info.episodeNum}`;
    } else if (info.type === 'chapter') {
      title += ` Chapter ${info.episodeNum}`;
    } else if (info.type === 'episode' || info.episodeNum) {
      title += ` Episode ${info.episodeNum}`;
    }
  }
  
  return formatTitle(title);
}

// ===== NEW: SHOW CATEGORY CHOICE DIALOG =====
function showCategoryChoiceDialog(tab, title, url, matches) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: #2a2b33;
    border-radius: 12px;
    padding: 20px;
    max-width: 380px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  `;
  
  // Title
  const dialogTitle = document.createElement('div');
  dialogTitle.textContent = '🔍 Similar Title Found!';
  dialogTitle.style.cssText = `
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 12px;
    color: #4a90e2;
  `;
  
  // Message
  const message = document.createElement('div');
  message.style.cssText = `
    margin-bottom: 16px;
    color: #eee;
    font-size: 14px;
    line-height: 1.5;
  `;
  
  const truncatedTitle = title.length > 50 ? title.substring(0, 50) + '...' : title;
  message.innerHTML = `
    <div style="margin-bottom: 8px;">Adding: <strong>${truncatedTitle}</strong></div>
    <div style="color: #bbb;">Found similar title in:</div>
  `;
  
  // Matches list
  const matchesList = document.createElement('div');
  matchesList.style.cssText = `
    margin: 12px 0;
    max-height: 150px;
    overflow-y: auto;
  `;
  
  matches.forEach(match => {
    const matchItem = document.createElement('div');
    matchItem.style.cssText = `
      background: #1f2028;
      padding: 8px 12px;
      margin-bottom: 6px;
      border-radius: 6px;
      font-size: 13px;
    `;
    matchItem.innerHTML = `
      <div style="color: #4a90e2; font-weight: 600;">${match.category.toUpperCase()}</div>
      <div style="color: #aaa; margin-top: 4px;">${match.title.length > 40 ? match.title.substring(0, 40) + '...' : match.title}</div>
    `;
    matchesList.appendChild(matchItem);
  });
  
  // Buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  `;
  
  // For each match, create a button
  matches.forEach(match => {
    const btn = document.createElement('button');
    btn.textContent = `Add to ${match.category.toUpperCase()}`;
    btn.style.cssText = `
      padding: 10px;
      border-radius: 8px;
      border: none;
      background: #4a90e2;
      color: #fff;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#5ba3f5';
      btn.style.transform = 'scale(1.02)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#4a90e2';
      btn.style.transform = 'scale(1)';
    });
    btn.addEventListener('click', () => {
      addToCategory(tab, match.category, title, url, match.index);
      document.body.removeChild(overlay);
    });
    buttonsContainer.appendChild(btn);
  });
  
  // Add to default button
  const defaultCat = state.defaults[tab];
  const defaultBtn = document.createElement('button');
  defaultBtn.textContent = `Add to ${defaultCat.toUpperCase()} (Default)`;
  defaultBtn.style.cssText = `
    padding: 10px;
    border-radius: 8px;
    border: 2px solid #4a90e2;
    background: transparent;
    color: #4a90e2;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  `;
  defaultBtn.addEventListener('mouseenter', () => {
    defaultBtn.style.background = '#4a90e2';
    defaultBtn.style.color = '#fff';
  });
  defaultBtn.addEventListener('mouseleave', () => {
    defaultBtn.style.background = 'transparent';
    defaultBtn.style.color = '#4a90e2';
  });
  defaultBtn.addEventListener('click', () => {
    addToCategory(tab, defaultCat, title, url, -1);
    document.body.removeChild(overlay);
  });
  
  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    padding: 10px;
    border-radius: 8px;
    border: none;
    background: #e74c3c;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 4px;
  `;
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.background = '#c0392b';
  });
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.background = '#e74c3c';
  });
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  
  // Assemble dialog
  dialog.appendChild(dialogTitle);
  dialog.appendChild(message);
  dialog.appendChild(matchesList);
  buttonsContainer.appendChild(defaultBtn);
  buttonsContainer.appendChild(cancelBtn);
  dialog.appendChild(buttonsContainer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}

// ===== NEW: ADD TO CATEGORY FUNCTION =====
async function addToCategory(tab, category, title, url, insertAfterIndex) {
  if(!state.entries[tab][category]) state.entries[tab][category] = [];
  if (!state.entryUrls[tab]) state.entryUrls[tab] = {};
  
  // Save URL using title as key
  state.entryUrls[tab][title] = url;
  
  // Insert after similar title or at end
  if (insertAfterIndex >= 0) {
    state.entries[tab][category].splice(insertAfterIndex + 1, 0, title);
  } else {
    state.entries[tab][category].push(title);
  }
  
  // Save both entries and URLs
  await saveEntries(tab, state.entries[tab]);
  await saveEntryUrls(tab, state.entryUrls[tab]);
  
  // Make sure category is open
  if(!state.openState[tab + '-' + category]) {
    state.openState[tab + '-' + category] = true;
    await Storage.set('openState', state.openState);
  }
  
  renderTab(tab);
  
  // Scroll to the newly added item
  setTimeout(() => {
    const list = document.getElementById(`${tab}-${category}`);
    if(list) {
      const items = list.querySelectorAll('li');
      const newItemIndex = insertAfterIndex >= 0 ? insertAfterIndex + 1 : items.length - 1;
      const newItem = items[newItemIndex];
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
}

// ===== ADD ENTRY BUTTON (UPDATED - ONLY SHOW DIALOG IF NOT IN DEFAULT) =====
document.getElementById('add-btn').addEventListener('click', async () => {
  const tab = state.currentTab;
  const defaultCat = state.defaults[tab];

  chrome.tabs.query({active:true, currentWindow:true}, async tabs => {
    const currentTab = tabs[0];
    if (!currentTab) return;
    
    // Extract episode/chapter info from URL and page
    const info = await extractEpisodeInfo(currentTab);
    const title = buildSmartTitle(info);
    const url = currentTab.url;
    
    // Check for similar titles across ALL categories
    const matches = findSimilarTitleInAllCategories(tab, title);
    
    // Filter out matches that are in the default category
    const nonDefaultMatches = matches.filter(match => match.category !== defaultCat);
    
    if (nonDefaultMatches.length > 0) {
      // Show dialog only if similar titles exist in OTHER categories
      showCategoryChoiceDialog(tab, title, url, nonDefaultMatches);
    } else {
      // Either no matches, or matches only in default - add to default with smart grouping
      const defaultCatIndex = matches.find(m => m.category === defaultCat)?.index ?? -1;
      addToCategory(tab, defaultCat, title, url, defaultCatIndex);
    }
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

// Keyboard shortcuts info section
const shortcutsSection = document.createElement('div');
shortcutsSection.style.marginTop = '8px';
shortcutsSection.innerHTML = `
  <div style="font-weight: 600; margin-bottom: 6px;">⌨️ Keyboard Shortcuts:</div>
  <div style="font-size: 12px; color: #bbb; line-height: 1.6; margin-bottom: 4px;">
    Set up keyboard shortcuts to:<br>
    • Open the extension<br>
    • Quick add current page (without opening popup)
  </div>
`;
document.querySelector('#settings-popup .settings-body').appendChild(shortcutsSection);

// Button to open Chrome shortcuts page
const shortcutsBtn = document.createElement('button');
shortcutsBtn.textContent = 'Customize Shortcuts';
shortcutsBtn.style.marginTop = '8px';
shortcutsBtn.style.width = '100%';
shortcutsBtn.style.background = '#9b59b6';
shortcutsBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});
document.querySelector('#settings-popup .settings-body').appendChild(shortcutsBtn);

// Second divider
const divider2 = document.createElement('div');
divider2.className = 'settings-divider';
document.querySelector('#settings-popup .settings-body').appendChild(divider2);

// Export button
const exportBtn = document.createElement('button');
exportBtn.textContent = 'Export Data';
exportBtn.style.marginTop = '8px';
exportBtn.style.width = '100%';
exportBtn.addEventListener('click', async () => {
  const data = {
    categories: state.categories,
    entries: state.entries,
    entryUrls: state.entryUrls,
    entryColors: state.entryColors,
    savedColors: state.savedColors,
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
        state.entryUrls = data.entryUrls || {};
        state.entryColors = data.entryColors || {};
        state.savedColors = data.savedColors || [];
        state.defaults = data.defaults || {};
        state.openState = data.openState || {};
        state.currentTab = data.lastTab || 'anime';
        
        // Save to storage
        const updates = {
          'openState': state.openState,
          'lastTab': state.currentTab,
          'savedColors': state.savedColors
        };
        
        ['anime','manga','fiction','misc'].forEach(tab => {
          updates[tab+'-categories'] = state.categories[tab];
          updates[tab+'-entries'] = state.entries[tab];
          updates[tab+'-urls'] = state.entryUrls[tab] || {};
          updates[tab+'-colors'] = state.entryColors[tab] || {};
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

// Third divider
const divider3 = document.createElement('div');
divider3.className = 'settings-divider';
document.querySelector('#settings-popup .settings-body').appendChild(divider3);

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
  
  // Initialize categories if undefined
  if (!cats) {
    cats = [];
    state.categories[tab] = cats;
  }
  
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