# ImmoMetrica → Todoist

A Chrome extension that integrates ImmoMetrica property listings with Todoist. Add properties to your task list with one click, complete with automatic duplicate detection and location labeling.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-brightgreen)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)

## Setup Guides

**Detailed installation instructions with screenshots:**

- 🇺🇸 [English Setup Guide](docs/setup-guide-en.md)
- 🇩🇪 [German Setup Guide / Deutsche Anleitung](docs/setup-guide-de.md)

## Features

- **One-click integration**: Add property listings to Todoist instantly
- **Search list status**: See which properties are already tracked directly in search results
- **Duplicate detection**: Prevents re-adding existing or completed tasks
- **Automatic location labels**: Creates city labels from property addresses
- **Flexible organization**: Works with Inbox or any custom project/section
- **Real-time updates**: Status syncs automatically across tabs
- **Cache invalidation**: Fresh data on every page load

## How It Works

### Property Detail Pages

1. Visit any ImmoMetrica property page
2. Click the extension icon in your toolbar
3. Property is added to your configured Todoist project/section
4. Location label is created and applied automatically

### Search List Pages

Search results show status indicators for each property:

| Badge | Meaning |
|-------|---------|
| ✓ (green) | Already in Todoist |
| ✓ (gray) | Completed in Todoist |
| 🔗 (blue) | Click to view details and add |

Click the blue icon to open the detail page, then use the extension icon to add the property.

## Quick Start

### Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked" and select the extension folder

### Configuration

1. Get your Todoist API token from [Todoist Settings → Integrations](https://todoist.com/prefs/integrations)
2. Right-click the extension icon → Options
3. Enter your API token and save
4. (Optional) Configure a specific project and section, or leave default to use Inbox

## File Structure

```
├── manifest.json              # Extension configuration
├── service_worker.js          # Background logic & API integration
├── contentScript.js           # Property page data extraction
├── searchListContent.js       # Search list UI injection
├── searchListStyles.css       # Search list styling
├── options.html/js            # Settings interface
├── api/
│   └── todoistApi.js         # Todoist API client
├── utils/
│   └── storage.js            # Chrome storage wrapper
└── docs/
    ├── setup-guide-en.md     # English setup guide
    └── setup-guide-de.md     # German setup guide
```

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

### Quick Fixes

| Problem | Solution |
|---------|----------|
| Token error | Add valid API token in Options |
| Project error | Configure project in Options or use default Inbox |
| Page error | Visit valid ImmoMetrica property page |
| Extension missing | Check if enabled in `chrome://extensions/` |

## Technical Details

- **Manifest V3**: Latest Chrome extension standard
- **ES Modules**: Modern JavaScript architecture
- **Todoist API v1**: Current unified API version
- **Smart caching**: Minimizes API calls while keeping data fresh
- **Real-time sync**: Updates across all tabs automatically

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

*Built for efficient property research workflows*
