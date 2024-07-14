import puppeteer from "puppeteer";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Login to LinkedIn
  await page.goto("https://www.linkedin.com");
  await page.waitForSelector(".sign-in-form__sign-in-cta");
  await page.click(".sign-in-form__sign-in-cta");
  await page.waitForSelector("#username");
  await page.type("#username", "MAIL OR USERNAME");  /* MAIL OR USERNAME HERE */
  await page.waitForSelector("#password"); 
  await page.type("#password", "PASSWORD"); /* PASSWORD HERE */
  await page.waitForSelector(
    "#organic-div > form > div.login__form_action_container > button"
  );
  await page.click(
    "#organic-div > form > div.login__form_action_container > button"
  );

  // Search for "Full Stack dev"
  await page.waitForSelector(
    "#global-nav-search > div > button > span > svg > use"
  );
  await page.click("#global-nav-search > div > button > span > svg > use");
  await page.waitForSelector("#global-nav-typeahead > input");
  await page.type("#global-nav-typeahead > input", "Full Stack dev"); /* JOB DETAILS */
  await page.keyboard.press("Enter");

  // Navigate to the Jobs tab
  await page.waitForSelector(
    "#search-reusables__filters-bar > ul > li:nth-child(1) > button"
  );
  await page.click(
    "#search-reusables__filters-bar > ul > li:nth-child(1) > button"
  );

  await page.waitForSelector("ul.scaffold-layout__list-container", {
    timeout: 60000,
  });

  await autoScroll(page, "div.jobs-search-results-list");
  await jobScraper(page);

  const PAGINATION_LENGTH = await page.evaluate(() => {
    const ul = document.querySelector("ul.artdeco-pagination__pages");
    if (ul) {
      const lastLi = ul.lastElementChild;
      return lastLi
        ? lastLi.getAttribute("data-test-pagination-page-btn")
        : null;
    }
    return null;
  });
  for (let i = 0; i < PAGINATION_LENGTH; i++) {
    console.log(i);
  }
  await navigatePagination(page, PAGINATION_LENGTH);
})();

async function clickPaginationButton(page, pageNumber) {
  try {
    
    await page.waitForSelector('ul.artdeco-pagination__pages');
    await page.click(`button[aria-label="Page ${pageNumber}"]`);
    await autoScroll(page, "div.jobs-search-results-list");
    await jobScraper(page);
    
  } catch (error) {
    console.error(`Failed to click on page ${pageNumber}: ${error.message}`);
  }
}
async function navigatePagination(page, totalPages) {
  for (let i = 2; i <= totalPages; i++) {
    await clickPaginationButton(page, i);
  }
}

async function jobScraper(page) {
  const jobs = await page.evaluate(() => {
    const ulElement = document.querySelector(
      "ul.scaffold-layout__list-container"
    );
    const jobData = [];

    if (ulElement) {
      const liElements = ulElement.querySelectorAll(
        "li.scaffold-layout__list-item"
      );

      liElements.forEach((li) => {
        const jobTitle =
          li.querySelector("a.job-card-list__title")?.innerText.trim() || "";
        const companyName =
          li
            .querySelector(".artdeco-entity-lockup__subtitle > span")
            ?.innerText.trim() || "";
        const jobLocation =
          li
            .querySelector(".artdeco-entity-lockup__caption > ul > li")
            ?.innerText.trim() || "";

        jobData.push({
          jobTitle,
          companyName,
          jobLocation,
        });
      });
    } 
    return jobData;
  });
  const filePath = path.join(__dirname, 'PUPPETEER', 'jobData.json');
  
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    let existingData = [];
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      existingData = JSON.parse(fileContent);
    } catch (readError) {
      if (readError.code !== 'ENOENT') {
        console.error('Error reading existing file:', readError);
      }
    }
    await fs.writeFile(filePath, JSON.stringify([...existingData, ...jobs], null, 2));
    console.log(`Job data appended to ${filePath}`);
  } catch (error) {
    console.error('Error writing job data:', error);
  }


  return jobs;
}

async function autoScroll(page, selector) {
  await page.evaluate(async (selector) => {
    const ulElement = document.querySelector(selector);
    let lastScrollTop = ulElement.scrollTop;
    let newScrollTop;

    while (true) {
      ulElement.scrollBy(0, 800);
      await new Promise((resolve) => setTimeout(resolve, 500));
      newScrollTop = ulElement.scrollTop;
      if (newScrollTop === lastScrollTop) break;
      lastScrollTop = newScrollTop;
    }
  }, selector);
}
