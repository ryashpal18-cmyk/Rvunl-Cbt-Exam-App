const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');
const { PDFDocument, PDFRawStream, decodePDFRawStream } = require('pdf-lib');
const { createResultsPdf } = require('../dist-electron/resultsPdf.js');

app.on('window-all-closed', () => {});

app.whenReady().then(async () => {
  try {
    // Keep one window alive while the temporary PDF window is destroyed.
    const ui = new BrowserWindow({ show: false, width: 800, height: 760,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
    const bytes = await createResultsPdf({
      headers: ['नाम', 'पेपर', 'तारीख', 'अंक', 'प्रतिशत', 'समय', 'ऋणात्मक अंक'],
      rows: [
        ['मोनिका', 'राजस्थान सामान्य ज्ञान', '18-11-2026', '75 / 100', '75%', '45 मिनट', 'नहीं'],
        ['Shivani', '<script>untrusted text</script>', '18-11-2026', '80 / 100', '80%', '40 min', 'None'],
      ],
      generatedAt: '18-11-2026',
    });
    const pdf = await PDFDocument.load(bytes);
    assert.equal(pdf.getPageCount(), 1);
    const maps = [];
    for (const [, object] of pdf.context.enumerateIndirectObjects()) {
      if (object instanceof PDFRawStream) {
        try { maps.push(Buffer.from(decodePDFRawStream(object).decode()).toString('utf8')); } catch {}
      }
    }
    const unicodeMaps = maps.filter((text) => /beginbf(?:char|range)/.test(text)).join('\n');
    assert.match(unicodeMaps, /09(?:2e|28|3f|15)/i, 'Hindi glyphs must have Unicode mappings in the PDF');
    const output = path.join(__dirname, '..', 'release');
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'Hindi-results-check.pdf'), bytes);
    console.log('PASS: native Hindi PDF contains embedded Unicode mappings and one page.');
    try {
      ui.webContents.on('console-message', (event) => { if (event.level === 'error') console.error('Renderer:', event.message); });
      await ui.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
      const clickButton = async (label) => {
        console.log(`UI click: ${label}`);
        await ui.webContents.executeJavaScript(`(() => {
          const button = [...document.querySelectorAll('button')].find((item) => (item.textContent.includes(${JSON.stringify(label)}) || item.getAttribute('aria-label') === ${JSON.stringify(label)}) && getComputedStyle(item).visibility !== 'hidden' && item.getBoundingClientRect().width > 0);
          if (!button) throw new Error('Missing button: ' + ${JSON.stringify(label)});
          button.click();
        })()`);
      };
      const waitForText = async (text) => {
        for (let attempt = 0; attempt < 80; attempt++) {
          if (await ui.webContents.executeJavaScript(`document.body.textContent.includes(${JSON.stringify(text)})`)) return;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error('UI did not show: ' + text);
      };
      await waitForText('Monika');
      await clickButton('Monika');
      await waitForText('Start Mini Test');
      await ui.setSize(1440, 1000);
      for (const mode of ['Light', 'Dark', 'Warm']) {
        console.log(`UI theme: ${mode}`);
        await ui.webContents.executeJavaScript(`(() => {
          const header = document.querySelector('.dashboard-header');
          [...header.querySelectorAll('button')].find((button) => button.textContent.trim() === ${JSON.stringify(mode)}).click();
        })()`);
        await new Promise((resolve) => setTimeout(resolve, 150));
        assert.equal(await ui.webContents.executeJavaScript(`document.querySelector('.dashboard-shell').dataset.theme`), mode.toLowerCase());
        assert.equal(await ui.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.dashboard-shell').parentElement).filter`), 'none');
        fs.writeFileSync(path.join(output, `Dashboard-${mode.toLowerCase()}-check.png`), (await ui.webContents.capturePage()).toPNG());
      }
      for (const width of [1440, 1280, 1024, 800]) {
        ui.setSize(width, 1000);
        await new Promise((resolve) => setTimeout(resolve, 150));
        assert.equal(await ui.webContents.executeJavaScript(`document.documentElement.scrollWidth <= window.innerWidth`), true, `Dashboard must fit ${width}px without horizontal scrolling`);
      }
      await clickButton('Open navigation');
      await new Promise((resolve) => setTimeout(resolve, 150));
      assert.equal(await ui.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.dashboard-sidebar')).visibility`), 'visible');
      fs.writeFileSync(path.join(output, 'Dashboard-compact-navigation-check.png'), (await ui.webContents.capturePage()).toPNG());
      await clickButton('Close navigation');
      // Keep the exam in the compact test viewport instead of entering desktop fullscreen.
      await ui.webContents.executeJavaScript(`(() => { document.documentElement.requestFullscreen = () => Promise.resolve(); })()`);
      await clickButton('Start Mini Test');
      await waitForText('Start exam');
      await ui.webContents.executeJavaScript(`(() => {
        const checkbox = [...document.querySelectorAll('label')].find((label) => label.textContent.includes('I have read')).querySelector('input');
        checkbox.click();
      })()`);
      await clickButton('Start exam');
      await waitForText('Show question numbers');
      assert.equal(await ui.webContents.executeJavaScript(`window.innerWidth < 1024`), true, 'Compact exam test must stay below the desktop breakpoint');
      await clickButton('Show question numbers');
      await new Promise((resolve) => setTimeout(resolve, 150));
      assert.equal(await ui.webContents.executeJavaScript(`(() => {
        const button = document.querySelector('[aria-label="Question 1"]');
        if (!button) return false;
        const box = button.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && getComputedStyle(button).visibility !== 'hidden';
      })()`), true);
      fs.writeFileSync(path.join(output, 'Compact-palette-check.png'), (await ui.webContents.capturePage()).toPNG());
      await clickButton('Close panel');
      await clickButton('Rough Pad');
      await new Promise((resolve) => setTimeout(resolve, 150));
      assert.equal(await ui.webContents.executeJavaScript(`document.querySelector('textarea').getBoundingClientRect().height > 0`), true);
      fs.writeFileSync(path.join(output, 'Compact-rough-pad-check.png'), (await ui.webContents.capturePage()).toPNG());
      await clickButton('Close panel');
      await clickButton('Save & return to dashboard');
      await waitForText('Settings & Backup');
      await clickButton('Open navigation');
      await clickButton('Settings & Backup');
      await waitForText('Software update');
      fs.writeFileSync(path.join(output, 'Update-card-check.png'), (await ui.webContents.capturePage()).toPNG());
      console.log('PASS: Windows Chromium renders compact question palette, rough pad and update card.');
    } finally { ui.destroy(); }
    app.quit();
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
