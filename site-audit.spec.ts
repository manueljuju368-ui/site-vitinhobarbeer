import {expect, test, type Page} from '@playwright/test';
import {isCalendarDate} from './lib/booking-date';

const adminConfigured = Boolean(
  process.env.ADMIN_PASSWORD
  && process.env.ADMIN_SESSION_SECRET
  && process.env.ADMIN_SESSION_SECRET.length >= 32,
);
const databaseConfigured = Boolean(
  process.env.SUPABASE_SCHEMA_READY === 'true'
  && process.env.NEXT_PUBLIC_SUPABASE_URL
  && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const adminIntegrationConfigured = adminConfigured && databaseConfigured;

async function expectLocalImagesLoaded(page: Page) {
  const images = page.locator('img');

  for (let index = 0; index < await images.count(); index += 1) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect.poll(
      () => image.evaluate((element) => {
        const currentImage = element as HTMLImageElement;
        return currentImage.complete ? currentImage.naturalWidth : 0;
      }),
      {message: `A imagem ${index + 1} não carregou no celular.`},
    ).toBeGreaterThan(0);
  }

  const sources = await images.evaluateAll((elements) => (
    elements.map((element) => {
      const image = element as HTMLImageElement;
      return image.currentSrc || image.getAttribute('src') || '';
    })
  ));
  expect(sources.every((source) => source && !source.includes('/_next/image'))).toBeTruthy();
}

async function reachBookingConfirmation(page: Page) {
  await page.route('**/api/availability**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({slots: [{time: '14:00', available: true}], duration: 60}),
  }));
  await page.goto('/#agendar');
  await page.locator('.choices button').first().click();
  await page.getByRole('button', {name: /continuar/i}).click();
  await page.getByRole('button', {name: /continuar/i}).click();
  await page.getByRole('button', {name: /14:00 disponível/i}).click();
  await page.getByRole('button', {name: /continuar/i}).click();
  await page.getByLabel('Nome completo').fill('Cliente Teste');
  await page.getByRole('textbox', {name: 'WhatsApp', exact: true}).fill('51999999999');
}

test('desktop: conteúdo, marca e responsividade base', async ({page}, testInfo) => {
  await page.setViewportSize({width: 1440, height: 1000});
  await page.goto('/');
  await expect(page.locator('.heroMedia')).toBeVisible();
  await expect.poll(
    () => page.locator('.heroMedia').evaluate((element) => (element as HTMLImageElement).currentSrc),
  ).toContain('hero-campaign-v2.webp');
  await expect(page.locator('.siteHeader .brandmark img')).toBeVisible();
  await expect(page.locator('h1')).toContainText('Seu próximo corte');

  for (const id of ['servicos', 'equipe', 'portfolio', 'agendar', 'local']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`#${id}`)).toBeVisible();
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await page.waitForTimeout(800);
  await page.screenshot({path: testInfo.outputPath('desktop-full.png'), fullPage: true});
});

test('mobile: sem vazamento e com chamada fixa', async ({page}, testInfo) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/');
  await expect(page.locator('.mobileBook')).toBeVisible();
  await expect(page.locator('.floatingWa')).toBeHidden();
  await expect.poll(
    () => page.locator('.heroMedia').evaluate((element) => (element as HTMLImageElement).currentSrc),
  ).toContain('corte-degrade-v2.webp');
  await page.screenshot({path: testInfo.outputPath('mobile-hero.png'), fullPage: false});

  for (const id of ['inicio', 'servicos', 'equipe', 'portfolio', 'agendar', 'local']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    const box = await page.locator(`#${id}`).boundingBox();
    expect(box).not.toBeNull();
    expect((box?.x || 0) >= -1).toBeTruthy();
    expect((box?.width || 999) <= 391).toBeTruthy();
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await expectLocalImagesLoaded(page);

  const touchTargets = page.locator([
    '.siteHeader .brand',
    '.bookingHelp a',
    '.consultationBox a',
    '.barber a',
    'footer > div > a',
  ].join(','));
  for (let index = 0; index < await touchTargets.count(); index += 1) {
    const height = await touchTargets.nth(index).evaluate((element) => (
      element.getBoundingClientRect().height
    ));
    expect(height).toBeGreaterThanOrEqual(44);
  }

  await page.waitForTimeout(800);
  await page.screenshot({path: testInfo.outputPath('mobile-full.png'), fullPage: true});
});

test('mobile: links e botões estão íntegros e não ficam cobertos', async ({page}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({width: 390, height: 844});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');

  const links = await page.locator('a[href]').evaluateAll((elements) => elements.map((element) => ({
    href: element.getAttribute('href') || '',
    label: (element.getAttribute('aria-label') || element.textContent || '').trim(),
  })));

  expect(links.length).toBeGreaterThan(0);
  expect(links.filter(({href, label}) => !href || !label)).toEqual([]);

  for (const {href} of links) {
    if (href.startsWith('#')) {
      expect(await page.locator(href).count()).toBe(1);
      continue;
    }
    if (href.startsWith('/')) continue;

    const url = new URL(href);
    expect(url.protocol).toBe('https:');
  }

  const controls = page.locator('a[href]:visible:not(.skipLink), button:visible:not([disabled])');
  const undersized: Array<{label: string; width: number; height: number}> = [];
  for (let index = 0; index < await controls.count(); index += 1) {
    const control = controls.nth(index);
    const result = await control.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        label: (element.getAttribute('aria-label') || element.textContent || '').trim(),
        width: bounds.width,
        height: bounds.height,
      };
    });
    if (result.width < 44 || result.height < 44) undersized.push(result);
  }
  expect(undersized).toEqual([]);

  await page.setViewportSize({width: 1440, height: 900});
  for (const hash of ['#agendar', '#servicos', '#portfolio', '#equipe', '#local']) {
    await page.goto('/');
    const link = page.locator(`a[href="${hash}"]:visible`).first();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
    const target = page.locator(hash);
    await expect(target).toBeVisible();
  }

  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/');
  await page.locator('footer').scrollIntoViewIfNeeded();
  const footerLast = page.locator('footer > small');
  const fixedCta = page.locator('.mobileBook');
  const [footerBox, ctaBox] = await Promise.all([footerLast.boundingBox(), fixedCta.boundingBox()]);
  expect(footerBox).not.toBeNull();
  expect(ctaBox).not.toBeNull();
  expect((footerBox?.y || 0) + (footerBox?.height || 0)).toBeLessThan(ctaBox?.y || 0);
});

test('mobile compacto: imagens e conteúdo cabem em 320px', async ({page}) => {
  await page.setViewportSize({width: 320, height: 568});
  await page.goto('/');

  await expectLocalImagesLoaded(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();

  const cards = await page.locator('.portfolioGallery figure').evaluateAll((elements) => (
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {width: rect.width, height: rect.height};
    })
  ));
  expect(cards.every(({width, height}) => width <= 320 && height <= 360)).toBeTruthy();
});

test('celular na horizontal mantém a chamada principal visível', async ({page}) => {
  await page.setViewportSize({width: 844, height: 390});
  await page.goto('/');

  const title = page.locator('h1');
  await expect(title).toBeVisible();
  const box = await title.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.y || 999) < 390).toBeTruthy();
  await expect(page.locator('.mobileBook')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});

test('conteúdo aparece conforme o visitante rola a página', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/');

  const target = page.locator('#servicos .service').first();
  await expect(target).toHaveClass(/reveal/);
  await page.waitForTimeout(1600);
  await expect(target).not.toHaveClass(/visible/);

  await target.scrollIntoViewIfNeeded();
  await expect(target).toHaveClass(/visible/);
});

test('trabalhos reais têm carrossel organizado e navegável', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/#portfolio');

  const carousel = page.getByRole('region', {name: 'Carrossel de trabalhos reais'});
  await expect(carousel.locator('figure')).toHaveCount(9);
  await expect(page.getByText('Arraste para ver os trabalhos')).toBeVisible();
  await expect(page.getByLabel('Foto anterior')).toBeDisabled();
  await page.getByLabel('Próxima foto').click();
  await expect(page.locator('.portfolioControls strong')).toContainText('02');
  await expectLocalImagesLoaded(page);
});

test('agendamento: percorre as quatro etapas e valida os dados', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/#agendar');

  await page.locator('.choices button').first().click();
  await page.getByRole('button', {name: /continuar/i}).click();
  await expect(page.getByRole('heading', {name: /escolha o profissional/i})).toBeVisible();
  await page.getByRole('button', {name: /continuar/i}).click();
  await expect(page.getByRole('heading', {name: /escolha dia e horário/i})).toBeVisible();
  await expect(page.locator('.slotLoading')).toBeHidden();

  const dateButtons = page.locator('.dateChoices button');
  const labels = await dateButtons.allTextContents();
  expect(labels.every((label) => !label.toLocaleLowerCase('pt-BR').includes('dom'))).toBeTruthy();

  let available = page.locator('.times button:not([disabled])');
  for (let index = 1; index < await dateButtons.count() && await available.count() === 0; index += 1) {
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/availability')),
      dateButtons.nth(index).click(),
    ]);
    available = page.locator('.times button:not([disabled])');
  }
  await expect(available.first()).toBeVisible();
  await available.first().click();
  await page.getByRole('button', {name: /continuar/i}).click();

  const name = page.getByLabel('Nome completo');
  const phone = page.getByRole('textbox', {name: 'WhatsApp', exact: true});
  for (const field of [name, phone]) {
    const fontSize = await field.evaluate((element) => (
      Number.parseFloat(window.getComputedStyle(element).fontSize)
    ));
    expect(fontSize).toBeGreaterThanOrEqual(16);
  }
  await name.fill('Vi');
  await name.blur();
  await expect(page.getByText('Informe seu nome completo.')).toBeVisible();
  await name.fill('Cliente Teste');
  await phone.fill('51999999999');
  await expect(phone).toHaveValue('(51) 99999-9999');
  await expect(page.getByRole('button', {name: /confirmar agendamento/i})).toBeEnabled();
});

test('agendamento: exibe recuperação quando a agenda falha', async ({page}) => {
  await page.route('**/api/availability**', (route) => route.abort('failed'));
  await page.goto('/#agendar');
  await page.locator('.choices button').first().click();
  await page.getByRole('button', {name: /continuar/i}).click();
  await page.getByRole('button', {name: /continuar/i}).click();
  await expect(page.getByText(/agenda não respondeu/i)).toBeVisible();
  await expect(page.getByRole('button', {name: /tentar novamente/i})).toBeVisible();
});

test('agendamento mantém o fluxo funcional no desktop', async ({page}, testInfo) => {
  await page.setViewportSize({width: 1440, height: 1000});
  await page.goto('/#agendar');

  const card = page.locator('.bookingCard');
  const expectCardInView = async () => expect.poll(async () => {
    const bounds = await card.boundingBox();
    return Boolean(
      bounds
      && bounds.x >= 0
      && bounds.x + bounds.width <= 1441
      && bounds.width >= 500
      && bounds.width <= 700
      && bounds.y >= 88
      && bounds.y <= 130
    );
  }).toBeTruthy();

  await expect(card).toBeVisible();
  const serviceButtons = card.locator('.choices button');
  for (let index = 0; index < await serviceButtons.count(); index += 1) {
    await serviceButtons.nth(index).click();
    await expect(serviceButtons.nth(index)).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByRole('button', {name: /continuar/i}).click();
  await expect(page.getByRole('heading', {name: /escolha o profissional/i})).toBeVisible();
  await expectCardInView();

  const barberButtons = card.locator('.barberChoices button');
  for (let index = 0; index < await barberButtons.count(); index += 1) {
    await barberButtons.nth(index).click();
    await expect(barberButtons.nth(index)).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByRole('button', {name: /continuar/i}).click();
  await expect(page.getByRole('heading', {name: /escolha dia e horário/i})).toBeVisible();
  await expect(page.locator('.slotLoading')).toBeHidden();
  await expectCardInView();

  const dateButtons = card.locator('.dateChoices button');
  let available = card.locator('.times button:not([disabled])');
  for (let index = 1; index < await dateButtons.count() && await available.count() === 0; index += 1) {
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/availability')),
      dateButtons.nth(index).click(),
    ]);
    available = card.locator('.times button:not([disabled])');
  }
  await expect(available.first()).toBeVisible();
  await available.first().click();
  await page.getByRole('button', {name: /continuar/i}).click();
  await expect(page.getByRole('heading', {name: /confirme seus dados/i})).toBeVisible();
  await expectCardInView();
  await page.screenshot({path: testInfo.outputPath('desktop-booking.png'), fullPage: false});

  await page.getByRole('button', {name: /voltar/i}).click();
  await expect(page.getByRole('heading', {name: /escolha dia e horário/i})).toBeVisible();
  await expectCardInView();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});

test('confirmação conclui o pedido e prepara o WhatsApp', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await reachBookingConfirmation(page);

  let submitted: Record<string, unknown> | null = null;
  await page.route('**/api/appointments', async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ok: true}),
    });
  });
  await page.getByRole('button', {name: /confirmar agendamento/i}).click();

  await expect(page.getByRole('heading', {name: 'Seu horário está reservado!'})).toBeVisible();
  expect(submitted).toMatchObject({
    name: 'Cliente Teste',
    phone: '51999999999',
    serviceId: 'navalhado',
    barberName: 'Vitinho OFC',
    time: '14:00',
  });
  await expect(page.getByRole('link', {name: /enviar mensagem de confirmação/i})).toHaveAttribute(
    'href',
    /wa\.me\/5551989719243/,
  );
});

test('conflito de reserva devolve o cliente para escolher outro horário', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await reachBookingConfirmation(page);
  await page.route('**/api/appointments', (route) => route.fulfill({
    status: 409,
    contentType: 'application/json',
    body: JSON.stringify({error: 'Este horário acabou de ser reservado. Escolha outro.'}),
  }));
  await page.getByRole('button', {name: /confirmar agendamento/i}).click();

  await expect(page.getByRole('heading', {name: /escolha dia e horário/i})).toBeVisible();
  await expect(page.locator('.bookingError')).toContainText('Este horário acabou de ser reservado');
  await expect(page.getByRole('button', {name: /continuar/i})).toBeDisabled();
});

test('painel e API administrativa permanecem protegidos', async ({page, request}) => {
  const apiResponse = await request.get('/api/admin/appointments');
  expect(apiResponse.status()).toBe(401);
  const blocksResponse = await request.get('/api/admin/blocks?date=2026-08-01');
  expect(blocksResponse.status()).toBe(401);
  expect((await request.post('/api/admin/appointments', {data: {}})).status()).toBe(401);
  expect((await request.post('/api/admin/blocks', {data: {}})).status()).toBe(401);

  const invalidLogin = await request.post('/api/login', {data: {password: 'senha-incorreta'}});
  expect(invalidLogin.status()).toBe(adminConfigured ? 401 : 503);
  expect(invalidLogin.headers()['set-cookie']).toBeUndefined();

  const response = await page.goto('/admin');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole('heading', {name: 'Agenda Vitinho'})).toBeVisible();
  await expect(page.locator('.loginLogo img')).toBeVisible();
});

test('painel autenticado funciona no celular', async ({page}, testInfo) => {
  test.skip(!adminIntegrationConfigured, 'Painel e banco não configurados para o teste autenticado.');
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/login');
  await page.getByLabel('Senha de acesso').fill(process.env.ADMIN_PASSWORD || '');

  const appointmentsResponse = page.waitForResponse((response) => (
    response.url().includes('/api/admin/appointments')
    && response.request().method() === 'GET'
  ));
  await page.getByRole('button', {name: /acessar agenda/i}).click();
  await expect(page).toHaveURL(/\/admin$/, {timeout: 15_000});
  expect((await appointmentsResponse).status()).toBe(200);

  await expect(page.getByRole('heading', {name: 'Agenda da barbearia'})).toBeVisible();
  await expect(page.locator('.agendaMetrics article')).toHaveCount(4);
  await expectLocalImagesLoaded(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  expect((await page.request.post('/api/admin/appointments', {data: {}})).status()).toBe(400);
  expect((await page.request.post('/api/admin/blocks', {data: {}})).status()).toBe(400);

  const currentDate = await page.locator('.agendaDatePicker input').inputValue();
  const nextResponse = page.waitForResponse((response) => (
    response.url().includes('/api/admin/appointments')
    && response.url().includes('date=')
    && response.request().method() === 'GET'
  ));
  await page.locator('.agendaDatePicker > button').nth(1).click();
  await expect(page.locator('.agendaDatePicker input')).not.toHaveValue(currentDate);
  expect((await nextResponse).status()).toBe(200);

  const filterHeights = await page.locator('.agendaToolbar button').evaluateAll((buttons) => (
    buttons.map((button) => button.getBoundingClientRect().height)
  ));
  expect(filterHeights.every((height) => height >= 44)).toBeTruthy();

  let manualAppointment: Record<string, unknown> | null = null;
  await page.route('**/api/admin/appointments', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    manualAppointment = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ok: true, id: '00000000-0000-4000-8000-000000000001'}),
    });
  });
  await page.getByRole('button', {name: /novo agendamento/i}).click();
  const appointmentDialog = page.getByRole('dialog', {name: /adicionar à agenda/i});
  await expect(appointmentDialog).toBeVisible();
  await appointmentDialog.getByLabel('Nome do cliente').fill('Cliente do WhatsApp');
  await appointmentDialog.getByLabel('WhatsApp').fill('51999999999');
  await appointmentDialog.screenshot({path: testInfo.outputPath('admin-new-appointment.png')});
  await appointmentDialog.getByRole('button', {name: /criar agendamento/i}).click();
  await expect(appointmentDialog).toBeHidden();
  await expect(page.getByText('Agendamento criado e horário reservado.')).toBeVisible();
  expect(manualAppointment).toMatchObject({name: 'Cliente do WhatsApp', phone: '(51) 99999-9999'});

  let manualBlock: Record<string, unknown> | null = null;
  await page.route('**/api/admin/blocks', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    manualBlock = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ok: true, id: '00000000-0000-4000-8000-000000000002'}),
    });
  });
  await page.getByRole('button', {name: /bloquear horário/i}).click();
  const blockDialog = page.getByRole('dialog', {name: /bloquear agenda/i});
  await expect(blockDialog).toBeVisible();
  await blockDialog.getByLabel(/bloquear o dia inteiro/i).check();
  await blockDialog.getByLabel(/motivo/i).fill('Folga');
  await blockDialog.screenshot({path: testInfo.outputPath('admin-block-time.png')});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await blockDialog.getByRole('button', {name: /bloquear período/i}).click();
  await expect(blockDialog).toBeHidden();
  await expect(page.getByText('Período bloqueado na agenda.')).toBeVisible();
  expect(manualBlock).toMatchObject({fullDay: true, reason: 'Folga'});
  const adminLayout = await page.evaluate(() => {
    const rect = (selector: string) => {
      const bounds = document.querySelector(selector)?.getBoundingClientRect();
      return bounds ? {x: bounds.x, width: bounds.width, right: bounds.right} : null;
    };
    return {
      scrollX,
      innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      main: rect('.agendaAdmin'),
      aside: rect('.agendaAdmin > aside'),
      content: rect('.agendaAdmin > section'),
      overflowers: Array.from(document.querySelectorAll<HTMLElement>('body *'))
        .map((element) => {
          const bounds = element.getBoundingClientRect();
          return {
            element: `${element.tagName.toLowerCase()}.${element.className}`,
            x: Math.round(bounds.x),
            right: Math.round(bounds.right),
            width: Math.round(bounds.width),
          };
        })
        .filter(({x, right}) => x < -1 || right > window.innerWidth + 1)
        .slice(0, 12),
    };
  });
  await testInfo.attach('admin-mobile-layout', {
    body: JSON.stringify(adminLayout, null, 2),
    contentType: 'application/json',
  });
  expect(adminLayout.scrollX).toBe(0);
  expect(adminLayout.main?.x || 0).toBeGreaterThanOrEqual(0);
  expect(adminLayout.content?.x || 0).toBeGreaterThanOrEqual(0);
  expect(adminLayout.main?.width || 0).toBeGreaterThanOrEqual(390);
  expect(adminLayout.content?.width || 0).toBeGreaterThanOrEqual(350);
  expect(adminLayout.overflowers).toEqual([]);
  await page.screenshot({path: testInfo.outputPath('admin-mobile.png'), fullPage: true});

  const logoutResponse = page.waitForResponse((response) => (
    response.url().includes('/api/logout') && response.request().method() === 'POST'
  ));
  await page.getByRole('button', {name: /sair/i}).click();
  expect((await logoutResponse).status()).toBe(200);
  await expect(page).toHaveURL(/\/login$/, {timeout: 15_000});
  expect((await page.request.get('/api/admin/appointments')).status()).toBe(401);
});

test('painel autenticado permanece organizado no desktop', async ({page}) => {
  test.skip(!adminIntegrationConfigured, 'Painel e banco não configurados para o teste autenticado.');
  await page.setViewportSize({width: 1440, height: 1000});
  await page.goto('/login');
  await page.getByLabel('Senha de acesso').fill(process.env.ADMIN_PASSWORD || '');
  await page.getByRole('button', {name: /acessar agenda/i}).click();

  await expect(page).toHaveURL(/\/admin$/, {timeout: 15_000});
  await expect(page.locator('.agendaAdmin aside')).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Agenda da barbearia'})).toBeVisible();
  await expect(page.locator('.agendaMetrics article')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});

test('serviços técnicos são encaminhados para consulta', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('.choices button')).toHaveCount(6);
  await expect(page.getByText('Quer pigmentação, luzes ou platinado?')).toBeVisible();
  await expect(page.getByRole('link', {name: 'Consultar', exact: true})).toHaveAttribute('href', /wa\.me/);
});

test('localização usa o cadastro oficial da barbearia no Google', async ({page}) => {
  await page.goto('/#local');
  const location = page.locator('#local');

  await expect(location).toContainText('Av. Leopoldo Wasun, 140');
  await expect(location.getByRole('link', {name: 'Abrir no mapa'})).toHaveAttribute(
    'href',
    'https://www.google.com/maps?cid=10751965307132235080',
  );
  await expect(location.locator('iframe')).toHaveAttribute(
    'src',
    /cid=10751965307132235080/,
  );
  await expect(page.getByRole('link', {name: 'Avaliar no Google'})).toHaveAttribute(
    'href',
    'https://www.google.com/maps?cid=10751965307132235080',
  );
});

test('compartilhamento social usa a capa com a logo oficial', async ({page, request}) => {
  await page.goto('/');
  const expectedImage = 'https://vitinhobarbeer-oficial.vercel.app/social-preview-vitinho-v1.jpg';

  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', expectedImage);
  await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute('content', 'image/jpeg');
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', expectedImage);

  const imageResponse = await request.get('/social-preview-vitinho-v1.jpg');
  expect(imageResponse.status()).toBe(200);
  expect(imageResponse.headers()['content-type']).toContain('image/jpeg');
});

test('saúde da aplicação confirma o banco', async ({request}) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(databaseConfigured ? 200 : 503);
  await expect(response.json()).resolves.toMatchObject(databaseConfigured
    ? {status: 'ok', database: true}
    : {status: 'degraded', database: false});
});

test('API rejeita datas impossíveis e horários fora da grade', async ({request}) => {
  expect(isCalendarDate('2026-02-29')).toBeFalsy();
  expect(isCalendarDate('2028-02-29')).toBeTruthy();

  const invalidAvailability = await request.get(
    '/api/availability?date=2026-02-29&barber=Vitinho%20OFC&service=social',
  );
  expect(invalidAvailability.status()).toBe(400);

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const candidate = new Date();
  candidate.setDate(candidate.getDate() + 2);
  while (candidate.getDay() === 0) candidate.setDate(candidate.getDate() + 1);

  const invalidSlot = await request.post('/api/appointments', {
    data: {
      name: 'Cliente Teste',
      phone: '51999999999',
      serviceId: 'social',
      barberName: 'Vitinho OFC',
      date: formatter.format(candidate),
      time: '09:17',
    },
  });
  expect(invalidSlot.status()).toBe(400);
  await expect(invalidSlot.json()).resolves.toMatchObject({
    error: 'Escolha um dos horários exibidos na agenda.',
  });
});
