# ImmoMetrica → Todoist Chrome Extension

A smart Chrome extension that seamlessly integrates ImmoMetrica property listings with your Todoist workflow. Add interesting properties to your task list with one click, complete with automatic duplicate detection and location labeling.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-brightgreen)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![ES Modules](https://img.shields.io/badge/ES-Modules-orange)

## 📖 Setup Guides

**Choose your language for detailed setup instructions:**

🇺🇸 **[Complete Setup Guide - English](docs/setup-guide-en.md)**  
🇩🇪 **[Vollständige Installationsanleitung - Deutsch](docs/setup-guide-de.md)**

*These guides include step-by-step instructions with screenshots for non-technical users.*

---

## ✨ Features

### 🚀 **Core Functionality**
- **One-click integration**: Add property listings to Todoist instantly
- **Smart extraction**: Automatically extracts property title, URL, and location
- **Intelligent duplicate detection**: Prevents re-adding existing or completed tasks
- **Visual feedback**: Clear status badges show what's happening

### 🎯 **Smart Duplicate Prevention**
- **Active task detection**: Won't create duplicates of existing tasks
- **Completed task awareness**: Recognizes previously completed properties
- **Seamless UX**: Same green checkmark whether newly added or already exists
- **Persistent state**: Remembers task status when revisiting properties

### 🏷️ **Flexible Organization**
- **Configurable projects**: Choose any Todoist project or use Inbox
- **Optional sections**: Organize tasks within projects as needed
- **Default to Inbox**: Works immediately without project setup
- **Location labels**: Creates and assigns city labels automatically

### ⚡ **Performance & UX**
- **Efficient caching**: Stores project/section IDs to minimize API calls
- **Instant feedback**: Badge updates immediately when visiting properties
- **Clean interface**: Simple, responsive options page
- **Privacy-focused**: API token stored locally only

---

## 🎯 How It Works

### Visual Status System
The extension uses an intuitive badge system:

| Badge | Status | Meaning |
|-------|--------|---------|
| ✅ | **Success** | Task created or already exists (green) |
| ✓ | **Completed** | Property was already completed (gray) |
| 🔄 | **Processing** | Adding to Todoist (gray) |
| 🔗 | **Invalid Page** | Not on a property listing (red) |
| 🔑 | **Token Needed** | Configure API token (orange) |
| 📁 | **Setup Required** | Project/section setup needed (orange) |

### User Experience Flow
1. **Browse** ImmoMetrica properties normally
2. **See instant status** - badge shows if property is already tracked
3. **One-click adding** - click extension icon to add interesting properties  
4. **No duplicates** - smart detection prevents re-adding existing tasks
5. **Organized workflow** - all properties neatly organized in Todoist

---

## 🚀 Quick Start

### For Technical Users

1. **Clone and Install**
   ```bash
   git clone https://github.com/Justinus22/immometric-to-todoist.git
   cd immometrica-to-todoist
   ```
   - Load unpacked extension in Chrome (`chrome://extensions/`)
   - Enable Developer Mode → Load Unpacked → Select folder

2. **Configure**
   - Get API token from [Todoist Settings → Integrations](https://todoist.com/prefs/integrations)
   - Right-click extension icon → Options → Add token

3. **Set Up Todoist Structure (Optional)**
   - **Default**: Tasks go to Inbox (no setup needed)
   - **Custom**: Configure project/section in extension options
   - **Legacy**: Existing "Akquise" project users supported

### For Non-Technical Users
📚 **Follow the detailed setup guides above** - they include screenshots and explain every step clearly.

---

## 🏗️ Technical Architecture

### Modern Chrome Extension
- **Manifest V3**: Latest Chrome extension standard
- **ES Modules**: Clean, modular JavaScript architecture  
- **Service Worker**: Efficient background processing
- **Content Scripts**: Secure DOM data extraction

### API Integration
- **Todoist API v1**: Current unified API version
- **Intelligent caching**: 24-hour cache for projects/sections
- **Robust error handling**: Clear user feedback for all error states
- **Batch operations**: Efficient duplicate checking across projects

### Supported URLs
```
https://www.immometrica.com/de/offer/*
```

### Data Processing
1. **Content extraction** from ImmoMetrica property pages
2. **Location parsing** with intelligent city detection:
   - `"16515 Brandenburg - Oranienburg"` → **"Oranienburg"**
   - `"Ahornallee 26b, 15526, Bad Saarow"` → **"Bad Saarow"**
3. **Duplicate detection** across active and completed tasks
4. **Label management** with automatic city label creation

---

## 🔧 Configuration Options

### Required Todoist Structure
- **Default**: No setup required - uses Inbox
- **Custom**: Any project and section via extension options
- **Legacy**: "Akquise" project still supported for existing users

### Customization
- **Flexible project/section**: Configure any Todoist project and section via options page
- **Inbox support**: Default behavior uses Todoist Inbox with no section
- **Legacy compatibility**: Automatic fallback for existing "Akquise" project users
- **Label management**: Automatic city labels work with any project structure

---

## 🛠️ Development

### Prerequisites
- Chrome/Chromium browser with Developer Mode
- Todoist account with API access
- Basic knowledge of Chrome extension development

### Development Setup
```bash
# Clone repository
git clone https://github.com/Justinus22/immometric-to-todoist.git
cd immometrica-to-todoist

# Load in Chrome
# 1. Open chrome://extensions/
# 2. Enable Developer Mode
# 3. Click "Load unpacked"
# 4. Select project folder
```

### File Structure
```
├── manifest.json           # Extension configuration
├── service_worker.js       # Background logic & API integration
├── contentScript.js        # DOM content extraction
├── options.html/js         # Settings interface
├── api/
│   └── todoistApi.js      # Todoist API client with v1 integration
├── utils/
│   └── storage.js         # Chrome storage abstraction
└── docs/
    ├── setup-guide-en.md  # English setup guide
    └── setup-guide-de.md  # German setup guide
```

### Key Components
- **Background Service Worker**: Handles all Todoist API interactions
- **Content Script**: Extracts property data from ImmoMetrica pages
- **Options Interface**: User-friendly configuration panel
- **Storage Layer**: Encrypted local storage for tokens and cache

---

## 🔍 Troubleshooting

### Quick Fixes

| Problem | Solution |
|---------|----------|
| 🔑 Token error | Add valid API token in Options |
| 📁 Project error | Configure project in Options or use default Inbox |
| 🔗 Page error | Visit valid ImmoMetrica property page |
| ❌ Network error | Check internet connection |
| Extension missing | Check if enabled in `chrome://extensions/` |

### Detailed Support
- **Setup issues**: Follow the detailed setup guides linked above
- **API problems**: Verify token at [Todoist Integrations](https://todoist.com/prefs/integrations)
- **Bug reports**: [GitHub Issues](https://github.com/Justinus22/immometric-to-todoist/issues)

---

## 📈 Recent Updates

### v2.0 - Smart Duplicate Detection
- ✅ **Completed task awareness**: Detects previously completed properties
- ✅ **Unified UX**: Same green checkmark for new and existing tasks
- ✅ **Performance**: Chunked API calls for better reliability
- ✅ **Visual improvements**: Clean badge system with intuitive colors

### v1.5 - Enhanced User Experience  
- ✅ **Instant feedback**: Badge updates when visiting properties
- ✅ **Persistent state**: Remembers status across tab switches
- ✅ **Modern design**: Updated icons and color scheme

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 🏆 Perfect For

- **Real estate investors** researching properties on ImmoMetrica
- **Property managers** tracking potential acquisitions  
- **Real estate agents** organizing client property searches
- **Anyone** who wants seamless property-to-task workflow

**Ready to streamline your property research workflow?**  
📖 **[Start with the Setup Guide](docs/setup-guide-en.md)**

---

*Built with ❤️ for efficient property research workflows*