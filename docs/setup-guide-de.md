# Vollständige Installationsanleitung - ImmoMetrica zu Todoist Erweiterung

Diese Anleitung führt Sie Schritt für Schritt durch die Einrichtung der Chrome-Erweiterung. Keine technischen Kenntnisse erforderlich!

## 📋 Was Sie benötigen

- **Chrome oder Edge Browser** (Firefox wird nicht unterstützt)
- **Todoist-Konto** (kostenlos oder bezahlt)
- **5-10 Minuten** Ihrer Zeit

## 🚀 Schritt 1: Erweiterung herunterladen

1. **Erweiterungs-Dateien herunterladen**:
   - Gehen Sie zum [GitHub Repository](https://github.com/Justinus22/immometric-to-todoist)
   - Klicken Sie auf den grünen **"Code"**-Button
   - Wählen Sie **"Download ZIP"**
   - Speichern Sie die Datei auf Ihrem Computer (z.B. im Downloads-Ordner)

2. **Dateien entpacken**:
   - Finden Sie die heruntergeladene ZIP-Datei
   - Rechtsklick und **"Alle extrahieren"** (Windows) oder Doppelklick (Mac)
   - Merken Sie sich, wo Sie den Ordner entpackt haben!

## 🌐 Schritt 2: Erweiterung in Chrome installieren

1. **Chrome-Erweiterungsseite öffnen**:
   - Öffnen Sie Google Chrome
   - Geben Sie `chrome://extensions/` in die Adresszeile ein und drücken Sie Enter
   - ODER: Drei-Punkte-Menü → Weitere Tools → Erweiterungen

2. **Entwicklermodus aktivieren**:
   - Suchen Sie den **"Entwicklermodus"**-Schalter oben rechts
   - Klicken Sie, um ihn **EIN**zuschalten (sollte blau/hervorgehoben sein)

3. **Erweiterung laden**:
   - Klicken Sie auf **"Entpackte Erweiterung laden"** (erscheint nach Aktivierung des Entwicklermodus)
   - Navigieren Sie zu dem in Schritt 1 entpackten Ordner
   - Wählen Sie den `immometrica-to-todoist` Ordner und klicken Sie **"Ordner auswählen"**

4. **Installation überprüfen**:
   - Die Erweiterung sollte in Ihrer Erweiterungsliste erscheinen
   - Schauen Sie nach einem neuen Symbol in Ihrer Browser-Symbolleiste (sieht aus wie ein kleines Haus oder "T")

## 🔑 Schritt 3: Todoist API-Token erhalten

1. **Todoist öffnen**:
   - Gehen Sie zu [todoist.com](https://todoist.com) und melden Sie sich an
   - ODER öffnen Sie die Todoist-App

2. **Einstellungen öffnen**:
   - Klicken Sie auf Ihr **Profilbild** oben rechts
   - Wählen Sie **"Einstellungen"** aus dem Dropdown-Menü

3. **Integrationen finden**:
   - Klicken Sie im Einstellungsmenü auf **"Integrationen"**
   - Suchen Sie den Bereich **"API-Token"**

4. **Token kopieren**:
   - Klicken Sie auf **"In Zwischenablage kopieren"** neben dem API-Token
   - ⚠️ **Halten Sie diesen Token geheim!** Teilen Sie ihn mit niemandem

## ⚙️ Schritt 4: Erweiterung konfigurieren

1. **Erweiterungsoptionen öffnen**:
   - Rechtsklick auf das Erweiterungssymbol in der Browser-Symbolleiste
   - Wählen Sie **"Optionen"** aus dem Menü
   - ODER: Gehen Sie zu `chrome://extensions/`, finden Sie die Erweiterung, klicken Sie **"Details"** → **"Erweiterungsoptionen"**

2. **API-Token hinzufügen**:
   - Fügen Sie Ihren Todoist API-Token in das **"API Token"**-Feld ein
   - Klicken Sie auf **"Token speichern"**
   - Sie sollten eine grüne Bestätigungsmeldung sehen

3. **Verbindung testen**:
   - Die Erweiterung wird automatisch Ihren Token testen
   - Bei Erfolg sehen Sie Ihre Todoist-Projekte aufgelistet

## 📁 Schritt 5: Todoist-Projekt einrichten

### Option A: Automatische Einrichtung (Empfohlen)

1. **Projekt erstellen**:
   - Klicken Sie in Todoist auf **"+ Projekt hinzufügen"**
   - Benennen Sie es genau: **"Akquise"**
   - Wählen Sie eine beliebige Farbe
   - Klicken Sie **"Hinzufügen"**

2. **Abschnitt erstellen**:
   - Klicken Sie auf Ihr neues "Akquise"-Projekt
   - Klicken Sie **"+ Abschnitt hinzufügen"**
   - Benennen Sie ihn genau: **"Noch nicht angefragt aber interessant"**
   - Klicken Sie **"Abschnitt hinzufügen"**

### Option B: Andere Namen verwenden

Wenn Sie andere Namen bevorzugen:

1. **Erstellen Sie Ihr Projekt** mit einem beliebigen Namen
2. **Erstellen Sie einen Abschnitt** in diesem Projekt
3. **Konfigurieren Sie die Erweiterung**:
   - Gehen Sie zurück zu den Erweiterungsoptionen
   - Wählen Sie Ihr Projekt aus der Dropdown-Liste
   - Wählen Sie Ihren Abschnitt aus der Dropdown-Liste
   - Klicken Sie **"Einstellungen speichern"**

## ✅ Schritt 6: Erweiterung testen

1. **ImmoMetrica besuchen**:
   - Gehen Sie zu [immometrica.com](https://www.immometrica.com)
   - Navigieren Sie zu einem beliebigen Immobilienangebot
   - Die URL sollte so aussehen: `immometrica.com/de/offer/12345`

2. **Erste Immobilie hinzufügen**:
   - Klicken Sie auf das Erweiterungssymbol in Ihrer Symbolleiste
   - Achten Sie auf das Status-Badge:
     - 🔄 **Verarbeitung** (grau) - Erweiterung arbeitet
     - ✅ **Gespeichert** (grün) - Immobilie erfolgreich hinzugefügt!
     - ✅ **Bereits hinzugefügt** (grün) - Immobilie war bereits in Ihrem Todoist

3. **Todoist überprüfen**:
   - Gehen Sie zu Ihrem Todoist-Projekt
   - Sie sollten den Immobilientitel als neue Aufgabe sehen
   - Die Aufgabenbeschreibung enthält die ImmoMetrica-URL
   - Die Stadt wird als Label hinzugefügt (falls erkannt)

## 🎯 Die Badges verstehen

Die Erweiterung zeigt kleine Badges auf dem Symbol, um den Status anzuzeigen:

- ✅ **Grüner Haken**: Aufgabe erfolgreich hinzugefügt oder existiert bereits
- ✓ **Grauer Haken**: Aufgabe war bereits abgeschlossen
- 🔄 **Grauer Kreis**: Verarbeitet Ihre Anfrage
- ❌ **Rotes X**: Fehler aufgetreten
- 🔗 **Rote Kette**: Nicht auf einer gültigen Immobilienseite
- 🔑 **Oranger Schlüssel**: API-Token benötigt
- 📁 **Oranger Ordner**: Projekt-Einrichtung benötigt

## 🔧 Fehlerbehebung

### "API-Token nicht konfiguriert" (🔑)
- **Problem**: Kein Token gespeichert oder Token ungültig
- **Lösung**: Folgen Sie Schritt 3 und 4 erneut, stellen Sie sicher, dass Sie den vollständigen Token kopieren

### "Projekt nicht gefunden" (📁)
- **Problem**: Kann "Akquise"-Projekt nicht finden
- **Lösung**: Erstellen Sie das Projekt in Todoist oder konfigurieren Sie ein anderes Projekt in den Erweiterungsoptionen

### "Nicht auf gültiger Seite" (🔗)
- **Problem**: Erweiterung funktioniert nur auf ImmoMetrica-Immobilienseiten
- **Lösung**: Navigieren Sie zu einem Immobilienangebot (URL enthält `/offer/`)

### "Netzwerkfehler"
- **Problem**: Kann nicht mit Todoist verbinden
- **Lösung**: Überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut

### Erweiterungssymbol fehlt
- **Problem**: Erweiterung nicht ordnungsgemäß installiert
- **Lösung**: 
  - Gehen Sie zu `chrome://extensions/`
  - Stellen Sie sicher, dass die Erweiterung aktiviert ist (Schalter ist blau)
  - Versuchen Sie, sie zu deaktivieren und wieder zu aktivieren

## 🎉 Geschafft!

Herzlichen Glückwunsch! Ihre Erweiterung ist jetzt eingerichtet und einsatzbereit.

### Tägliche Nutzung:
1. Durchstöbern Sie ImmoMetrica-Immobilien
2. Klicken Sie auf das Erweiterungssymbol, um interessante Immobilien hinzuzufügen
3. Verwalten Sie Ihre Immobilienrecherche in Todoist
4. Verwenden Sie Labels zur Organisation nach Stadt/Region

### Profi-Tipps:
- Die Erweiterung merkt sich abgeschlossene Aufgaben - keine Duplikate!
- Stadt-Labels werden automatisch erstellt
- Sie können Projekt-/Abschnittsnamen in den Optionen anpassen
- Das Badge zeigt den Status sofort an, wenn Sie eine Immobilienseite besuchen

---

**Brauchen Sie Hilfe?** Erstellen Sie ein Issue auf [GitHub](https://github.com/Justinus22/immometric-to-todoist/issues) oder schauen Sie in die [Fehlerbehebung](../README.md#troubleshooting).