const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 🛠️ [추가된 로직] 실행 폴더 내에 excel-inbox 폴더가 없으면 생성하고, 있으면 그대로 사용합니다.
const downloadPath = path.resolve(__dirname, 'excel-inbox');
if (!fs.existsSync(downloadPath)) {
  fs.mkdirSync(downloadPath);
}

// ====================================================
// ⭐ [시작 모드 설정] 
// 1로 설정하면 담당자 ➡️ 기한 ➡️ Excel 내보내기까지 논스톱 정주행합니다.
// ====================================================
const START_MODE = 1; 

async function run() {
  if (START_MODE !== 1) {
    console.log(`[안내] START_MODE가 ${START_MODE}이므로 코드를 시작하지 않습니다.`);
    return;
  }

  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--start-maximized'] 
  });
  
  const page = await browser.newPage();

  // 🛠️ [추가된 로직] 브라우저 다운로드 동작을 덮어쓰기하여 지정된 폴더로 파일이 가도록 설정합니다.
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath
  });

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('🚀 START_MODE(1): 로봇이 로그인 페이지로 이동합니다...');
  await page.goto('https://skr.crm5.dynamics.com/', { waitUntil: 'networkidle2', timeout: 0 });

  // --- [1단계 ~ 9단계 로직은 사장님께서 주신 내용과 완전히 동일합니다] ---
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'sjlee17@skr.onmicrosoft.com'); 
  await page.click('input[type="submit"]');

  await page.waitForSelector('input[type="password"]'); 
  await page.type('input[type="password"]', 'asd73011!!A'); 
  await new Promise(resolve => setTimeout(resolve, 1500)); 
  await page.click('input[type="submit"]');

  await page.waitForSelector('input#idBtn_Back'); 
  await page.click('input#idBtn_Back'); 

  await new Promise(resolve => setTimeout(resolve, 3000)); 
  try {
    await page.waitForSelector('button[aria-label="닫기"]', { timeout: 2000 });
    await page.click('button[aria-label="닫기"]');
  } catch (error) {
    console.log('환영 팝업창이 없으므로 다음으로 직행!');
  }

  await new Promise(resolve => setTimeout(resolve, 5000)); 
  const iframeElement = await page.waitForSelector('iframe#AppLandingPage');
  const frame = await iframeElement.contentFrame();

  if (frame) {
    await frame.waitForSelector('div[id="AppDetailsSec_1_Item_4"]');
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    await frame.click('div[id="AppDetailsSec_1_Item_4"]');
    console.log('[SKR] 앱 안으로 들어왔습니다.');
  }

  await new Promise(resolve => setTimeout(resolve, 8000));
  const selectorView = 'span[id*="ViewSelector"], [id*="viewSelector"]';
  await page.waitForSelector(selectorView, { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 1500)); 
  await page.click(selectorView);
  await new Promise(resolve => setTimeout(resolve, 2500));

  const clickedView = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('li, button, a, span, div[role="menuitem"]'));
    const target = elements.find(el => el.textContent.includes('내 팀의 활동'));
    if (target) { target.click(); return true; }
    return false;
  });

  if (!clickedView) {
    await page.click('li[title*="내 팀의 활동"]');
  }
  console.log('🎉 [내 팀의 활동] 보기 전환 성공!');

  await new Promise(resolve => setTimeout(resolve, 10000));
  let headerBox = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('[role="columnheader"], [data-item-key="ownerid"]'));
    const targetCell = headers.find(el => el.textContent.includes('담당자'));
    if (targetCell) {
      const clickTarget = targetCell.querySelector('button[role="button"], div[class*="outerDiv"]') || targetCell;
      clickTarget.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = clickTarget.getBoundingClientRect();
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    }
    return null;
  });

  if (headerBox && headerBox.width > 0) {
    await page.mouse.move(headerBox.x + headerBox.width / 2, headerBox.y + headerBox.height / 2);
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.mouse.click(headerBox.x + headerBox.width / 2, headerBox.y + headerBox.height / 2);
  }

  await new Promise(resolve => setTimeout(resolve, 3500));
  let filterBox = await page.evaluate(() => {
    const menuItems = Array.from(document.querySelectorAll('.ms-ContextualMenu-linkContent, .ms-ContextualMenu-itemText'));
    const target = menuItems.find(el => el.textContent.includes('필터링 기준'));
    if (target) {
      const rect = target.getBoundingClientRect();
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    }
    return null;
  });

  if (filterBox && filterBox.width > 0) {
    await page.mouse.move(filterBox.x + filterBox.width / 2, filterBox.y + filterBox.height / 2);
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.mouse.click(filterBox.x + filterBox.width / 2, filterBox.y + filterBox.height / 2);
  }

  await new Promise(resolve => setTimeout(resolve, 4500));
  const inputSelector = 'input.ms-BasePicker-input, input[role="combobox"], input[aria-label*="필터링 기준"]';
  try {
    await page.waitForSelector(inputSelector, { timeout: 8000 });
    const teamMembers = ['문창수', '이승직', '이도협', '윤진성', '김성학'];
    for (const name of teamMembers) {
      await page.click(inputSelector);
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.type(inputSelector, name, { delay: 100 }); 
      await new Promise(resolve => setTimeout(resolve, 2500)); 
      await page.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 1500)); 
    }
    const applyBtnHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button.ms-Button--primary, button'));
      return buttons.find(el => el.textContent.trim() === '적용' || el.textContent.trim() === '확인');
    });
    if (applyBtnHandle && applyBtnHandle.asElement()) {
      const btn = applyBtnHandle.asElement();
      const btnBox = await btn.boundingBox();
      if (btnBox) {
        await page.mouse.move(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.mouse.click(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
      }
    }
  } catch (error) { console.log('❌ 담당자 입력 중 오류 패스:', error.message); }

  await new Promise(resolve => setTimeout(resolve, 6000));
  const dateHeaderBox = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('[role="columnheader"], .ms-DetailsHeader-cell'));
    const targetCell = headers.find(el => el.textContent.trim() === '기한' || el.textContent.includes('기한'));
    if (targetCell) {
      const clickTarget = targetCell.querySelector('button[role="button"], div[class*="outerDiv"]') || targetCell;
      clickTarget.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = clickTarget.getBoundingClientRect();
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    }
    return null;
  });

  if (dateHeaderBox && dateHeaderBox.width > 0) {
    await page.mouse.move(dateHeaderBox.x + dateHeaderBox.width / 2, dateHeaderBox.y + dateHeaderBox.height / 2);
    await new Promise(resolve => setTimeout(resolve, 600));
    await page.mouse.click(dateHeaderBox.x + dateHeaderBox.width / 2, dateHeaderBox.y + dateHeaderBox.height / 2);
  }

  await new Promise(resolve => setTimeout(resolve, 3500));
  const dateFilterBox = await page.evaluate(() => {
    const menuItems = Array.from(document.querySelectorAll('.ms-ContextualMenu-linkContent, .ms-ContextualMenu-itemText'));
    const target = menuItems.find(el => el.textContent.includes('필터링 기준'));
    if (target) {
      const rect = target.getBoundingClientRect();
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    }
    return null;
  });

  if (dateFilterBox && dateFilterBox.width > 0) {
    await page.mouse.move(dateFilterBox.x + dateFilterBox.width / 2, dateFilterBox.y + dateFilterBox.height / 2);
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.mouse.click(dateFilterBox.x + dateFilterBox.width / 2, dateFilterBox.y + dateFilterBox.height / 2);
  }

  await new Promise(resolve => setTimeout(resolve, 4500));
  const dropdownBox = await page.evaluate(() => {
    const box = document.querySelector('.ms-Dropdown-title, [id*="Dropdown"], [role="combobox"]');
    if (box) {
      const rect = box.getBoundingClientRect();
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    }
    return null;
  });

  if (dropdownBox && dropdownBox.width > 0) {
    await page.mouse.move(dropdownBox.x + dropdownBox.width / 2, dropdownBox.y + dropdownBox.height / 2);
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.mouse.click(dropdownBox.x + dropdownBox.width / 2, dropdownBox.y + dropdownBox.height / 2);
  }

  await new Promise(resolve => setTimeout(resolve, 2500));
  const thisWeekBox = await page.evaluate(() => {
    const options = Array.from(document.querySelectorAll('.ms-Dropdown-item, button[role="option"], .ms-List-cell div, span'));
    const target = options.find(el => el.textContent.trim() === '이번 주');
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
      const rect = target.getBoundingClientRect();
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    }
    return null;
  });

  if (thisWeekBox && thisWeekBox.width > 0) {
    await page.mouse.move(thisWeekBox.x + thisWeekBox.width / 2, thisWeekBox.y + thisWeekBox.height / 2);
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.mouse.click(thisWeekBox.x + thisWeekBox.width / 2, thisWeekBox.y + thisWeekBox.height / 2);
  }

  await new Promise(resolve => setTimeout(resolve, 1500));
  const finalApplyHandle = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button.ms-Button--primary, button'));
    return buttons.find(el => el.textContent.trim() === '적용' || el.textContent.trim() === '확인');
  });

  if (finalApplyHandle && finalApplyHandle.asElement()) {
    const btn = finalApplyHandle.asElement();
    const btnBox = await btn.boundingBox();
    if (btnBox) {
      await page.mouse.move(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.mouse.click(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
    }
  }

  await new Promise(resolve => setTimeout(resolve, 7000));
  const excelTriggered = await page.evaluate(async () => {
    const excelBtn = document.querySelector('button[data-id*="exportToExcel"], button[aria-label="Excel로 내보내기"], [id*="exportToExcel"]');
    if (excelBtn) {
      excelBtn.click();
      return "DIRECT_CLICK";
    }
    const moreBtn = document.querySelector('button[data-id*="OverflowButton"], button[aria-label*="추가 명령"], #moreCommandsButton');
    if (moreBtn) {
      moreBtn.click();
      await new Promise(resolve => setTimeout(resolve, 1500));
      const subExcel = Array.from(document.querySelectorAll('button[role="menuitem"]'))
                        .find(el => el.getAttribute('data-id')?.includes('ExportToExcel') || el.textContent.includes('Excel로 내보내기'));
      if (subExcel) {
        subExcel.click();
        return "OVERFLOW_CLICK";
      }
    }
    return "NOT_FOUND";
  });

  if (excelTriggered === "NOT_FOUND") {
    await page.evaluate(() => {
      const backupTarget = Array.from(document.querySelectorAll('button')).find(el => el.getAttribute('aria-label') === 'Excel로 내보내기' || el.textContent.trim() === 'Excel로 내보내기');
      if (backupTarget) backupTarget.click();
    });
  }

  await new Promise(() => {}); 
}

run();