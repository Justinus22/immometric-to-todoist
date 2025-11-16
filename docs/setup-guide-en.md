# Complete Setup Guide - ImmoMetrica to Todoist Extension

This guide will walk you through setting up the Chrome extension step by step. No technical knowledge required!

## 📋 What You'll Need

- **Chrome or Edge browser** (Firefox not supported)
- **Todoist account** (free or paid)
- **5-10 minutes** of your time

## 🚀 Step 1: Download the Extension

1. **Download the extension files**:
   - Go to [GitHub Repository](https://github.com/Justinus22/immometric-to-todoist)
   - Click the green **"Code"** button
   - Select **"Download ZIP"**
   - Save the file to your computer (e.g., Downloads folder)

2. **Extract the files**:
   - Find the downloaded ZIP file
   - Right-click and select **"Extract All"** (Windows) or double-click (Mac)
   - Remember where you extracted the folder!

## 🌐 Step 2: Install Extension in Chrome

1. **Open Chrome Extensions page**:
   - Open Google Chrome
   - Type `chrome://extensions/` in the address bar and press Enter
   - OR: Click the three dots menu → More tools → Extensions

2. **Enable Developer Mode**:
   - Look for **"Developer mode"** toggle in the top-right corner
   - Click to turn it **ON** (it should be blue/highlighted)

3. **Load the extension**:
   - Click **"Load unpacked"** button (appears after enabling Developer mode)
   - Browse to the folder you extracted in Step 1
   - Select the `immometrica-to-todoist` folder and click **"Select Folder"**

4. **Verify installation**:
   - You should see the extension appear in your extensions list
   - Look for a new icon in your browser toolbar (looks like a small house or "T")

## 🔑 Step 3: Get Your Todoist API Token

1. **Open Todoist**:
   - Go to [todoist.com](https://todoist.com) and log in
   - OR open the Todoist app

2. **Access Settings**:
   - Click your **profile picture** in the top-right
   - Select **"Settings"** from the dropdown

3. **Find Integrations**:
   - In the settings menu, click **"Integrations"** tab
   - Look for **"API token"** section

4. **Copy your token**:
   - Click **"Copy to clipboard"** next to the API token
   - ⚠️ **Keep this token secret!** Don't share it with anyone

## ⚙️ Step 4: Configure the Extension

1. **Open extension options**:
   - Right-click the extension icon in your browser toolbar
   - Select **"Options"** from the menu
   - OR: Go to `chrome://extensions/`, find the extension, click **"Details"** → **"Extension options"**

2. **Add your API token**:
   - Paste your Todoist API token into the **"API Token"** field
   - Click **"Save Token"** button
   - You should see a green confirmation message

3. **Test the connection**:
   - The extension will automatically test your token
   - If successful, you'll see your Todoist projects listed

## 📁 Step 5: Set Up Your Todoist Project

### Option A: Automatic Setup (Recommended)

1. **Create the project**:
   - In Todoist, click **"+ Add project"**
   - Name it exactly: **"Akquise"**
   - Choose any color you like
   - Click **"Add"**

2. **Create the section**:
   - Click on your new "Akquise" project
   - Click **"+ Add section"**
   - Name it exactly: **"Noch nicht angefragt aber interessant"**
   - Click **"Add section"**

### Option B: Use Different Names

If you prefer different names:

1. **Create your project** with any name you want
2. **Create a section** within that project
3. **Configure the extension**:
   - Go back to extension options
   - Select your project from the dropdown
   - Select your section from the dropdown
   - Click **"Save Settings"**

## ✅ Step 6: Test the Extension

1. **Visit ImmoMetrica**:
   - Go to [immometrica.com](https://www.immometrica.com)
   - Browse to any property listing
   - The URL should look like: `immometrica.com/de/offer/12345`

2. **Add your first property**:
   - Click the extension icon in your toolbar
   - Watch for the status badge:
     - 🔄 **Processing** (gray) - Extension is working
     - ✅ **Saved** (green) - Property added successfully!
     - ✅ **Already Added** (green) - Property was already in your Todoist

3. **Check Todoist**:
   - Go to your Todoist project
   - You should see the property title as a new task
   - The task description contains the ImmoMetrica URL
   - The city is added as a label (if detected)

## 🎯 Understanding the Badges

The extension shows small badges on the icon to indicate status:

- ✅ **Green checkmark**: Task successfully added or already exists
- ✓ **Gray checkmark**: Task was already completed
- 🔄 **Gray circle**: Processing your request
- ❌ **Red X**: Error occurred
- 🔗 **Red chain**: Not on a valid property page
- 🔑 **Orange key**: API token needed
- 📁 **Orange folder**: Project setup needed

## 🔧 Troubleshooting

### "API token not configured" (🔑)
- **Problem**: No token saved or token invalid
- **Solution**: Follow Step 3 and 4 again, make sure you copy the full token

### "Project not found" (📁)
- **Problem**: Can't find "Akquise" project
- **Solution**: Create the project in Todoist or configure different project in extension options

### "Not on valid page" (🔗)
- **Problem**: Extension only works on ImmoMetrica property pages
- **Solution**: Navigate to a property listing (URL contains `/offer/`)

### "Network error"
- **Problem**: Can't connect to Todoist
- **Solution**: Check your internet connection and try again

### Extension icon missing
- **Problem**: Extension not properly installed
- **Solution**: 
  - Go to `chrome://extensions/`
  - Make sure the extension is enabled (toggle is blue)
  - Try disabling and re-enabling it

## 🎉 You're Done!

Congratulations! Your extension is now set up and ready to use. 

### Daily Usage:
1. Browse ImmoMetrica properties
2. Click the extension icon to add interesting properties
3. Manage your property research in Todoist
4. Use labels to organize by city/region

### Pro Tips:
- The extension remembers completed tasks - no duplicates!
- City labels are created automatically
- You can customize project/section names in options
- Badge shows status immediately when you visit a property page

---

**Need help?** Create an issue on [GitHub](https://github.com/Justinus22/immometric-to-todoist/issues) or check the [troubleshooting section](../README.md#troubleshooting).