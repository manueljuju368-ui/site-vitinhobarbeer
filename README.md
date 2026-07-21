# Vitinho Barber

Site responsivo em Next.js com agendamento, integração opcional com Supabase, painel administrativo, SEO local e confirmação pelo WhatsApp.

## Rodar localmente

1. Instale Node.js 20 ou superior.
2. Execute `npm install`.
3. Copie `.env.example` para `.env.local` e preencha as chaves do Supabase.
4. No SQL Editor do Supabase, execute `supabase/schema.sql`.
5. Execute `npm run dev` e abra `http://localhost:3000`.

Sem as variáveis do Supabase, o site abre normalmente em modo de apresentação e o fluxo finaliza no WhatsApp. Com o Supabase configurado, os dados são gravados no banco.

## Antes de publicar

**Confirme o endereço antes de publicar:** o material usado no projeto informa `Rua Emílio Muller, 27`, mas uma referência anterior do Google indicava `Av. Leopoldo Wasun, 140`. O site usa provisoriamente o endereço do material da barbearia. Atualize `lib/data.ts` e `business_settings` se necessário.

Confirme os cadastros de Vitinho OFC e Pablo, substitua o hero derivado das referências pelas fotografias originais em alta resolução e crie o primeiro usuário administrativo.

## Segurança

O SQL ativa RLS nas tabelas sensíveis e inclui uma restrição PostgreSQL que impede sobreposição de horários para o mesmo barbeiro. Em produção, a criação pública de agendamentos deve passar por uma Server Action/RPC com rate limit e validação transacional; nunca exponha a service role no navegador.
