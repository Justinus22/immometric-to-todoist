# Search List UI Injection Feature

## Overview

This feature adds a "Todoist Status" column to the ImmoMetrica search results table, allowing you to see at a glance which properties are already in your Todoist and quickly add new ones.

## Features

### Visual Status Indicators

Each property in the search results now shows one of these status indicators:

| Icon | Color | Meaning |
|------|-------|---------|
| ✓ | Green | Already in Todoist (active task) |
| ✓ | Gray | Completed in Todoist |
| + | Blue | Not in Todoist - click to open detail page |
| ⚠ | Red | Error checking status |
| ⏳ | Gray | Loading/checking status |

### One-Click Actions

- **Add to Todoist**: Click the blue "+" button to open the property detail page in a new tab
- **View Existing**: Green checkmark indicates the property is already tracked
- **Completed Tasks**: Gray checkmark shows previously completed properties

### Smart Caching

- Uses the same optimized caching system as the main extension
- Status checks are batched to avoid overwhelming the API
- Updates automatically when you add properties from detail pages

### Real-Time Updates

- When you add a property from a detail page, all open search list tabs update automatically
- No need to refresh the page to see updated status

## How It Works

### Architecture

1. **Content Script** (`searchListContent.js`)
   - Injects the Todoist column into the DataTables table
   - Monitors for new rows (pagination, sorting, filtering)
   - Handles status checks and UI updates

2. **Background Service Worker** (`service_worker.js`)
   - Processes status check requests using cached task data
   - Broadcasts updates to all open search list tabs
   - Leverages existing duplicate detection system

3. **Styling** (`searchListStyles.css`)
   - Clean, responsive button designs
   - Integrates seamlessly with ImmoMetrica's design
   - Mobile-friendly with smaller buttons on small screens

### Performance Optimizations

1. **Batch Processing**
   - Rows are processed in batches of 5 to avoid blocking the UI
   - 100ms delay between batches for smooth scrolling

2. **Smart Caching**
   - 5-minute cache for duplicate checks (same as detail pages)
   - 2-minute cache for active tasks list
   - 10-minute cache for completed tasks list

3. **Request Deduplication**
   - Parallel requests for the same offer are deduplicated
   - Prevents multiple API calls for the same data

4. **Efficient Updates**
   - MutationObserver watches for new table rows
   - Only processes newly added rows
   - Debounced to handle rapid DOM changes

## Usage

### For End Users

1. Navigate to any ImmoMetrica search results page
2. The Todoist column appears automatically as the first column
3. Status indicators show which properties are tracked
4. Click the blue "+" button to view/add properties

### Development & Testing

To test the feature:

```bash
# 1. Reload the extension in chrome://extensions/
# 2. Navigate to: https://www.immometrica.com/de/search
# 3. The Todoist column should appear as the first column
# 4. Status indicators should populate within a few seconds
```

## Configuration

No additional configuration needed! The feature uses your existing:
- Todoist API token
- Project/section settings
- Label configuration

## Troubleshooting

### Column Doesn't Appear

- Check that the content script is loaded (Chrome DevTools → Console)
- Verify the URL matches `/de/search*`
- Table might take a moment to render - script waits up to 10 seconds

### Status Indicators Don't Load

- Verify your Todoist API token is configured (extension options)
- Check browser console for errors
- Network issues might cause timeouts (indicators will show error state)

### Buttons Don't Work

- Opening detail pages requires popup blockers to be disabled
- Browser console will show any JavaScript errors

## Technical Details

### Message Types

The feature uses these message types:

```javascript
// Request offer status
{
  type: 'CHECK_OFFER_STATUS',
  payload: { url: string, offerId: string }
}

// Response
{
  exists: boolean,
  type?: 'ACTIVE' | 'COMPLETED',
  task?: object
}

// Broadcast update
{
  type: 'TASK_STATUS_UPDATE',
  payload: { url, exists, type, task }
}
```

### DOM Structure

The injected column has this structure:

```html
<th class="todoist-status-column-header">
  <i class="fas fa-check-square"></i>
</th>

<td class="todoist-status-column" data-offer-id="12345">
  <div class="todoist-status" data-status="not_found">
    <button class="todoist-add-btn btn btn-primary">
      <i class="fas fa-plus"></i>
    </button>
  </div>
</td>
```

## Future Enhancements

Potential improvements:

1. **Inline Add**: Add properties directly from the list without opening detail page
2. **Bulk Operations**: Select multiple properties and add them all at once
3. **Custom Filters**: Filter search results by Todoist status
4. **Priority Indicators**: Show task priority levels
5. **Due Date Display**: Show task due dates in the table

## Files Changed

- `searchListContent.js` - New content script for search list pages
- `searchListStyles.css` - Styling for injected UI elements
- `service_worker.js` - Added status check handler and broadcast functionality
- `manifest.json` - Added content script declaration for search pages

## Version History

### v2.0.0 (Current)
- Initial release of search list UI injection
- Integrated with existing caching and duplicate detection
- Real-time updates across tabs
- Responsive design
