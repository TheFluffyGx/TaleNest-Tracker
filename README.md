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
- **Cross-category detection**: Finds similar titles in other categories and asks where to add
- **Smart episode detection**: Extracts episode/chapter numbers from URLs and page content
- **Auto-formatting**: Recognizes patterns like "S01E05", "V2 CH12", "?ep=1"
- **Auto-cleanup**: Removes site names and clutter from titles (Crunchyroll, Anicrush, WebNovel, etc.)
- **🔵 URL linking**: Blue dot button stores and opens the page where you saved each title
- **📋 One-click copy**: Copy any title to clipboard
- **Double-click to rename**: Quick inline editing by double-clicking any title
- One-click add from current browser tab
- Drag titles to reorder within categories
- Drag titles between categories
- URLs automatically transfer when renaming titles

### 🎨 **Custom Color Coding**
- **Circular color picker**: Beautiful HSL color wheel with unlimited colors
- **Custom gradients**: Each title can have a personalized color (30% opacity gradient)
- **Save favorite colors**: Build your own color palette for quick access
- **One-click apply**: Click saved colors to instantly apply them
- **Visual organization**: Color-code by priority, series, genre, or any system you want
- Colors persist through renames and exports

### ⌨️ **Keyboard Shortcuts**
- **Quick-add shortcut**: Add current page without opening the popup
- **Customizable hotkeys**: Set your own keyboard shortcuts in Chrome settings
- Smart grouping works with keyboard shortcuts too
- Visual confirmation with animated notification

### 🔍 **Powerful Search**
- Search across all titles in all tabs
- Live highlighting of matches with pulse animation
- Navigate matches with ↑↓ arrow keys
- Auto-expands categories to show results
- Clear button to reset search

### 💾 **Data Management**
- Manual export to JSON file (includes titles, categories, URLs, and colors)
- Import from backup files
- Full data persistence using Chrome Storage API
- Saved colors included in backups
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

4. **Set up keyboard shortcuts** (optional)
   - Go to `chrome://extensions/shortcuts`
   - Find "TaleNest Tracker"
   - Set shortcuts for "Open extension" and "Quick add current page"

## 🚀 Usage Guide

### Adding Entries

**Manual Add (+ Button):**
1. Navigate to any webpage (anime site, manga reader, etc.)
2. Click the extension icon
3. Click the **+** button
4. The page title is automatically cleaned and formatted
5. Episode/chapter numbers are extracted from URL or page
6. The page URL is saved - click the blue dot to return later
7. If similar titles exist in other categories, choose where to add
8. Similar titles group together automatically!

**Quick Add (Keyboard Shortcut):**
1. Navigate to any webpage
2. Press your configured keyboard shortcut (e.g., Alt+X)
3. Title is added instantly with smart grouping
4. Green notification shows which category it was added to
5. No need to open the popup!

### Using the URL Dot Button
- **Blue dot (●)**: Page URL saved - click to open
- **Gray dot (●)**: No URL saved (old entries or manual additions)
- URLs are saved automatically when adding new titles
- Click the dot to open the saved page in a new tab

### Color Coding Titles

1. Click the **🎨** icon next to any title
2. Circular color picker appears with:
   - **Color wheel**: Click anywhere to pick a color
   - **Brightness slider**: Adjust lightness (20-80%)
   - **Preview**: See how it will look with live hex code
   - **Saved colors**: Quick access to your favorite colors
3. Choose your color:
   - **Click wheel** to pick hue and saturation
   - **Adjust slider** for brightness
   - **Click saved color** for instant apply (no need for Apply button)
4. Click **💾** to save color to favorites for reuse
5. Click **✓** to apply the color
6. Click **✖** to remove color
7. Right-click saved colors to delete them

**Color Tips:**
- Use colors to mark priority (red = urgent, green = current, blue = backlog)
- Color-code by genre (orange = action, purple = romance, cyan = sci-fi)
- Mark similar series with the same color
- Save your most-used colors for quick access

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
- **Rename**: Double-click the title text to edit (or click ✏️)
- **Color**: Click 🎨 to add custom gradient color
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
4. Includes all titles, categories, URLs, colors, and saved color palette

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

- **Anime Watchers**: Track multiple seasonal anime with episode links and color-code by status
- **Manga Readers**: Keep up with ongoing chapters, color-code by update schedule
- **Web Novel Fans**: Track fanfiction, light novels, and web serials with custom colors
- **Multi-Media Trackers**: Use Misc tab for games, movies, podcasts with visual organization
- **Quick Access**: Click blue dots to return to where you left off
- **Priority System**: Use colors to mark what to read/watch next

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
- Removes site names (Crunchyroll, Anicrush, MangaDex, WebNovel, etc.)
- Removes "Watch", "Read", "Online", "Free", "HD"
- Extracts season numbers from titles
- Formats consistently across all sources

**Example Transformations:**
- `Watch Campfire Cooking Season 2 Online Free on Anicrush` → `Campfire Cooking S2 - E1`
- `Douluo Chapter 369 - WTR-LAB` → `Douluo Chapter 369`
- `My Hero Academia S06E12` → `My Hero Academia S6 - E12`
- `Sawada Tsunayoshi Chapter 205 - WebNovel` → `Sawada Tsunayoshi Chapter 205`

## 🔧 Technical Details

### Built With
- Vanilla JavaScript (no frameworks)
- Chrome Extension Manifest V3
- Chrome Storage API
- Chrome Scripting API (for smart episode detection)
- HTML5 Canvas (for circular color picker)
- Modern CSS with custom properties and animations

### Permissions Used
- `storage`: Save your tracking data locally
- `tabs`: Get current page title and URL
- `activeTab`: Access active tab information
- `scripting`: Extract episode/chapter info from page content

### Browser Compatibility
- Chrome/Chromium-based browsers (tested on Chrome 120+)
- Edge (Chromium-based)
- Brave
- Manifest V3 compliant

## 🛠 Known Limitations

- Chrome internal pages (`chrome://`, `edge://`) cannot be accessed for episode detection
- Download location cannot be customized (uses browser's default Downloads folder)
- Colors use 30% opacity gradient (fixed design for readability)

## 📝 Version History

**v3.0** - Current (Major Update)
- 🎨 **Custom color picker**: Beautiful circular HSL color wheel with unlimited colors
- 💾 **Save favorite colors**: Build personal color palette for quick reuse
- 🖱️ **Double-click to rename**: Quick inline editing without clicking edit button
- ⌨️ **Keyboard shortcuts**: Quick-add with customizable hotkeys
- 🔍 **Cross-category detection**: Finds similar titles across all categories
- 🎯 **Smart category dialog**: Asks where to add when similar titles exist elsewhere
- ⚡ **Auto-apply saved colors**: One-click color application from favorites
- 🎨 **Color management**: Right-click to delete saved colors
- 📊 **30% opacity gradients**: Subtle, readable color coding
- 🔄 **Enhanced export**: Backup includes saved color palette
- ✨ **UI polish**: Centered, compact color picker with live preview

**v2.0**
- Added Misc tab for miscellaneous content
- Added URL storage and blue dot navigation
- Added copy button for titles
- Smart episode/chapter detection from URLs and pages
- Auto-cleanup of site names and clutter
- Fixed category management bugs
- Removed auto-backup (manual export only)

**v1.0**
- Added drag-and-drop functionality
- Search with keyboard navigation
- Auto-grouping of similar titles
- Import/Export data

**v0.1**
- Initial release
- Basic tracking for Anime, Manga, Fiction
- Category management

## 📄 License

MIT License - Feel free to modify and distribute

---

**Made with ❤️ for anime, manga, and fiction enthusiasts**
