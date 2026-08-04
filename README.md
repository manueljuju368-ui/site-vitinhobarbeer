# Vitinho Barber

Site comercial em Next.js com agenda online, integração com Supabase, confirmação pelo
WhatsApp, painel administrativo e SEO local.

## Desenvolvimento

Requisitos: Node.js 20.19 ou superior.

```bash
npm install
npm run dev
```

O site abre em `http://localhost:3000`.

## Qualidade

Antes de publicar, execute:

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm audit
```

Os testes cobrem desktop, celular, fluxo de agenda, indisponibilidade da API, serviços
sob consulta, proteção do painel e comunicação com o banco.

## Configuração obrigatória de produção

Copie `.env.example` para o ambiente da hospedagem e configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SCHEMA_READY=true`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET` com pelo menos 32 caracteres aleatórios
- `NEXT_PUBLIC_SITE_URL` com o domínio público em HTTPS
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, quando o Search Console estiver disponível

Execute `supabase/schema.sql` no banco antes de habilitar `SUPABASE_SCHEMA_READY`.
Em produção, uma configuração incompleta faz a agenda retornar indisponibilidade; ela
não confirma reservas temporárias em memória.

Em um banco que já estava em produção, execute
`supabase/migrate-single-barber-smart-schedule.sql`. A migração desativa o Pablo sem
apagar o histórico, elimina grades duplicadas e salva os horários semanais do Vitinho.

## Regras do agendamento

- Reservas são aceitas com no mínimo uma hora de antecedência.
- A agenda pública exibe os próximos 14 dias úteis dentro de uma janela de 21 dias.
- Pigmentação, luzes e platinado são enviados para consulta pelo WhatsApp porque a
  duração depende de avaliação.
- O painel permite consultar qualquer data e atualizar o estado do atendimento.
- O painel permite registrar reservas recebidas pessoalmente ou pelo WhatsApp.
- Períodos e dias inteiros podem ser bloqueados pelo painel sem alterar o banco manualmente.
- A restrição do PostgreSQL impede sobreposição para o mesmo profissional.

## Rotina do painel

- Use **Novo agendamento** quando o cliente marcar fora do site. A reserva entra como
  confirmada e deixa de aparecer na agenda pública.
- Use **Bloquear horário** para almoço, compromisso, folga ou outra indisponibilidade.
- Um bloqueio não pode cobrir um cliente já agendado; cancele ou reorganize a reserva
  antes de bloquear o período.
- Os estados disponíveis são aguardando confirmação, confirmado, concluído, cancelado
  e não compareceu.

## Antes de apontar o domínio

Confirme diretamente com a barbearia:

- endereço exibido: `Av. Leopoldo Wasun, 140, Santos Dumont, São Leopoldo – RS, 93115-380`;
- WhatsApp: `+55 51 98971-9243`;
- horários de Vitinho OFC;
- preços e disponibilidade dos serviços;
- direito de uso das fotografias publicadas.

O domínio configurado no código é `vitinhobarber.com.br`. Ele precisa estar registrado,
com DNS ativo e apontado para a hospedagem. Configure o mesmo endereço em
`NEXT_PUBLIC_SITE_URL` antes do build final.
