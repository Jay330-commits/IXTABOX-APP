// Auto-fill Distributor Signup Form
// Run with: node public/auto-fill-distributor.mjs
// Make sure your dev server is running on http://localhost:3000

import puppeteer from 'puppeteer';

// Helper function to replace waitForTimeout (removed in newer Puppeteer versions)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const FORM_DATA = {
  email: 'mathahaj@gmail.com',
  password: 'jobo@1234345',
  confirmPassword: 'jobo@1234345',
  contractType: 'Leasing',
  fullName: 'Jobo Test',
  phone: '+46 70 123 4567',
  companyName: 'Company AB',
  regNumber: '123456-7890',
  businessAddress: 'Test Street 123, Stockholm, 12345',
  website: 'https://testcompany.com',
  contactPerson: 'Mathahaj Test',
  businessType: 'retail',
  yearsInBusiness: '1-3',
  expectedMonthlyBookings: '5-10',
  marketingChannels: ['Social Media', 'Google Ads'],
  businessDescription: 'This is a test business description for testing purposes.',
};

async function autoFillForm() {
  console.log('Starting auto-fill script...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser window so we can see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to distributor signup page
    console.log('Navigating to signup page...');
    await page.goto('http://localhost:3000/auth/signup?role=distributor', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for form to load
    await page.waitForSelector('h1', { timeout: 10000 });
    console.log('Page loaded');
    
    // Step 0: Select business model based on FORM_DATA.contractType
    console.log(`Step 0: Selecting ${FORM_DATA.contractType} business model...`);
    await delay(20);
    
    // Click on desired option by matching card text content
    await page.evaluate((contractType) => {
      const cards = Array.from(document.querySelectorAll('div[class*="cursor-pointer"]'));
      const targetCard = cards.find(card => {
        const text = card.textContent || '';
        if (contractType === 'Leasing') {
          return text.includes('Leasing');
        }
        if (contractType === 'Owning') {
          return text.includes('Owning');
        }
        return false;
      });
      if (targetCard) {
        targetCard.click();
      }
    }, FORM_DATA.contractType);
    
    await delay(20);
    console.log(`Selected ${FORM_DATA.contractType} model`);
    
    // Click Next Step button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(btn => {
        const text = btn.textContent || '';
        return text.includes('Next Step') || (text.includes('Next') && !text.includes('Previous'));
      });
      if (nextBtn) nextBtn.click();
    });
    
    await delay(20);
    console.log('Moved to Step 1');
    
    // Step 1: Company Information
    console.log('Step 1: Filling company information...');
    await page.waitForSelector('input[placeholder*="Company"]', { timeout: 5000 });
    
    // Fill company name
    await page.type('input[placeholder*="Company"], input[placeholder*="My Company"]', FORM_DATA.companyName, { delay: 50 });
    await delay(20);
    
    // Fill registration number
    await page.type('input[placeholder*="123456"], input[placeholder*="Registration"]', FORM_DATA.regNumber, { delay: 50 });
    await delay(20);
    
    // Fill business address
    await page.type('input[placeholder*="Street"], input[placeholder*="Address"]', FORM_DATA.businessAddress, { delay: 50 });
    await delay(20);
    
    // Fill website
    await page.type('input[placeholder*="example.com"], input[placeholder*="https"]', FORM_DATA.website, { delay: 50 });
    await delay(20);
    
    // Click Next
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(btn => {
        const text = btn.textContent || '';
        return text.includes('Next Step') || (text.includes('Next') && !text.includes('Previous'));
      });
      if (nextBtn) nextBtn.click();
    });
    
    await delay(20);
    console.log('Moved to Step 2');
    
    // Step 2: Business Details
    console.log('Step 2: Filling business details...');
    await page.waitForSelector('input[placeholder*="John Doe"]', { timeout: 5000 });
    
    // Fill full name (first input with John Doe placeholder)
    const nameInputs = await page.$$('input[placeholder*="John Doe"]');
    if (nameInputs[0]) {
      await nameInputs[0].click({ clickCount: 3 });
      await nameInputs[0].type(FORM_DATA.fullName, { delay: 50 });
    }
    await delay(20);
    
    // Fill email
    await page.type('input[type="email"]', FORM_DATA.email, { delay: 50 });
    await delay(20);
    
    // Fill contact person (second John Doe input)
    if (nameInputs[1]) {
      await nameInputs[1].click({ clickCount: 3 });
      await nameInputs[1].type(FORM_DATA.contactPerson, { delay: 50 });
    }
    await delay(20);
    
    // Fill phone
    await page.type('input[placeholder*="+46"], input[placeholder*="Phone"]', FORM_DATA.phone, { delay: 50 });
    await delay(20);
    
    // Select business type (first select)
    const selects = await page.$$('select');
    if (selects[0]) {
      await selects[0].select(FORM_DATA.businessType);
    }
    await delay(20);
    
    // Select years in business (second select)
    if (selects[1]) {
      await selects[1].select(FORM_DATA.yearsInBusiness);
    }
    await delay(20);
    
    // Fill business description
    await page.type('textarea', FORM_DATA.businessDescription, { delay: 50 });
    await delay(20);
    
    // Click Next
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(btn => {
        const text = btn.textContent || '';
        return text.includes('Next Step') || (text.includes('Next') && !text.includes('Previous'));
      });
      if (nextBtn) nextBtn.click();
    });
    
    await delay(20);
    console.log('Moved to Step 3');
    
    // Step 3: Distributorship Goals
    console.log('Step 3: Filling distributorship goals...');
    await page.waitForSelector('select', { timeout: 5000 });
    
    // Select expected monthly bookings
    const selects2 = await page.$$('select');
    if (selects2[0]) {
      await selects2[0].select(FORM_DATA.expectedMonthlyBookings);
    }
    await delay(20);
    
    // Select marketing channels
    for (const channel of FORM_DATA.marketingChannels) {
      await page.evaluate((ch) => {
        const labels = Array.from(document.querySelectorAll('label'));
        const label = labels.find(l => {
          const text = l.textContent || '';
          return text.includes(ch);
        });
        if (label) {
          const checkbox = label.querySelector('input[type="checkbox"]');
          if (checkbox && !checkbox.checked) {
            checkbox.click();
          }
        }
      }, channel);
      await delay(20);
    }
    
    await delay(20);
    console.log('Selected marketing channels');
    
    // Click Next
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(btn => {
        const text = btn.textContent || '';
        return text.includes('Next Step') || (text.includes('Next') && !text.includes('Previous'));
      });
      if (nextBtn) nextBtn.click();
    });
    
    await delay(20);
    console.log('Moved to Step 4');
    
    // Step 4: Review & Submit
    console.log('Step 4: Filling passwords and submitting...');
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    
    // Fill passwords
    const passwordInputs = await page.$$('input[type="password"]');
    if (passwordInputs[0]) {
      await passwordInputs[0].type(FORM_DATA.password, { delay: 50 });
    }
    await delay(20);
    
    if (passwordInputs[1]) {
      await passwordInputs[1].type(FORM_DATA.confirmPassword, { delay: 50 });
    }
    await delay(20);
    
    // Accept terms checkbox
    await page.evaluate(() => {
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      const termsCheckbox = checkboxes.find(cb => {
        const label = cb.closest('label');
        return label && (label.textContent?.includes('terms') || label.textContent?.includes('accept'));
      });
      if (termsCheckbox && !termsCheckbox.checked) {
        termsCheckbox.click();
      }
    });
    
    await delay(20);
    console.log('Passwords filled and terms accepted');
    
    // Submit form
    console.log('Submitting form...');
    await delay(500);
    
    // First, verify we're on the last step by checking for "Submit Application" text
    const isLastStep = await page.evaluate(() => {
      return document.body.textContent?.includes('Submit Application') || 
             document.body.textContent?.includes('Review & Submit');
    });
    
    if (!isLastStep) {
      console.log('Not on last step yet. Current step:', await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h2'));
        return headings.map(h => h.textContent).join(', ');
      }));
    }
    
    // Find submit button - look for "Submit Application" text specifically
    const submitResult = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      
      // Method 1: Button with "Submit Application" text (desktop version)
      let submitBtn = allButtons.find(btn => {
        const text = (btn.textContent || '').trim();
        return text.includes('Submit Application') && btn.type === 'submit' && !btn.disabled;
      });
      
      // Method 2: Button with type="submit" on last step (mobile icon button)
      if (!submitBtn) {
        submitBtn = allButtons.find(btn => {
          return btn.type === 'submit' && !btn.disabled;
        });
      }
      
      if (submitBtn) {
        console.log('Found submit button:', submitBtn.textContent || 'Icon button');
        submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Wait a bit for scroll
        setTimeout(() => {
          submitBtn.click();
        }, 100);
        return true;
      }
      
      console.log('Available buttons:', allButtons.map(b => ({
        text: b.textContent?.trim(),
        type: b.type,
        disabled: b.disabled
      })));
      
      return false;
    });
    
    await delay(300);
    
    if (!submitResult) {
      console.log('Could not find submit button, trying form submission...');
      // Alternative: try to submit the form directly
      const formSubmitted = await page.evaluate(() => {
        const forms = document.querySelectorAll('form');
        if (forms.length > 0) {
          console.log('Found form, submitting...');
          forms[0].requestSubmit();
          return true;
        }
        return false;
      });
      
      if (!formSubmitted) {
        console.log('No form found. Taking screenshot for debugging...');
        await page.screenshot({ path: 'debug-submit.png', fullPage: true });
        console.log('Screenshot saved as debug-submit.png');
      }
    }
    
    // Wait for navigation or success message
    console.log('Waiting for form submission to complete...');
    await delay(2000);
    
    try {
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
        page.waitForSelector('div:has-text("successful"), div:has-text("Success"), div:has-text("error"), div:has-text("submitted")', { timeout: 15000 })
      ]);
      console.log('Navigation or message detected');
    } catch {
      console.log('No navigation detected, checking page content...');
      await delay(2000);
    }
    
    // Check for success message
    const success = await page.evaluate(() => {
      return document.body.textContent?.includes('successful') || 
             document.body.textContent?.includes('Success') ||
             document.body.textContent?.includes('submitted') ||
             document.body.textContent?.includes('Registration Successful');
    });
    
    if (success) {
      console.log('Form submitted successfully!');
    } else {
      console.log('Form submission attempted. Check the page for results.');
    }
    
    console.log('Auto-fill completed!');
    console.log('Browser will stay open. Press Ctrl+C to exit.');
    
    // Keep browser open indefinitely
    await new Promise(() => {}); // Never resolves, keeps script running
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    console.log('Browser will stay open. Press Ctrl+C to exit.');
    // Keep browser open on error too
    await new Promise(() => {}); // Never resolves, keeps script running
  }
}

// Run the script
autoFillForm().catch(console.error);

