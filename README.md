# ImmoMetrica → Todoist

A modern Chrome extension that lets you add ImmoMetrica property listings to Todoist with one click.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-brightgreen)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![ES Modules](https://img.shields.io/badge/ES-Modules-orange)

## ✨ Features

- **One-click integration**: Add property listings to Todoist instantly
- **Smart extraction**: Automatically extracts property title, URL, and location
- **Location labels**: Automatically creates and assigns city labels (e.g., "Oranienburg", "Storkow")
- **Caching**: Efficiently stores project/section IDs to minimize API calls
- **Modern UI**: Clean, responsive options page with real-time feedback
- **Error handling**: Comprehensive error states with user-friendly messages
- **Privacy-focused**: API token stored locally in your browser only

## 🚀 Quick Start

### 1. Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/immometrica-to-todoist.git
   cd immometrica-to-todoist
   ```

2. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked" and select the project folder

### 2. Configuration

1. **Get your Todoist API token**
   - Go to [Todoist Settings → Integrations](https://todoist.com/prefs/integrations)
   - Copy your API token

2. **Configure the extension**
   - Right-click the extension icon and select "Options"
   - Paste your API token and click "Save Token"

3. **Set up your Todoist workspace**
   - Create a project named **"Akquise"**
   - Create a section named **"Noch nicht angefragt aber interessant"**

### 3. Usage

1. **Visit any ImmoMetrica property listing**
   - Navigate to a property page like `https://www.immometrica.com/de/offer/12345`

2. **Click the extension icon**
   - The property will be automatically added to your Todoist
   - The city name will be automatically extracted and added as a label
   - Success/error status will show as a badge on the extension icon

### How Location Detection Works

The extension automatically extracts the city name from the property listing using these patterns:
- **"Brandenburg - CityName"** → extracts "CityName" (e.g., "Oranienburg")  
- **"12345 CityName"** → extracts "CityName" from postal code + city format
- **Automatic labeling**: Creates Todoist labels like "Oranienburg", "Storkow", "Fürstenwalde"

If a label for the city already exists, it will be reused. If not, a new label is created automatically.

## 🏗️ Architecture

This extension follows modern Chrome Extension Manifest V3 patterns with clean separation of concerns:

```
├── manifest.json           # Extension configuration
├── service_worker.js       # Background logic and event handling
├── contentScript.js        # DOM extraction (injected on demand)
├── options.html/js         # Settings page
├── api/
│   └── todoistApi.js       # Todoist API client
└── utils/
    └── storage.js          # Chrome storage utilities
```

### Key Design Principles

- **Minimal permissions**: Only requests necessary permissions
- **On-demand injection**: Content script runs only when needed
- **Modern JavaScript**: ES modules, async/await, classes
- **Error-first design**: Comprehensive error handling and user feedback
- **Performance-focused**: Caching and efficient API usage

## 🔧 Technical Details

### Supported URLs
The extension activates on ImmoMetrica offer pages matching:
```
https://www.immometrica.com/de/offer/*
```

### Data Flow
1. User clicks extension icon on a property page
2. Service worker validates the page URL
3. Content script extracts property title and location from the DOM
4. Service worker resolves Todoist project/section IDs (cached)
5. Service worker finds or creates a location label (e.g., "Oranienburg")
6. Creates task via Todoist API v1 with title, description, and location label
7. Shows success/error feedback via badge

### API Integration
Uses the **Todoist REST API v1** with the following endpoints:
- `GET /projects` - Fetch user's projects
- `GET /sections` - Fetch project sections
- `GET /labels` - Fetch user's labels
- `POST /labels` - Create new location labels
- `POST /tasks` - Create new task with labels

### Storage
Uses `chrome.storage.local` to store:
- Todoist API token (encrypted by Chrome)
- Cached project and section IDs (24h TTL)

**Note**: Location labels are managed dynamically - the extension will automatically create labels for new cities as they are encountered.

## 🎯 Badge States

The extension provides visual feedback via badge icons:

| Badge | Meaning |
|-------|---------|
| `OK` | Task created successfully |
| `NO` | Not on a valid ImmoMetrica page |
| `TOK` | API token not configured |
| `BAD` | Invalid page data |
| `PRJ` | Target project not found |
| `SEC` | Target section not found |
| `AUTH` | Authentication failed |
| `NET` | Network error |
| `ERR` | General error |

## ⚙️ Configuration

### Required Todoist Setup

1. **Project**: Create a project named exactly **"Akquise"**
2. **Section**: Within that project, create a section named **"Noch nicht angefragt aber interessant"**

### Extension Options

Access via right-click → "Options" or `chrome-extension://.../options.html`

- **Todoist Token**: Your personal API token
- **Cache Management**: Clear cached project/section IDs
- **Status Display**: View current cache state and age

## 🔍 Troubleshooting

### Common Issues

**"Token not configured"**
- Solution: Add your Todoist API token in the extension options

**"Project 'Akquise' not found"**
- Solution: Create the required project in Todoist
- Alternative: Clear cache if you renamed the project

**"Section not found"**
- Solution: Create the required section within the Akquise project
- Alternative: Clear cache if you renamed the section

**"Not an ImmoMetrica offer page"**
- Solution: Navigate to a valid property listing URL

### Debug Mode

Enable debug logging in the browser console:
```javascript
// In browser console on any ImmoMetrica page
localStorage.setItem('debug', 'true');
```

## 🛡️ Privacy & Security

- **Local storage only**: Your API token never leaves your browser
- **Minimal permissions**: Only requests necessary Chrome permissions
- **No tracking**: No analytics or usage tracking
- **Open source**: Full transparency in code and functionality

## 🧪 Development

### Setup
```bash
# Install dependencies (if any)
npm install

# Load extension in Chrome
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select the project directory
```

### File Structure
- **Modern ES modules** throughout
- **No build process** required
- **Vanilla JavaScript** - no external dependencies
- **Chrome MV3** compliant

### Testing
1. Load extension in developer mode
2. Navigate to ImmoMetrica property pages
3. Test various scenarios (valid/invalid pages, missing config, etc.)
4. Check console for errors and debug logs

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🔗 Resources

- [Todoist API Documentation](https://developer.todoist.com/)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

---

**Happy property hunting! 🏠**