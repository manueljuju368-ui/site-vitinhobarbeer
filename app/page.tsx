import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Instagram,
  MapPin,
  MessageCircle,
  Scissors,
  Star,
  Users,
} from 'lucide-react';
import Booking from '@/components/Booking';
import {address, services, whatsapp} from '@/lib/data';

const whatsappUrl = `https://wa.me/${whatsapp}`;
const instagramUrl = 'https://instagram.com/vitinhobarber_ofc';
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export default function Home() {
  return (
    <main>
      <header>
        <a className="brand" href="#inicio" aria-label="Vitinho Barber — início">
          <span className="brandmark"><Scissors /></span><b>VITINHO</b><small>BARBER</small>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#servicos">Serviços</a><a href="#equipe">Equipe</a><a href="#portfolio">Trabalhos</a><a href="#local">Endereço</a>
        </nav>
        <a className="btn gold" href="#agendar">Agendar horário</a>
      </header>

      <section className="hero" id="inicio">
        <div className="heroCopy">
          <div className="eyebrow"><span /> SÃO LEOPOLDO • RS</div>
          <h1>Corte, barba e acabamento <em>do seu jeito.</em></h1>
          <p>Consulte os horários disponíveis e marque seu atendimento com Vitinho ou Pablo.</p>
          <div className="actions">
            <a className="btn gold" href="#agendar">Ver horários <ArrowRight /></a>
            <a className="btn ghost" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle /> Chamar no WhatsApp</a>
          </div>
          <div className="quick">
            <span><Clock3 />Seg–sáb</span><span><Users />2 barbeiros</span><span><MapPin />Santos Dumont</span>
          </div>
        </div>
        <div className="heroShade" />
      </section>

      <section id="servicos" className="section">
        <div className="sectionHead">
          <div><span className="kicker">SERVIÇOS E VALORES</span><h2>Escolha seu<br /><em>atendimento.</em></h2></div>
          <p>Valores e tempo estimado para você se organizar antes de marcar.</p>
        </div>
        <div className="serviceGrid">
          {services.map((service, index) => (
            <article className="service" key={service.id}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><h3>{service.name}</h3><p>{service.desc}</p><small><Clock3 /> {service.duration ? `${service.duration} min` : 'Tempo sob consulta'}</small></div>
              <strong>R$ {service.price.toFixed(2).replace('.', ',')}</strong>
              <a href="#agendar" aria-label={`Agendar ${service.name}`}><ArrowRight /></a>
            </article>
          ))}
        </div>
      </section>

      <section id="equipe" className="section team">
        <div className="sectionHead">
          <div><span className="kicker">QUEM ATENDE</span><h2>Escolha seu<br /><em>barbeiro.</em></h2></div>
          <p>Você escolhe o profissional durante o agendamento.</p>
        </div>
        <div className="teamGrid">
          <article className="barber featured"><div className="avatar">VB</div><span>BARBEIRO</span><h3>Vitinho OFC</h3><p>Consulte a agenda e escolha o melhor horário para o seu atendimento.</p><a href="#agendar">Ver agenda do Vitinho <ArrowRight /></a></article>
          <article className="barber"><div className="avatar">P</div><span>BARBEIRO</span><h3>Pablo</h3><p>Consulte a agenda e escolha o melhor horário para o seu atendimento.</p><a href="#agendar">Ver agenda do Pablo <ArrowRight /></a></article>
        </div>
      </section>

      <section id="portfolio" className="portfolio">
        <div><span className="kicker">TRABALHOS DA BARBEARIA</span><h2>Veja alguns<br /><em>cortes recentes.</em></h2><p>Fotos de atendimentos da Vitinho Barber. O trabalho completo está no Instagram.</p><a className="btn ghost" href={instagramUrl} target="_blank" rel="noreferrer"><Instagram /> @vitinhobarber_ofc</a></div>
        <div className="portfolioShots"><figure className="shot shotOne"><figcaption>Acabamento</figcaption></figure><figure className="shot shotTwo"><figcaption>Degradê e freestyle</figcaption></figure><figure className="shot shotThree"><figcaption>Desenho</figcaption></figure></div>
      </section>

      <section id="agendar" className="bookingSection">
        <div className="bookingIntro"><span className="kicker">AGENDAMENTO ONLINE</span><h2>Marque em<br /><em>poucos passos.</em></h2><ol><li><b>01</b><span>Escolha o serviço</span></li><li><b>02</b><span>Escolha o barbeiro</span></li><li><b>03</b><span>Selecione dia e horário</span></li><li><b>04</b><span>Informe seus dados</span></li></ol></div>
        <Booking />
      </section>

      <section className="reviews"><Star /><div><span className="kicker">AVALIAÇÕES</span><h2>Já foi atendido?</h2><p>Conte como foi sua experiência na barbearia.</p></div><a className="btn ghost" href="https://www.google.com/search?q=Vitinhobarber_ofc+São+Leopoldo" target="_blank" rel="noreferrer">Avaliar no Google</a></section>

      <section id="local" className="location">
        <div><span className="kicker">ENDEREÇO E HORÁRIOS</span><h2>Vitinho Barber</h2><p><MapPin /> {address}</p><p><Clock3 /> Segunda: 14h–20h<br />Terça a sábado: 9h–20h<br />Domingo: fechado</p><div className="actions"><a className="btn gold" href={mapsUrl} target="_blank" rel="noreferrer">Abrir no mapa</a><a className="btn ghost" href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a></div></div>
        <iframe title="Mapa da Vitinho Barber" loading="lazy" src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`} />
      </section>

      <footer>
        <a className="brand" href="#inicio"><span className="brandmark"><Scissors /></span><b>VITINHO</b><small>BARBER</small></a>
        <p>Barbearia no bairro Santos Dumont,<br />em São Leopoldo.</p>
        <div><a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a><a href={instagramUrl} target="_blank" rel="noreferrer">Instagram</a><a href="/privacidade">Privacidade</a><a href="/admin">Painel</a></div>
        <div className="developerCredit"><span>PROJETO E DESENVOLVIMENTO</span><b>KAIRUS COMERCIAL</b></div>
        <small>© {new Date().getFullYear()} Vitinho Barber · Todos os direitos reservados.</small>
      </footer>
      <a className="floatingWa" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="Abrir WhatsApp"><MessageCircle /></a>
      <a className="mobileBook" href="#agendar"><CalendarDays /> Ver horários</a>
    </main>
  );
}
