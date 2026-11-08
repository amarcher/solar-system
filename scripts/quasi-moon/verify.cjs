const {chromium}=require('/Users/archer/Programs/storybook-studio/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
const OUT=path.resolve('docs/quasi-moon');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--use-angle=metal','--enable-gpu']});
 const results=[];
 for(const [name,width,height,motion] of [['desktop',1280,900,'no-preference'],['mobile',390,844,'no-preference'],['reduced',390,844,'reduce'],['small',375,667,'no-preference']]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:motion});const errors=[];page.on('pageerror',e=>errors.push(e.stack || String(e)));
  await page.goto('http://127.0.0.1:5178/planets/earth');await page.getByRole('button',{name:'Earth has company…',exact:true}).waitFor();await page.waitForTimeout(1200);
  await page.screenshot({path:path.join(OUT,name+'-clue.png')});
  const canvas=await page.locator('canvas').elementHandle();
  await page.getByRole('button',{name:'Earth has company…',exact:true}).click();
  await page.getByRole('dialog',{name:'Kamoʻoalewa',exact:true}).waitFor();await page.waitForTimeout(1800);
  const pausedInitially=await page.getByRole('button',{name:'Play year replay',exact:true}).count();
  if(motion==='reduce'&&!pausedInitially)throw Error('Reduced motion autoplayed');
  if(!pausedInitially)await page.getByRole('button',{name:'Pause year replay'}).click();
  await page.getByRole('button',{name:'Return to Earth'}).focus(); await page.keyboard.press('Shift+Tab');
  if(await page.locator(':focus').evaluate(el=>el.tagName)!=='SUMMARY')throw Error('Closed disclosure focus trap failed');
  await page.keyboard.press('Tab');if(await page.locator(':focus').getAttribute('aria-label')!=='Return to Earth')throw Error('Focus escaped dialog');
  const slider=page.getByRole('slider',{name:'Day of the one-year replay'});await slider.fill('275');await page.waitForTimeout(300);
  await page.screenshot({path:path.join(OUT,name+'-earth.png')});
  await page.getByRole('button',{name:'Around the Sun',exact:true}).click();await page.waitForTimeout(400);
  await page.screenshot({path:path.join(OUT,name+'-sun.png')});
  const retained=await slider.inputValue();if(retained!=='275')throw Error('Frame switch reset day');
  await slider.fill('365');await page.waitForTimeout(200);await page.getByRole('button',{name:'Replay the year'}).click();await page.waitForTimeout(350);if(Number(await slider.inputValue())>=365)throw Error('Replay failed');
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Earth has company…',exact:true}).waitFor();
  const sameCanvas=await page.evaluate(el=>el===document.querySelector('canvas'),canvas);
  await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-earth-companion'),{timeout:2000});
  const focus=await page.evaluate(()=>document.activeElement?.hasAttribute('data-earth-companion'));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  results.push({name,errors,pausedInitially:!!pausedInitially,sameCanvas,focusRestored:focus,overflow});await page.close();
 }
 fs.writeFileSync(path.join(OUT,'browser-verification.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
