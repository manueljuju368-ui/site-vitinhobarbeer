import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CalendarDays,
  Clock3,
  Instagram,
  MapPin,
  MessageCircle,
  Scissors,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Brand, {BrandMark} from '@/components/Brand';
import Booking from '@/components/Booking';
import PortfolioCarousel from '@/components/PortfolioCarousel';
import {address, barbers, services, whatsapp} from '@/lib/data';
import {
  googleMapsEmbedUrl,
  googleMapsUrl,
  googleReviewUrl,
  instagramUrl,
  whatsappLink,
} from '@/lib/site';

const generalWhatsappUrl = whatsappLink(
  whatsapp,
  'Olá! Vim pelo site da Vitinho Barber e gostaria de tirar uma dúvida.',
);
const consultationUrl = whatsappLink(
  whatsapp,
  'Olá! Vim pelo site e gostaria de consultar um horário para pigmentação, luzes ou platinado.',
);
export default function Home() {
  return (
    <main>
      <a className="skipLink" href="#conteudo">Pular para o conteúdo</a>

      <header className="siteHeader">
        <Brand />
        <nav aria-label="Navegação principal">
          <a href="#agendar">Agenda</a>
          <a href="#servicos">Serviços</a>
          <a href="#portfolio">Trabalhos</a>
          <a href="#equipe">Equipe</a>
          <a href="#local">Endereço</a>
        </nav>
        <a className="btn gold headerCta" href="#agendar">
          <CalendarDays /> Agendar horário
        </a>
      </header>

      <section className="hero" id="inicio" aria-labelledby="hero-title">
        <picture className="heroPicture" aria-hidden="true">
          <source
            media="(max-width: 600px)"
            srcSet="/corte-degrade-v2.webp"
            type="image/webp"
          />
          <Image
            className="heroMedia"
            src="/hero-campaign-v2.webp"
            alt=""
            fill
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
          />
        </picture>
        <div className="heroShade" />
        <div className="heroCopy">
          <div className="eyebrow"><span /> SÃO LEOPOLDO • RS</div>
          <h1 id="hero-title">Seu próximo corte <em>começa aqui.</em></h1>
          <p>
            Escolha o serviço, veja os horários livres e marque com Vitinho ou Pablo
            em poucos passos.
          </p>
          <div className="actions">
            <a className="btn gold heroPrimary" href="#agendar">
              Escolher meu horário <ArrowRight />
            </a>
            <a className="btn ghost" href="#portfolio">
              <Sparkles /> Ver trabalhos reais
            </a>
          </div>
          <div className="heroProof" aria-label="Informações rápidas">
            <span><CalendarCheck /><b>Agenda online</b><small>Consulte em tempo real</small></span>
            <span><Users /><b>2 profissionais</b><small>Escolha quem atende</small></span>
            <span><Scissors /><b>A partir de R$ 15</b><small>Valores transparentes</small></span>
          </div>
        </div>
        <a className="heroReview" href={googleReviewUrl} target="_blank" rel="noreferrer">
          <Star />
          <span><b>Já é cliente?</b><small>Avalie a barbearia no Google</small></span>
          <ArrowRight />
        </a>
      </section>

      <div id="conteudo" />

      <section className="valueStrip" aria-label="Vantagens do agendamento">
        <article><CalendarCheck /><span><b>Você escolhe</b><small>Dia, horário e profissional</small></span></article>
        <article><BadgeCheck /><span><b>Sem surpresa</b><small>Preço informado antes de marcar</small></span></article>
        <article><MessageCircle /><span><b>Contato direto</b><small>Confirmação pelo WhatsApp</small></span></article>
      </section>

      <section id="agendar" className="bookingSection conversionSection" aria-labelledby="booking-title">
        <div className="bookingIntro">
          <span className="kicker">AGENDE AGORA</span>
          <h2 id="booking-title">Garanta seu<br /><em>horário.</em></h2>
          <p>
            A agenda mostra apenas os horários disponíveis. Escolha com calma e envie
            seus dados para a equipe confirmar.
          </p>
          <ol>
            <li><b>01</b><span>Escolha o serviço</span></li>
            <li><b>02</b><span>Escolha o barbeiro</span></li>
            <li><b>03</b><span>Selecione dia e horário</span></li>
            <li><b>04</b><span>Informe nome e WhatsApp</span></li>
          </ol>
          <div className="bookingHelp">
            <MessageCircle />
            <span><b>Prefere falar com alguém?</b><small>A equipe responde direto no WhatsApp.</small></span>
            <a href={generalWhatsappUrl} target="_blank" rel="noreferrer">Chamar</a>
          </div>
        </div>
        <Booking />
      </section>

      <section id="servicos" className="section servicesSection" aria-labelledby="services-title">
        <div className="sectionHead">
          <div>
            <span className="kicker">SERVIÇOS E VALORES</span>
            <h2 id="services-title">Escolha o seu<br /><em>atendimento.</em></h2>
          </div>
          <p>
            Valores claros para você decidir antes de marcar. Serviços técnicos são
            combinados diretamente com a equipe.
          </p>
        </div>
        <div className="serviceGrid">
          {services.map((service, index) => {
            const bookable = service.duration !== null;
            const href = bookable ? '#agendar' : consultationUrl;
            return (
              <article className="service" key={service.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{service.name}</h3>
                  <p>{service.desc}</p>
                  <small>
                    <Clock3 />
                    {bookable ? `${service.duration} min` : 'Duração sob consulta'}
                  </small>
                </div>
                <strong>R$ {service.price.toFixed(2).replace('.', ',')}</strong>
                <a
                  href={href}
                  target={bookable ? undefined : '_blank'}
                  rel={bookable ? undefined : 'noreferrer'}
                  aria-label={bookable ? `Agendar ${service.name}` : `Consultar ${service.name} no WhatsApp`}
                >
                  {bookable ? <ArrowRight /> : <MessageCircle />}
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section id="portfolio" className="portfolio portfolioV2" aria-labelledby="portfolio-title">
        <div className="portfolioCopy">
          <span className="kicker">TRABALHOS REAIS</span>
          <h2 id="portfolio-title">Resultado que<br /><em>fala por si.</em></h2>
          <p>
            Cortes realizados na Vitinho Barber. Veja mais transformações e novidades
            no perfil oficial.
          </p>
          <a className="btn ghost" href={instagramUrl} target="_blank" rel="noreferrer">
            <Instagram /> @vitinhobarber_ofc
          </a>
        </div>
        <PortfolioCarousel />
      </section>

      <section id="equipe" className="section team" aria-labelledby="team-title">
        <div className="sectionHead">
          <div>
            <span className="kicker">QUEM ATENDE</span>
            <h2 id="team-title">Seu estilo,<br /><em>sua escolha.</em></h2>
          </div>
          <p>Selecione o profissional no agendamento e consulte a disponibilidade.</p>
        </div>
        <div className="teamGrid">
          {barbers.map((barber, index) => (
            <article className={`barber ${index === 0 ? 'featured' : ''}`} key={barber.name}>
              <div className="avatar" aria-hidden="true">{index === 0 ? <BrandMark /> : barber.initials}</div>
              <span>BARBEIRO</span>
              <h3>{barber.name}</h3>
              <p>{barber.description}</p>
              <a href="#agendar">Ver agenda do {barber.firstName} <ArrowRight /></a>
            </article>
          ))}
        </div>
      </section>

      <section className="reviews">
        <Star />
        <div>
          <span className="kicker">SUA EXPERIÊNCIA CONTA</span>
          <h2>Já foi atendido?</h2>
          <p>Uma avaliação ajuda outras pessoas a conhecerem o nosso trabalho.</p>
        </div>
        <a className="btn ghost" href={googleReviewUrl} target="_blank" rel="noreferrer">
          Avaliar no Google
        </a>
      </section>

      <section id="local" className="location" aria-labelledby="location-title">
        <div>
          <span className="kicker">ENDEREÇO E HORÁRIOS</span>
          <h2 id="location-title">Vitinho Barber</h2>
          <p><MapPin /> {address}</p>
          <p><Clock3 /> Segunda: 14h–20h<br />Terça a sábado: 9h–20h<br />Domingo: fechado</p>
          <div className="actions">
            <a className="btn gold" href={googleMapsUrl} target="_blank" rel="noreferrer">Abrir no mapa</a>
            <a className="btn ghost" href={generalWhatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
        </div>
        <iframe
          title="Mapa da Vitinho Barber"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={googleMapsEmbedUrl}
        />
      </section>

      <footer>
        <Brand />
        <p>Barbearia no bairro Santos Dumont,<br />em São Leopoldo.</p>
        <div>
          <a href={generalWhatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
          <a href={instagramUrl} target="_blank" rel="noreferrer">Instagram</a>
          <Link href="/privacidade">Privacidade</Link>
        </div>
        <div className="developerCredit">
          <span>PROJETO E DESENVOLVIMENTO</span>
          <b>KAIRUS COMERCIAL</b>
        </div>
        <small>© {new Date().getFullYear()} Vitinho Barber · Todos os direitos reservados.</small>
      </footer>

      <a
        className="floatingWa"
        href={generalWhatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Abrir WhatsApp"
      >
        <MessageCircle />
      </a>
      <a className="mobileBook" href="#agendar"><CalendarDays /> Escolher meu horário</a>
    </main>
  );
}
