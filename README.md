# ImmoMetrica → Todoist

A minimal Chrome extension that adds ImmoMetrica property listings to Todoist with one click.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-brightgreen)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![ES Modules](https://img.shields.io/badge/ES-Modules-orange)

## ✨ Features

- **One-click integration**: Add property listings to Todoist instantly
- **Smart extraction**: Automatically extracts property title, URL, and location
- **Location labels**: Creates and assigns city labels automatically
- **Efficient caching**: Stores project/section IDs to minimize API calls
- **Clean UI**: Simple, responsive options page
- **Privacy-focused**: API token stored locally only

## 🚀 Quick Start

### 1. Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/immometrica-to-todoist.git
   cd immometrica-to-todoist
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project folder

### 2. Configuration

1. **Get Todoist API token**
   - Go to [Todoist Settings → Integrations](https://todoist.com/prefs/integrations)
   - Copy your API token

2. **Configure extension**
   - Right-click extension icon → "Options"
   - Paste API token and click "Save Token"

3. **Setup Todoist workspace**
   - Create project: **"Akquise"**
   - Create section: **"Noch nicht angefragt aber interessant"**

### 3. Usage

1. **Visit ImmoMetrica property listing**
   - Navigate to a property page like `https://www.immometrica.com/de/offer/12345`

2. **Click the extension icon**
   - Property automatically added to Todoist
   - City extracted and added as label
   - Status shown via badge on icon

### Location Detection

The extension extracts city names from property listings:

- **"Brandenburg - City"** → "City" 
- **"PostalCode, City"** → "City"
- **Address formats** → extracts city component

Examples:
- `"16515 Brandenburg - Oranienburg"` → **"Oranienburg"**
- `"14712 Brandenburg - Rathenow"` → **"Rathenow"**
- `"Ahornallee 26b, 15526, Bad Saarow"` → **"Bad Saarow"**

Labels are automatically created or reused if they exist.

## 🏗️ Architecture

Clean Manifest V3 structure:

```
├── manifest.json           # Extension config
├── service_worker.js       # Background logic 
├── contentScript.js        # DOM extraction
## 🔧 Technical Details

### Supported URLs
```
https://www.immometrica.com/de/offer/*
```

### Data Flow
1. User clicks extension icon
2. Content script extracts title and location
3. Service worker resolves project/section (cached)
4. Creates/finds location label 
5. Creates task via Todoist API
6. Shows status badge

### API Integration
Uses **Todoist API v2**:
- `GET /projects` - Fetch projects
- `GET /sections` - Fetch sections  
- `GET /labels` - Fetch labels
- `POST /labels` - Create labels
- `POST /tasks` - Create tasks

## 🎯 Badge Status Codes

| Badge | Meaning |
|-------|---------|
| OK    | Task created successfully |
| NO    | Not on a valid property page |
| TOK   | API token not configured |
| BAD   | Invalid property data |
| PRJ   | Project "Akquise" not found |
| SEC   | Section not found |
| AUTH  | API authentication failed |
| NET   | Network/connection error |
| ERR   | General error |

## �️ Development

### Prerequisites
- Chrome/Chromium browser
- Todoist account with API access

### Loading for Development
1. Clone repository
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select project folder

### File Structure
- **`manifest.json`** - Extension metadata and permissions
- **`service_worker.js`** - Background event handling
- **`contentScript.js`** - DOM content extraction
- **`options.html/js`** - Settings interface
- **`api/todoistApi.js`** - API client with error handling
- **`utils/storage.js`** - Chrome storage abstraction
- `POST /labels` - Create new location labels
- `POST /tasks` - Create new task with labels

### Storage
Uses `chrome.storage.local` to store:
- Todoist API token (encrypted by Chrome)
- Cached project and section IDs (24h TTL)

**Note**: Location labels are managed dynamically - the extension will automatically create labels for new cities as they are encountered.

## 🎯 Badge States

The extension provides visual feedback via badge icons:

## 🔍 Troubleshooting

### Common Issues

**"TOK" badge** - Add API token in extension options  
**"PRJ" badge** - Create "Akquise" project in Todoist  
**"SEC" badge** - Create section "Noch nicht angefragt aber interessant"  
**"NO" badge** - Visit a valid ImmoMetrica property page  
**"AUTH" badge** - Check API token validity  

### Required Setup
1. Project: **"Akquise"** 
2. Section: **"Noch nicht angefragt aber interessant"**

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

*Built with ❤️ for efficient property research workflows*