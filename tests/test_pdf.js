const puppeteer = require('puppeteer');

(async () => {
    console.log("Starting Puppeteer test for Certificate PDF generation...");
    try {
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();

        // Log console messages from the browser
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

        // Set viewport to simulate a typical laptop screen
        await page.setViewport({ width: 1366, height: 768 });

        console.log("Navigating to http://localhost:3000/admin.html...");
        await page.goto('http://localhost:3000/admin.html', { waitUntil: 'networkidle0' });

        console.log("Setting up test auth state...");
        // Inject auth state to bypass login
        await page.evaluate(() => {
            localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Admin', role: 'ADMIN' }));
            localStorage.setItem('token', 'fake-token-for-testing');
        });

        // Reload to apply auth state
        await page.reload({ waitUntil: 'networkidle0' });

        console.log("Opening Checkin tab...");
        // Wait for tabs to load and click checkin tab
        await page.waitForSelector('.tab-button', { timeout: 5000 });
        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.tab-button');
            tabs.forEach(t => { if (t.textContent.includes('Check-in')) t.click(); });
        });

        console.log("Waiting for data to load...");
        // Wait a bit for default checkin list to load (if any)
        await page.waitForTimeout(2000);

        console.log("Triggering Certificate Modal programmatically for testing...");
        // We will call the viewCertificate function directly with dummy data to test the layout
        await page.evaluate(() => {
            // Mock the API response
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
                if (args[0].includes('/certificate/')) {
                    return {
                        ok: true,
                        json: async () => ({
                            studentName: "PUPPETEER TEST STUDENT",
                            studentId: "99999999",
                            studentClass: "TEST-CLASS",
                            studentMajor: "TEST-MAJOR",
                            eventName: "Test Event for PDF Generation",
                            points: 10,
                            orgLevel: "TEST ORGANIZATION",
                            issueDate: new Date().toISOString()
                        })
                    };
                }
                return originalFetch(...args);
            };

            // Call the function
            viewCertificate(99999999, 1);
        });

        console.log("Waiting for modal to appear...");
        // Wait for modal to be visible
        await page.waitForSelector('#certificate-modal', { visible: true });

        // Wait a moment for fonts to render
        await page.waitForTimeout(1000);

        console.log("Taking screenshot of the modal BEFORE PDF generation...");
        await page.screenshot({ path: 'cert_modal_before.png' });

        console.log("Triggering PDF download...");
        // Intercept download
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: __dirname,
        });

        await page.evaluate(() => {
            downloadCertificatePDF();
        });

        console.log("Waiting 5 seconds for PDF to generate and download...");
        await page.waitForTimeout(5000);

        console.log("Taking screenshot of the modal AFTER PDF generation...");
        await page.screenshot({ path: 'cert_modal_after.png' });

        await browser.close();
        console.log("Test completed. Check directory for generated PDF and screenshots.");

    } catch (err) {
        console.error("Puppeteer Test Failed:", err);
    }
})();
