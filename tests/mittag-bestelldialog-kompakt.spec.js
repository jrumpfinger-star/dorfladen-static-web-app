const {test, expect} = require('@playwright/test');
const BASE = process.env.TEST_URL || 'http://127.0.0.1:8811';
const DAY = '2026-10-30';
const DISH = {dl_wochenplanid:'wp-compact',dl_gericht:'Schnitzel mit Pommes oder Kartoffelsalat',
  dl_preis:8.8,dl_datum:DAY,dl_wochentag:101004};
const PATH = '/mittagstisch-bestellen.html?gericht_id=wp-compact';

async function setup(page,{saved=true,blocked=false}={}){
  await page.clock.setFixedTime(new Date('2026-10-30T09:30:00+01:00'));
  await page.addInitScript(({saved,blocked})=>{
    if(saved) localStorage.setItem('dl_lunch_customer',JSON.stringify({name:'Anna Beispiel',email:'anna@example.com',phone:'08082123'}));
    if(blocked) Object.defineProperty(window,'Notification',{value:{permission:'denied'},configurable:true});
  },{saved,blocked});
  const posts=[];
  await page.route('**/api/**',route=>{
    const u=route.request().url();
    let data={success:true,data:[],orders:[]};
    if(u.includes('wochenplan')) data={success:true,data:[DISH]};
    else if(u.includes('cms-config')) data={success:true,data:{bestellschluss_uhr:'11:59'}};
    else if(u.includes('auth-login')) data={success:true,token:'test-token',kunde:{vorname:'Anna',nachname:'Beispiel',email:'anna@example.com'}};
    else if(u.includes('lunch-order') && route.request().method()==='POST'){
      posts.push(route.request().postDataJSON());
      data={success:true,bestellnummer:'MT-TEST'};
    }
    return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto(BASE+PATH);
  await expect(page.locator('#dish-section')).toBeVisible();
  return posts;
}

test('TC-F1-01/03: Daten kompakt und alle Bestellwerte bleiben erhalten',async({page})=>{
  const posts=await setup(page);
  await expect(page.locator('#customer-details')).not.toHaveAttribute('open','');
  await expect(page.locator('#customer-summary')).toHaveText('Anna Beispiel');
  await expect(page.locator('#cust-name')).toBeHidden();
  await page.locator('#qty-plus').click();
  await expect(page.locator('#submit-btn')).toContainText('17,60');
  await page.locator('#opt-mitnehmen').check();
  await page.locator('#note-details summary').click();
  await page.locator('#note-input').fill('Ohne Zwiebeln');
  await page.locator('#note-details summary').click();
  await expect(page.locator('#note-summary')).toHaveText('vorhanden');
  await page.locator('#customer-details summary').click();
  await expect(page.locator('#cust-email')).toHaveValue('anna@example.com');
  await expect(page.locator('#cust-phone')).toHaveValue('08082123');
  await page.locator('#cust-name').fill('Anna Neu');
  await page.locator('#customer-details summary').click();
  await expect(page.locator('#customer-summary')).toHaveText('Anna Neu');
  await page.locator('#submit-btn').click();
  await expect(page.locator('#success-overlay')).toHaveClass(/show/);
  expect(posts).toHaveLength(1);
  expect(posts[0]).toMatchObject({name:'Anna Neu',menge:2,preis:8.8,gericht_id:'wp-compact',
    datum:DAY,mitnehmen:true,anmerkung:'Ohne Zwiebeln',notify_email:false,quelle:0});
  expect(posts[0].device_id).toBeTruthy();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('dl_lunch_customer')).name)).toBe('Anna Neu');
  await page.getByRole('button',{name:'Weitere Bestellung'}).click();
  await expect(page.locator('#note-summary')).toHaveText('optional');
  await expect(page.locator('#submit-btn')).toContainText('8,80');
});

test('TC-F1-03: Preis bleibt nach Server- und Verbindungsfehler erhalten',async({page})=>{
  await setup(page);
  await page.locator('#qty-plus').click();
  let networkError=false;
  await page.route('**/api/lunch-order',route=>networkError?route.abort():route.fulfill({
    contentType:'application/json',body:JSON.stringify({success:false,error:'Testfehler'})
  }));
  await page.locator('#submit-btn').click();
  await expect(page.locator('#error-box')).toContainText('Testfehler');
  await expect(page.locator('#submit-btn')).toContainText('17,60');
  networkError=true;
  await page.locator('#submit-btn').click();
  await expect(page.locator('#error-box')).toContainText('Verbindung fehlgeschlagen');
  await expect(page.locator('#submit-btn')).toContainText('17,60');
  await expect(page.locator('#submit-btn')).toBeEnabled();
});

test('TC-F1: Ändern bleibt bei kompakten Zusammenfassungen rechts bündig',async({page})=>{
  await setup(page);
  await page.locator('#customer-details summary').click();
  await page.locator('#cust-name').fill('Ein sehr langer Beispielname für schmale Mobilbildschirme');
  await page.locator('#customer-details summary').click();

  for(const id of ['note-details','customer-details','notify-details']){
    const position=await page.locator('#'+id+' summary').evaluate(summary=>{
      const summaryBox=summary.getBoundingClientRect();
      const actionBox=summary.querySelector('.compact-edit').getBoundingClientRect();
      const label=summary.querySelector('.customer-heading') ||
        summary.querySelector('.summary-label');
      const labelBox=label.getBoundingClientRect();
      return {actionRight:actionBox.right,actionTop:actionBox.top,actionBottom:actionBox.bottom,summaryRight:summaryBox.right,
        summaryHeight:summaryBox.height,labelTop:labelBox.top,labelBottom:labelBox.bottom,
        summaryTop:summaryBox.top,summaryBottom:summaryBox.bottom};
    });
    expect(Math.abs(position.actionRight-position.summaryRight)).toBeLessThanOrEqual(1);
    expect(position.summaryHeight).toBeLessThanOrEqual(46);
    expect(Math.abs((position.labelTop+position.labelBottom)/2-
      (position.actionTop+position.actionBottom)/2)).toBeLessThanOrEqual(1);
  }
});

test('TC-F1-02: Erstbestellung offen, Anmeldung füllt Daten und klappt ein',async({page})=>{
  await setup(page,{saved:false});
  await expect(page.locator('#customer-details')).toHaveAttribute('open','');
  await page.locator('#konto-status-aus a').click();
  await page.locator('#login-mail').fill('anna@example.com');
  await page.locator('#login-pw').fill('test-passwort');
  await page.locator('#login-knopf').click();
  await expect(page.locator('#login-modal')).not.toHaveClass(/open/);
  await expect(page.locator('#customer-details')).not.toHaveAttribute('open','');
  await expect(page.locator('#customer-summary')).toHaveText('Anna Beispiel');
  await expect(page.locator('#konto-status-an')).toBeVisible();
});

test('TC-F2-01: Pflichtdaten bei Fehler sichtbar und fokussiert',async({page})=>{
  const posts=await setup(page,{saved:false});
  await page.locator('#customer-details summary').click();
  await page.locator('#submit-btn').click();
  await expect(page.locator('#customer-details')).toHaveAttribute('open','');
  await expect(page.locator('#cust-name')).toBeFocused();
  await page.locator('#cust-name').fill('Beispielkunde');
  await page.locator('#customer-details summary').click();
  await page.locator('#notify-details summary').click();
  await page.locator('#opt-email').check();
  await expect(page.locator('#customer-details')).toHaveAttribute('open','');
  await expect(page.locator('#cust-email')).toBeFocused();
  await page.locator('#submit-btn').click();
  expect(posts).toHaveLength(0);
  await expect(page.locator('#error-box')).toContainText('E-Mail-Adresse');
  await page.locator('#cust-email').fill('beispiel@example.com');
  await page.locator('#submit-btn').click();
  await expect(page.locator('#success-overlay')).toHaveClass(/show/);
  expect(posts[0].notify_email).toBe(true);
});

test('TC-F2-02: Browserblockierung bereits kompakt sichtbar',async({page})=>{
  await setup(page,{blocked:true});
  await expect(page.locator('#notify-details')).not.toHaveAttribute('open','');
  await expect(page.locator('#notify-summary')).toContainText('App im Browser blockiert');
  await page.locator('#notify-details summary').click();
  await expect(page.locator('#opt-push')).not.toBeChecked();
  await expect(page.locator('#opt-push')).toBeDisabled();
});

test('TC-F3-01/02: Eingebetteter Dialog schließt oben und unten ohne verdeckte Aktionen',async({page},testInfo)=>{
  await setup(page);
  await page.goto(BASE+'/index.html');
  for(const button of ['#mt-back-btn','#order-close-bottom']){
    await page.evaluate(path=>openMittagPopup(path),PATH);
    await expect(page.locator('#mt-popup-overlay')).toHaveClass(/open/);
    await expect(page.locator('.mt-popup-close')).toBeHidden();
    const frame=page.frameLocator('#mt-popup-iframe');
    await expect(frame.locator('#dish-section')).toBeVisible();
    const edges=await frame.locator('body').evaluate(()=>{
      return ['.header','.lunch-cd','.dish-card','.form-card','.order-actions'].map(selector=>{
        const {left,right}=document.querySelector(selector).getBoundingClientRect();
        return {selector,left,right};
      });
    });
    for(const edge of edges){
      expect(Math.abs(edge.left-edges[0].left),edge.selector+' left edge').toBeLessThanOrEqual(1);
      expect(Math.abs(edge.right-edges[0].right),edge.selector+' right edge').toBeLessThanOrEqual(1);
    }
    await frame.locator('#notify-details summary').click();
    await frame.locator('#customer-details summary').click();
    await frame.locator('#note-details summary').click();
    await frame.locator('#note-input').fill('Ein Sonderwunsch');
    await frame.locator(button).scrollIntoViewIfNeeded();
    expect(await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(button==='#mt-back-btn') await page.screenshot({path:testInfo.outputPath('bestelldialog.png')});
    await frame.locator(button).click();
    await expect(page.locator('#mt-popup-overlay')).not.toHaveClass(/open/);
  }
  await page.evaluate(()=>openMittagPopup('/mein-konto.html'));
  await expect(page.locator('.mt-popup-close')).toBeVisible();
});

test('TC-F3-03: Bestellschluss bleibt wirksam',async({page})=>{
  const posts=await setup(page);
  await page.clock.setFixedTime(new Date('2026-10-30T12:30:00+01:00'));
  await page.evaluate(()=>submitOrder());
  expect(posts).toHaveLength(0);
  await expect(page.locator('#error-box')).toContainText('Bestellschluss');
});
