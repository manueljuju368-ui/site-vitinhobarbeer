import {expect, test} from '@playwright/test';

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
  await page.waitForTimeout(800);
  await page.screenshot({path: testInfo.outputPath('mobile-full.png'), fullPage: true});
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

test('painel protegido e tela de login disponíveis', async ({page}) => {
  const response = await page.goto('/admin');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole('heading', {name: 'Agenda Vitinho'})).toBeVisible();
  await expect(page.locator('.loginLogo img')).toBeVisible();
});

test('serviços técnicos são encaminhados para consulta', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('.choices button')).toHaveCount(6);
  await expect(page.getByText('Quer pigmentação, luzes ou platinado?')).toBeVisible();
  await expect(page.getByRole('link', {name: 'Consultar', exact: true})).toHaveAttribute('href', /wa\.me/);
});

test('saúde da aplicação confirma o banco', async ({request}) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({status: 'ok', database: true});
});
