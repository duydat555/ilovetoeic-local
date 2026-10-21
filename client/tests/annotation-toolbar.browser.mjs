// Responsive UI regression using the existing synthetic fixture, never real user data.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ hasTouch: true });
await context.route('**/api/v1/**', route => route.fulfill({ json: { success: true, data: [] } }));
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const reports = [];
const output = '.playwright-mcp/annotation-toolbar';
await fs.mkdir(output, { recursive: true });
try {
  await page.goto('http://127.0.0.1:5173/tests/exam-notes.fixture.html?scroll');
  const rail = page.getByRole('toolbar', { name: 'Công cụ chú thích', exact: true });
  await rail.waitFor();
  await page.addStyleTag({ content: 'html,body,#root{height:100dvh;margin:0;overflow:hidden}.exam-notes-workspace>:first-child{height:100%!important}' });
  for (const scale of [0.8, 1, 1.3]) {
    await page.evaluate(scale => document.documentElement.style.fontSize = `${16 * scale}px`, scale);
    for (const [width, height] of [[320,568],[390,844],[844,390],[768,1024],[1024,768],[1366,768]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const horizontal = width < 1024;
      assert.equal(await rail.getAttribute('aria-orientation'), horizontal ? 'horizontal' : 'vertical');
      const bounds = await rail.boundingBox();
      const paper = await page.locator('.exam-annotation-paper').boundingBox();
      assert(bounds && paper);
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, 'Toolbar outside viewport');
      if (horizontal) {
        assert(bounds.y + bounds.height <= paper.y, 'Toolbar covers passage');
        assert(paper.width > width - 50, 'Toolbar still takes passage width');
      } else assert(bounds.x + bounds.width <= paper.x, 'Desktop toolbar covers passage');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page overflows horizontally');
      const first = rail.getByRole('button', {name:'Chuột và tra từ', exact:true});
      const button = await first.boundingBox();
      assert(button.width >= 44 && button.height >= 44, 'Touch target too small');
      await first.focus();
      await page.keyboard.press(horizontal ? 'ArrowRight' : 'ArrowDown');
      assert(await rail.getByRole('button', {name:'Tô sáng',exact:true}).evaluate(el=>el===document.activeElement));
      await page.keyboard.press('End');
      assert(await rail.getByRole('button', {name:'Sổ ghi chú (0)',exact:true}).evaluate(el=>el===document.activeElement));
      await rail.getByRole('button', {name:'Màu và độ dày nét',exact:true}).click();
      const palette = page.getByRole('dialog', {name:'Màu và độ dày nét',exact:true});
      const popup = await palette.boundingBox();
      assert(popup.x >= 0 && popup.x + popup.width <= width && popup.y >= 0 && popup.y + popup.height <= height, 'Palette outside viewport');
      await palette.getByRole('button', {name:'Màu Xanh dương (4)',exact:true}).click();
      assert.equal(await palette.getByRole('button', {name:'Màu Xanh dương (4)',exact:true}).getAttribute('aria-pressed'), 'true');
      await page.keyboard.press('Escape');
      await palette.waitFor({state:'detached'});
      await rail.getByRole('button', {name:'Bút vẽ',exact:true}).click();
      assert.equal(await page.locator('.exam-annotation-paper').getAttribute('data-tool'),'pen');
      await first.click();
      if(scale===1.3) await page.screenshot({path:`${output}/normal-${width}.png`});
    }
  }
  reports.push('18 viewport/scale combinations: no overlap, full passage width on mobile, all tools reachable, keyboard navigation and palette stay functional');
  // Reproduce the fixed inset-0 page used by TestExamPage.
  await page.locator('.exam-notes-workspace>:first-child').evaluate(el=>{el.classList.add('fixed','inset-0','min-h-dvh');el.style.zIndex='40';el.style.setProperty('height','auto','important')});
  for(const [width,height] of [[320,568],[390,844],[844,390],[768,1024],[1366,768]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const bounds = await rail.boundingBox();
    const exam = await page.locator('.exam-notes-workspace>:first-child').boundingBox();
    assert(exam.y+exam.height<=height+1,'Fixed exam extends below viewport');
    if(width<1024) assert(bounds.y+bounds.height<=exam.y,'Fixed toolbar overlays exam');
    else assert(bounds.x+bounds.width<=exam.x,'Desktop fixed toolbar overlays exam');
    await page.screenshot({path:`${output}/fixed-${width}.png`});
  }
  reports.push('Fixed full-screen exam reserves a separate toolbar strip in portrait and landscape');
  for (const width of [390,1366]) {
    await page.setViewportSize({width,height:844});
    await rail.getByRole('button',{name:'Bút vẽ',exact:true}).click();
    await rail.getByRole('button',{name:'Ẩn thanh công cụ',exact:true}).click();
    await rail.waitFor({state:'detached'});
    await page.waitForFunction(()=>!document.querySelector('.exam-workspace-has-toolbar'));
    const restore=page.getByRole('button',{name:'Hiện thanh công cụ',exact:true});
    await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Hiện thanh công cụ');
    assert(await restore.evaluate(el=>el===document.activeElement),'Collapse loses keyboard focus');
    assert.equal(await page.locator('.exam-annotation-paper').getAttribute('data-tool'),'select','Hidden pen blocks reading/scroll');
    const exam=await page.locator('.exam-notes-workspace>:first-child').boundingBox();
    assert.equal(exam.x,0);assert.equal(exam.y,0);
    assert.equal(await page.evaluate(()=>localStorage.getItem('toeic_exam_annotation_toolbar_hidden')),'true');
    await restore.click();await rail.waitFor();
    await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Ẩn thanh công cụ');
    assert(await rail.getByRole('button',{name:'Ẩn thanh công cụ',exact:true}).evaluate(el=>el===document.activeElement),'Restore loses keyboard focus');
  }
  await rail.getByRole('button',{name:'Ẩn thanh công cụ',exact:true}).click();
  await page.reload();
  await page.getByRole('button',{name:'Hiện thanh công cụ',exact:true}).waitFor();
  assert.equal(await rail.count(),0,'Hidden preference lost after reload');
  await page.getByRole('button',{name:'Đổi nhóm câu',exact:true}).click();
  await page.getByRole('button',{name:'Hiện thanh công cụ',exact:true}).waitFor();
  assert.equal(await rail.count(),0,'Hidden preference lost on group change');
  await page.getByRole('button',{name:'Hiện thanh công cụ',exact:true}).click();await rail.waitFor();
  reports.push('Hide/show releases toolbar space on mobile and desktop, resets drawing, keeps keyboard focus, persists after reload and group change');
  assert.deepEqual(errors,[]);
  await fs.writeFile(`${output}/results.json`,JSON.stringify({reports,errors},null,2));
  console.log(JSON.stringify({reports,errors},null,2));
} finally {await browser.close()}
