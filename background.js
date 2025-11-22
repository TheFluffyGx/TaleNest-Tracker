chrome.runtime.onInstalled.addListener(() => {
  console.log("TaleNest Tracker installed.");
});

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
  title = title.replace(/\s*[-|]\s*(Crunchyroll|Funimation|Netflix|Hulu|MAL|MyAnimeList|MangaDex|Anicrush|AnimeDao|GogoAnime|9anime|Zoro\.to|AnimeFlix|WebNovel).*$/i, '');
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

// ===== AUTO-FORMAT TITLE =====
function formatTitle(title){
  title = title.replace(/(S\d+)[ .-]?E(\d+)/i,'$1 - E$2');
  title = title.replace(/(V\d+)[ .-]?CH(\d+)/i,'$1 CH$2');
  return title;
}

// Handle quick-add keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "quick-add") {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    
    // Get current active tab from storage
    const data = await chrome.storage.local.get(['lastTab', 'anime-default', 'manga-default', 'fiction-default', 'misc-default']);
    const currentTab = data.lastTab || 'anime';
    const defaultCat = data[currentTab + '-default'];
    
    if (!defaultCat) {
      console.error('No default category set');
      return;
    }
    
    // Get entries
    const entriesKey = currentTab + '-entries';
    const urlsKey = currentTab + '-urls';
    const entriesData = await chrome.storage.local.get([entriesKey, urlsKey]);
    const entries = entriesData[entriesKey] || {};
    const urls = entriesData[urlsKey] || {};
    
    if (!entries[defaultCat]) {
      entries[defaultCat] = [];
    }
    
    // USE SMART TITLE EXTRACTION (same as manual add button)
    const info = await extractEpisodeInfo(tab);
    const title = buildSmartTitle(info);
    
    // Extract base title for matching
    const baseTitle = title
      .replace(/Chapter\s+\d+/i, '')
      .replace(/Episode\s+\d+/i, '')
      .replace(/E\d+/i, '')
      .replace(/CH\s*\d+/i, '')
      .replace(/V\d+/i, '')
      .replace(/S\d+/i, '')
      .replace(/\s*-\s*[A-Z-]+\s*$/i, '')
      .trim()
      .toLowerCase();
    
    let targetCategory = defaultCat;
    let insertIndex = -1;
    
    // Search through all categories for similar titles
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
          targetCategory = category;
          insertIndex = i;
          break;
        }
      }
      
      // If we found a match, stop searching other categories
      if (insertIndex >= 0) return;
    });
    
    // Add title and URL to the appropriate category
    urls[title] = tab.url;
    
    if (insertIndex >= 0) {
      // Insert right after the similar title
      entries[targetCategory].splice(insertIndex + 1, 0, title);
    } else {
      // No similar title found, add to end of default category
      entries[targetCategory].push(title);
    }
    
    // Save
    await chrome.storage.local.set({
      [entriesKey]: entries,
      [urlsKey]: urls
    });
    
    // Inject a small notification popup in the page
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (titleText, categoryName) => {
        // Create notification element
        const notification = document.createElement('div');
        notification.innerHTML = `✓ Added to <strong>${categoryName.toUpperCase()}</strong>!`;
        notification.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #27ae60;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-family: 'Segoe UI', sans-serif;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 999999;
          animation: slideIn 0.3s ease-out;
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
        document.body.appendChild(notification);
        
        // Remove after 2 seconds with animation
        setTimeout(() => {
          notification.style.animation = 'slideOut 0.3s ease-in';
          setTimeout(() => notification.remove(), 300);
        }, 2000);
      },
      args: [title, targetCategory]
    }).catch(err => {
      console.log('Could not inject notification (restricted page):', err);
    });
    
    console.log('Quick-added:', title, 'to category:', targetCategory);
  }
});