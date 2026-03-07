const puppeteer = require('puppeteer');

(async () => {
    console.log("Starting Mobile Responsive Test via Puppeteer...");
    try {
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();

        // Log console messages from the browser
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

        // Simulate an iPhone SE
        await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });

        // 1. Test Auth Page
        console.log("Navigating to http://localhost:3000/auth.html...");
        await page.goto('http://localhost:3000/auth.html', { waitUntil: 'networkidle0' });
        await page.screenshot({ path: 'mobile_auth_preview.png' });
        console.log("Saved mobile_auth_preview.png");

        // Set Auth State for Admin
        await page.evaluate(() => {
            localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Admin', role: 'ADMIN' }));
            localStorage.setItem('token', 'fake-token-for-testing');
        });

        // 2. Test Admin Page
        console.log("Navigating to http://localhost:3000/admin.html...");
        await page.goto('http://localhost:3000/admin.html', { waitUntil: 'networkidle0' });

        // Wait for potential dynamic renders
        await page.waitForTimeout(1000);

        await page.screenshot({ path: 'mobile_admin_preview.png', fullPage: true });
        console.log("Saved mobile_admin_preview.png");

        // Open a modal to check responsiveness
        await page.evaluate(() => {
            openEventModal();
        });
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'mobile_admin_modal_preview.png' });
        console.log("Saved mobile_admin_modal_preview.png");

        // Set Auth State for Student
        await page.evaluate(() => {
            localStorage.setItem('user', JSON.stringify({ id: 24100099, name: 'Student Test', role: 'STUDENT', major: 'IT', class: 'K18' }));
        });

        // 3. Test Student Portal Page
        console.log("Navigating to http://localhost:3000/index.html...");
        await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle0' });

        await page.waitForTimeout(1000);

        await page.screenshot({ path: 'mobile_student_preview.png', fullPage: true });
        console.log("Saved mobile_student_preview.png");

        await browser.close();
        console.log("Responsive tests completed successfully.");

    } catch (err) {
        console.error("Puppeteer Test Failed:", err);
    }
})();
