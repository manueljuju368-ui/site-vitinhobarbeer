import type {Metadata} from 'next';
import Link from 'next/link';
import {address, whatsapp} from '@/lib/data';
import {whatsappLink} from '@/lib/site';

export const metadata: Metadata = {
  title: 'Política de privacidade',
  description: 'Como a Vitinho Barber utiliza e protege os dados informados no agendamento.',
  alternates: {canonical: '/privacidade'},
};

const privacyContact = whatsappLink(
  whatsapp,
  'Olá! Gostaria de falar sobre meus dados pessoais informados no site.',
);

export default function Privacy() {
  return (
    <main className="legal">
      <Link className="legalBack" href="/">← Voltar ao site</Link>
      <span className="kicker">TRANSPARÊNCIA</span>
      <h1>Política de privacidade</h1>
      <p className="legalLead">
        Esta política explica como a Vitinho Barber trata os dados enviados durante o
        agendamento online.
      </p>

      <h2>Quem controla os dados</h2>
      <p>
        A Vitinho Barber, localizada em {address}, é responsável pelos dados tratados
        neste site. O canal de contato para assuntos de privacidade é o
        {' '}<a href={privacyContact} target="_blank" rel="noreferrer">WhatsApp da barbearia</a>.
      </p>

      <h2>Dados utilizados e finalidade</h2>
      <p>
        Utilizamos nome, telefone, serviço, profissional, data e horário para registrar,
        organizar, confirmar e atender a solicitação de agendamento. Dados técnicos
        mínimos, como endereço IP, também podem ser usados para prevenir abuso e fraude.
      </p>

      <h2>Base e duração do tratamento</h2>
      <p>
        O tratamento é necessário para atender ao pedido de agendamento feito pelo
        cliente e para proteger o funcionamento do serviço. Os dados são mantidos pelo
        tempo necessário à organização do atendimento, ao cumprimento de obrigações
        legais e ao exercício regular de direitos; depois disso, são eliminados ou
        anonimizados quando aplicável.
      </p>

      <h2>Armazenamento e compartilhamento</h2>
      <p>
        Os agendamentos são armazenados em infraestrutura tecnológica contratada pela
        Vitinho Barber. Os dados não são vendidos. Eles podem ser processados por
        fornecedores de hospedagem, banco de dados e comunicação somente na medida
        necessária para operar o serviço. Ao abrir o WhatsApp, aplicam-se também as
        políticas da plataforma.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode solicitar confirmação do tratamento, acesso, correção, informação
        sobre compartilhamento, anonimização, bloqueio ou eliminação quando cabível.
        Também pode apresentar dúvidas ou oposição pelo canal de contato informado.
      </p>

      <h2>Segurança e atualizações</h2>
      <p>
        Aplicamos medidas técnicas e administrativas proporcionais ao serviço para
        reduzir acessos indevidos, perda e alteração de dados. Esta política poderá ser
        atualizada para refletir mudanças no site ou na legislação.
      </p>
      <small>Última atualização: 27 de julho de 2026.</small>
    </main>
  );
}
