import {expect, test, type Page} from '@playwright/test';

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

test('desktop: conteúdo, marca e responsividade base', async ({page}, testInfo) => {
  await page.setViewportSize({width: 1440, height: 1000});
  await page.goto('/');
  await expect(page.locator('.heroMedia')).toBeVisible();
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

  for (const id of ['inicio', 'servicos', 'equipe', 'portfolio', 'agendar', 'local']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    const box = await page.locator(`#${id}`).boundingBox();
    expect(box).not.toBeNull();
    expect((box?.x || 0) >= -1).toBeTruthy();
    expect((box?.width || 999) <= 391).toBeTruthy();
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await expectLocalImagesLoaded(page);
  await page.waitForTimeout(800);
  await page.screenshot({path: testInfo.outputPath('mobile-full.png'), fullPage: true});
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

test('painel e API administrativa permanecem protegidos', async ({page, request}) => {
  const apiResponse = await request.get('/api/admin/appointments');
  expect(apiResponse.status()).toBe(401);

  const response = await page.goto('/admin');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole('heading', {name: 'Agenda Vitinho'})).toBeVisible();
  await expect(page.locator('.loginLogo img')).toBeVisible();
});

test('painel autenticado funciona no celular', async ({page}) => {
  test.skip(!process.env.ADMIN_PASSWORD, 'ADMIN_PASSWORD não configurada para o teste autenticado.');
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/login');
  await page.getByLabel('Senha de acesso').fill(process.env.ADMIN_PASSWORD || '');

  const appointmentsResponse = page.waitForResponse((response) => (
    response.url().includes('/api/admin/appointments')
    && response.request().method() === 'GET'
  ));
  await page.getByRole('button', {name: /acessar agenda/i}).click();
  await expect(page).toHaveURL(/\/admin$/);
  expect((await appointmentsResponse).status()).toBe(200);

  await expect(page.getByRole('heading', {name: 'Agenda da barbearia'})).toBeVisible();
  await expect(page.locator('.agendaMetrics article')).toHaveCount(4);
  await expectLocalImagesLoaded(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();

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
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({status: 'ok', database: true});
});
