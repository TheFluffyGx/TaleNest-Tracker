# TaleNest Tracker

A cozy Chrome extension to track your anime, manga, fiction, and more - all in one place.

## ✨ Features

### 📚 **Multi-Type Tracking**
- Track **Anime**, **Manga**, **Fiction**, and **Misc** in separate organized tabs
- Quick tab switching for easy navigation
- Misc tab for tracking anything else (games, books, movies, etc.)

### 📂 **Custom Categories**
- Create unlimited custom categories (watching, completed, favorites, etc.)
- Drag-and-drop to reorder categories
- Set default category with star (☆) for quick adding
- Rename and delete categories with inline editing
- Delete default categories to fully customize your workflow

### 🎯 **Smart Title Management**
- **Auto-grouping**: Similar titles automatically group together (e.g., Chapter 369, 380, 400)
- **Smart episode detection**: Extracts episode/chapter numbers from URLs and page content
- **Auto-formatting**: Recognizes patterns like "S01E05", "V2 CH12", "?ep=1"
- **Auto-cleanup**: Removes site names and clutter from titles (Crunchyroll, Anicrush, etc.)
- **🔵 URL linking**: Blue dot button stores and opens the page where you saved each title
- **📋 One-click copy**: Copy any title to clipboard
- One-click add from current browser tab
- Inline rename and delete for each entry
- Drag titles to reorder within categories
- Drag titles between categories
- URLs automatically transfer when renaming titles

### 🔍 **Powerful Search**
- Search across all titles in all tabs
- Live highlighting of matches with pulse animation
- Navigate matches with ↑↓ arrow keys
- Auto-expands categories to show results
- Clear button to reset search

### 💾 **Data Management**
- Manual export to JSON file (includes all titles, categories, and URLs)
- Import from backup files
- Full data persistence using Chrome Storage API
- Reset extension option to start fresh

### 🔗 **URL Management**
- **Blue dot (●)**: Indicates saved URL - click to open original page
- **Gray dot (●)**: No URL saved yet
- Hover effect with scale animation
- URLs persist through renames and category moves

## 📦 Installation

### From Source (GitHub)

1. **Download the extension**
```bash
   git clone https://github.com/TheFluffyGx/TaleNest-Tracker.git
```
   Or download as ZIP and extract

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right corner)
   - Click **"Load unpacked"**
   - Select the `TaleNest-Tracker` folder
   - Done! The extension icon should appear in your toolbar

3. **Pin the extension** (optional)
   - Click the puzzle piece icon in Chrome toolbar
   - Find "TaleNest Tracker"
   - Click the pin icon to keep it visible

## 🚀 Usage Guide

### Adding Entries
1. Navigate to any webpage (anime site, manga reader, etc.)
2. Click the extension icon
3. Click the **+** button
4. The page title is automatically cleaned and formatted
5. Episode/chapter numbers are extracted from URL or page
6. The page URL is saved - click the blue dot to return later
7. Similar titles will group together automatically!

### Using the URL Dot Button
- **Blue dot (●)**: Page URL saved - click to open
- **Gray dot (●)**: No URL saved (old entries or manual additions)
- URLs are saved automatically when adding new titles
- Click the dot to open the saved page in a new tab

### Managing Categories
1. Click the **⚙️** (settings) icon
2. Select a tab (Anime/Manga/Fiction/Misc)
3. Enter category name and click "Add"
4. Categories appear immediately in the selected tab
5. Delete any category (including defaults) by clicking ✖

### Setting Default Category
- Click the **☆** next to any category name
- It turns red to indicate it's the default
- New entries will be added here by default

### Organizing Entries
- **Reorder**: Drag titles up/down within a category
- **Move**: Drag titles to different categories
- **Copy**: Click 📋 to copy title to clipboard
- **Rename**: Click ✏️ to edit title (URL transfers to new name)
- **Delete**: Click ✖ to remove entry
- **Open URL**: Click blue ● dot to open saved page

### Searching
1. Type in the search box at the bottom
2. Matching titles highlight in yellow with pulse effect
3. Use **↑** and **↓** arrow keys to navigate between matches
4. Categories auto-expand to show results
5. Click **×** to clear search

### Backup & Restore

**Manual Backup**:
1. Click **⚙️** settings
2. Click **"Export Data"**
3. JSON file downloads as `talenest-backup-YYYY-MM-DD.json`
4. Includes all titles, categories, URLs, and preferences

**Restore**:
1. Click **⚙️** settings
2. Click **"Import Data"**
3. Select your backup JSON file
4. Confirm to restore (replaces current data)

**Reset**:
1. Click **⚙️** settings
2. Click **"Reset Extension"** (red button)
3. Confirm to delete all data and start fresh

## 🎯 Use Cases

- **Anime Watchers**: Track multiple seasonal anime with episode links
- **Manga Readers**: Keep up with ongoing chapters across multiple series
- **Web Novel Fans**: Track fanfiction, light novels, and web serials
- **Multi-Media Trackers**: Use Misc tab for games, movies, podcasts, etc.
- **Quick Access**: Click blue dots to return to where you left off

## 📋 Default Categories

**Anime Tab:**
- Favorite
- Watching
- Completed

**Manga Tab:**
- Favorite
- Reading
- Completed

**Fiction Tab:**
- Favorite
- Fanfics
- Novel
- Completed

**Misc Tab:**
- Favorite
- Watching
- Completed

*All categories are fully customizable - delete defaults and create your own!*

## 🎨 Smart Title Detection

The extension automatically detects and formats episode/chapter information from:

**URL Patterns:**
- Query parameters: `?ep=1`, `?episode=5`, `?ch=100`
- Path patterns: `episode-12`, `ep-5`, `chapter-23`
- Season format: `s01e05`, `season-2-episode-3`
- Volume format: `v2ch12`, `vol-3-ch-45`

**Page Title Cleanup:**
- Removes site names (Crunchyroll, Anicrush, MangaDex, etc.)
- Removes "Watch", "Read", "Online", "Free", "HD"
- Extracts season numbers from titles
- Formats consistently across all sources

**Example Transformations:**
- `Watch Campfire Cooking Season 2 Online Free on Anicrush` → `Campfire Cooking S2 - E1`
- `Douluo Chapter 369 - WTR-LAB` → `Douluo Chapter 369`
- `My Hero Academia S06E12` → `My Hero Academia S6 - E12`

## 🔧 Technical Details

### Built With
- Vanilla JavaScript (no frameworks)
- Chrome Extension Manifest V3
- Chrome Storage API
- Chrome Scripting API (for smart episode detection)
- Modern CSS with custom properties and animations

### Permissions Used
- `storage`: Save your tracking data locally
- `tabs`: Get current page title and URL
- `activeTab`: Access active tab information
- `scripting`: Extract episode/chapter info from page content

### Browser Compatibility
- Chrome/Chromium-based browsers (tested on Chrome 120+)
- Manifest V3 compliant

## 🐛 Known Limitations

- Chrome internal pages (`chrome://`, `edge://`) cannot be accessed for episode detection
- Download location cannot be customized (uses browser's default Downloads folder)
- Auto-backup removed - use manual Export instead

## 📝 Version History

**v0.3** - Current
- Added Misc tab for miscellaneous content
- Added URL storage and blue dot navigation
- Added copy button for titles
- Smart episode/chapter detection from URLs and pages
- Auto-cleanup of site names and clutter
- Fixed category management bugs
- Removed auto-backup (manual export only)

**v0.2**
- Added drag-and-drop functionality
- Search with keyboard navigation
- Auto-grouping of similar titles
- Import/Export data

**v0.1**
- Initial release
- Basic tracking for Anime, Manga, Fiction
- Category management

**Made with ❤️ for anime, manga, and fiction enthusiasts**
