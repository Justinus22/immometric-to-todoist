# Troubleshooting Location Labels

## Testing Location Extraction

1. **Open the test file**: Load `location-test.html` in your browser
2. **Check console**: Open Developer Tools > Console to see extraction results
3. **Verify patterns**: The test will show which pattern matched for each sample

## Expected Results

- **Sample 1**: "Oranienburg" (from "Bötzower Platz, 16515 Brandenburg - Oranienburg")
- **Sample 2**: "Rathenow" (from "14712 Brandenburg - Rathenow 14712 Brandenburg - Rathenow") 
- **Sample 3**: "Bad Saarow" (from "Ahornallee 26b, 15526, Bad Saarow")

## Debugging Steps

### 1. Check Extension Console

1. Open Chrome DevTools (F12)
2. Go to Extensions tab in Sources panel
3. Find your extension's service worker
4. Check console for label creation logs

### 2. Verify API Permissions

- Ensure your Todoist token has label creation permissions
- Test label creation manually via API:
  ```bash
  curl "https://api.todoist.com/rest/v1/labels" \
    -X POST \
    --data '{"name": "Test Location"}' \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```

### 3. Common Issues

**Issue**: Labels created but not attached to tasks
- **Cause**: API v1 deprecated, use v2
- **Solution**: Update API base URL to `https://api.todoist.com/rest/v2`

**Issue**: Location extraction fails
- **Cause**: Page structure changed or different format
- **Solution**: Check actual HTML structure on failing pages

**Issue**: "Invalid label_ids"
- **Cause**: Label ID format mismatch
- **Solution**: Ensure IDs are integers, not strings

### 4. Manual Verification

1. **Check created tasks** in Todoist web app
2. **Look for labels** in the task details
3. **Verify label exists** in your Labels list

### 5. Force Debug Mode

Add this to content script for debugging:
```javascript
console.log('Extracted location:', locationCity);
console.log('Page text sample:', document.querySelector('.text')?.textContent);
```

Add this to service worker for debugging:
```javascript
console.log('Task data before creation:', JSON.stringify(taskData, null, 2));
```