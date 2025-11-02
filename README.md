# TaleNest Tracker

A cozy Chrome extension to track your anime, manga, and fiction progress all in one place.

## ✨ Features

### 📚 **Multi-Type Tracking**
- Track **Anime**, **Manga**, and **Fiction** in separate organized tabs
- Quick tab switching for easy navigation

### 📂 **Custom Categories**
- Create unlimited custom categories (watching, completed, favorites, etc.)
- Drag-and-drop to reorder categories
- Set default category with star (☆) for quick adding
- Rename and delete categories with inline editing

### 🎯 **Smart Title Management**
- **Auto-grouping**: Similar titles automatically group together (e.g., Chapter 369, 380, 400)
- **Auto-formatting**: Recognizes patterns like "S01E05" or "V2 CH12"
- One-click add from current browser tab
- Inline rename and delete for each entry
- Drag titles to reorder within categories
- Drag titles between categories

### 🔍 **Powerful Search**
- Search across all titles in all tabs
- Live highlighting of matches
- Navigate matches with ↑↓ arrow keys
- Auto-expands categories to show results

### 💾 **Data Management**
- **Auto-backup**: Automatically exports data every 6 hours (only if changes made)
- Manual export to JSON file
- Import from backup files
- Full data persistence using Chrome storage API

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
   - Select the `talenest-tracker` folder
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
4. The page title is automatically added to your default category
5. Similar titles will group together automatically!

### Managing Categories
1. Click the **⚙️** (settings) icon
2. Select a tab (Anime/Manga/Fiction)
3. Enter category name and click "Add"
4. Categories appear immediately in the selected tab

### Setting Default Category
- Click the **☆** next to any category name
- It turns red to indicate it's the default
- New entries will be added here by default

### Organizing Entries
- **Reorder**: Drag titles up/down within a category
- **Move**: Drag titles to different categories
- **Rename**: Click the ✏️ icon next to any title
- **Delete**: Click the ✖ icon next to any title

### Searching
1. Type in the search box at the bottom
2. Matching titles highlight in yellow with pulse effect
3. Use **↑** and **↓** arrow keys to navigate between matches
4. Categories auto-expand to show results

### Backup & Restore
**Auto-Backup**: 
- Runs every 6 hours automatically
- Only creates backup if you made changes
- Files saved as `talenest-auto-backup-YYYY-MM-DD.json`

**Manual Backup**:
1. Click **⚙️** settings
2. Click **"Export Data"**
3. JSON file downloads to your Downloads folder

**Restore**:
1. Click **⚙️** settings
2. Click **"Import Data"**
3. Select your backup JSON file
4. Confirm to restore (replaces current data)

## 🎯 Use Cases

- **Anime Watchers**: Track multiple seasonal anime, completed series, and plan-to-watch lists
- **Manga Readers**: Keep up with ongoing chapters across multiple series
- **Web Novel Fans**: Track fanfiction, light novels, and web serials
- **Multi-Media Trackers**: Organize everything in one convenient place

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

*All categories are customizable!*

## 🔧 Technical Details

### Built With
- Vanilla JavaScript (no frameworks)
- Chrome Extension Manifest V3
- Chrome Storage API
- Modern CSS with custom properties

### Permissions Used
- `storage`: Save your tracking data locally
- `tabs`: Get current page title for quick adding
- `activeTab`: Access active tab information
