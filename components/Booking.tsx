'use client';

import {useEffect, useMemo, useState} from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  LoaderCircle,
  MessageCircle,
  X,
} from 'lucide-react';
import {address, barbers, bookableServices, services, whatsapp} from '@/lib/data';
import {whatsappLink} from '@/lib/site';

type Slot = {
  time: string;
  available: boolean;
  reason?: string;
};

const todayInBrazil = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const bookingDays = () => Array.from({length: 21}, (_, index) => {
  const base = new Date(`${todayInBrazil()}T12:00:00-03:00`);
  base.setDate(base.getDate() + index);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(base);
}).filter((day) => new Date(`${day}T12:00:00-03:00`).getDay() !== 0).slice(0, 14);

const shortDate = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
}).format(new Date(`${value}T12:00:00-03:00`)).replace('.', '');

const longDate = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  weekday: 'long',
  day: '2-digit',
  month: 'long',
}).format(new Date(`${value}T12:00:00-03:00`));

const money = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
const consultationUrl = whatsappLink(
  whatsapp,
  'Olá! Vim pelo site e gostaria de consultar um horário para pigmentação, luzes ou platinado.',
);

const phoneDigits = (value: string) => value.replace(/\D/g, '').slice(0, 11);

const formatPhone = (value: string) => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (!digits) return '';
  if (digits.length < 3) return `(${digits}`;

  const area = digits.slice(0, 2);
  const local = digits.slice(2);
  const firstBlockSize = local.length > 8 ? 5 : 4;
  const first = local.slice(0, firstBlockSize);
  const second = local.slice(firstBlockSize);
  return `(${area}) ${first}${second ? `-${second}` : ''}`;
};

export default function Booking() {
  const days = useMemo(bookingDays, []);
  const [step, setStep] = useState(1);
  const [service, setService] = useState('');
  const [barber, setBarber] = useState(barbers[0].name);
  const [date, setDate] = useState(() => bookingDays()[0] || todayInBrazil());
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [availabilityRefresh, setAvailabilityRefresh] = useState(0);

  const item = useMemo(() => services.find((entry) => entry.id === service), [service]);
  const cleanName = name.trim();
  const cleanPhone = phoneDigits(phone);
  const validName = cleanName.length >= 3;
  const validPhone = cleanPhone.length === 10 || cleanPhone.length === 11;

  useEffect(() => {
    if (step !== 3 || !service) return;

    const controller = new AbortController();
    setSlotsLoading(true);
    setAvailabilityError('');
    setSlots([]);
    setTime('');

    fetch(`/api/availability?date=${date}&barber=${encodeURIComponent(barber)}&service=${service}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Não foi possível consultar a agenda.');
        setSlots(data.slots || []);
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') {
          setAvailabilityError('A agenda não respondeu agora. Tente novamente em alguns segundos.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSlotsLoading(false);
      });

    return () => controller.abort();
  }, [step, service, barber, date, availabilityRefresh]);

  const next = () => {
    setSubmitError('');
    setStep((current) => Math.min(4, current + 1));
  };

  const back = () => {
    setSubmitError('');
    setStep((current) => Math.max(1, current - 1));
  };

  async function confirm() {
    setNameTouched(true);
    setPhoneTouched(true);
    setSubmitError('');

    if (!item || !time || !validName || !validPhone) {
      setSubmitError('Confira os dados destacados antes de confirmar.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          serviceId: service,
          barberName: barber,
          date,
          time,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 409) {
          setStep(3);
          setTime('');
          setAvailabilityRefresh((value) => value + 1);
        }
        throw new Error(data.error || 'Não foi possível reservar este horário.');
      }

      setDone(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    const text = encodeURIComponent(
      `Olá, agendei um horário pelo site da Vitinho Barber.\n\nNome: ${cleanName}\nServiço: ${item?.name}\nProfissional: ${barber}\nData: ${longDate(date)}\nHorário: ${time}\n\nGostaria de confirmar meu agendamento.`,
    );
    return (
      <div className="bookingCard success" role="status">
        <div className="successIcon"><Check /></div>
        <small>AGUARDANDO CONFIRMAÇÃO</small>
        <h3>Pedido recebido!</h3>
        <p>{item?.name} com {barber}<br /><b>{longDate(date)}, às {time}</b></p>
        <p className="successNote">
          Seu horário entrou na agenda. Envie a mensagem pronta para a equipe confirmar
          o atendimento com você.
        </p>
        <small>{address}</small>
        <a className="btn gold" target="_blank" rel="noreferrer" href={`https://wa.me/${whatsapp}?text=${text}`}>
          Confirmar pelo WhatsApp
        </a>
      </div>
    );
  }

  const stepLabels = ['Serviço', 'Barbeiro', 'Horário', 'Dados'];

  return (
    <form className="bookingCard" noValidate onSubmit={(event) => {
      event.preventDefault();
      if (step === 4) confirm();
    }}>
      <div className="bookingHeader">
        <div><small>RESERVA RÁPIDA</small><b>{item?.name || 'Monte seu atendimento'}</b></div>
        <span aria-label={`Etapa ${step} de 4`}>{step}/4</span>
      </div>

      <div className="progress bookingProgress" aria-label="Progresso do agendamento">
        {stepLabels.map((label, index) => (
          <div className={step >= index + 1 ? 'active' : ''} aria-current={step === index + 1 ? 'step' : undefined} key={label}>
            <span>{step > index + 1 ? <Check /> : index + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <h3>Escolha o serviço</h3>
          <div className="choices" aria-label="Serviços disponíveis">
            {bookableServices.map((entry) => (
              <button
                type="button"
                aria-pressed={service === entry.id}
                className={service === entry.id ? 'selected' : ''}
                onClick={() => setService(entry.id)}
                key={entry.id}
              >
                <span><b>{entry.name}</b><small>{entry.duration ? `${entry.duration} min` : 'Tempo sob consulta'}</small></span>
                <strong>{money(entry.price)}</strong>
              </button>
            ))}
          </div>
          <div className="consultationBox">
            <span>
              <b>Quer pigmentação, luzes ou platinado?</b>
              <small>Esses serviços precisam de avaliação de tempo antes de reservar.</small>
            </span>
            <a href={consultationUrl} target="_blank" rel="noreferrer">
              <MessageCircle /> Consultar
            </a>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3>Escolha o profissional</h3>
          <div className="choices barberChoices" aria-label="Profissionais disponíveis">
            {barbers.map((entry) => (
              <button
                type="button"
                aria-pressed={barber === entry.name}
                className={barber === entry.name ? 'selected' : ''}
                onClick={() => setBarber(entry.name)}
                key={entry.name}
              >
                <span><b>{entry.name}</b><small>{entry.note}</small></span>
                {barber === entry.name && <Check />}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h3>Escolha dia e horário</h3>
          <div className="dateChoices" aria-label="Dias disponíveis">
            {days.map((day) => {
              const [weekday, numericDate] = shortDate(day).split(',');
              return (
                <button
                  type="button"
                  aria-pressed={date === day}
                  className={date === day ? 'selected' : ''}
                  onClick={() => setDate(day)}
                  key={day}
                >
                  <span>{weekday}</span>
                  <b>{numericDate}</b>
                </button>
              );
            })}
          </div>
          <p className="todayLabel">{longDate(date)} · {barber}</p>

          {slotsLoading ? (
            <div className="slotLoading" role="status"><LoaderCircle /> Consultando agenda...</div>
          ) : availabilityError ? (
            <div className="availabilityError" role="alert">
              <span>{availabilityError}</span>
              <button type="button" onClick={() => setAvailabilityRefresh((value) => value + 1)}>Tentar novamente</button>
            </div>
          ) : slots.length ? (
            <div className="times" aria-label="Horários disponíveis">
              {slots.map((slot) => (
                <button
                  type="button"
                  disabled={!slot.available}
                  aria-pressed={time === slot.time}
                  aria-label={`${slot.time}${slot.available ? ' disponível' : ' indisponível'}`}
                  className={`${time === slot.time ? 'selected' : ''} ${!slot.available ? 'occupied' : ''}`}
                  onClick={() => setTime(slot.time)}
                  key={slot.time}
                >
                  {slot.available ? <Clock3 /> : <X />}
                  <span>{slot.time}</span>
                  {!slot.available && <small>{slot.reason === 'ocupado' ? 'OCUPADO' : 'INDISPONÍVEL'}</small>}
                </button>
              ))}
            </div>
          ) : (
            <p className="noSlots">Não há horários disponíveis nesta data. Escolha outro dia ou fale com a gente pelo WhatsApp.</p>
          )}
        </div>
      )}

      {step === 4 && (
        <div>
          <h3>Confirme seus dados</h3>
          <label>
            Nome completo
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => setNameTouched(true)}
              placeholder="Seu nome"
              autoComplete="name"
              aria-describedby="name-hint"
              aria-invalid={nameTouched && !validName}
            />
          </label>
          <small className="fieldHint" id="name-hint">{nameTouched && !validName ? 'Informe seu nome completo.' : ''}</small>
          <label>
            WhatsApp
            <input
              value={phone}
              onChange={(event) => setPhone(formatPhone(event.target.value))}
              onBlur={() => setPhoneTouched(true)}
              placeholder="(51) 99999-9999"
              inputMode="tel"
              autoComplete="tel"
              aria-describedby="phone-hint"
              aria-invalid={phoneTouched && !validPhone}
            />
          </label>
          <small className="fieldHint" id="phone-hint">{phoneTouched && !validPhone ? 'Informe um telefone com DDD.' : ''}</small>
          <div className="summary">
            <span>{item?.name}</span>
            <b>{item ? money(item.price) : ''}</b>
            <small>{barber} · {longDate(date)} às {time}</small>
          </div>
        </div>
      )}

      {submitError && <div className="bookingError" role="alert"><AlertCircle /> <span>{submitError}</span></div>}

      <div className="bookNav">
        {step > 1 && <button type="button" className="back" onClick={back}><ArrowLeft /> Voltar</button>}
        {step < 4 ? (
          <button
            type="button"
            className="btn gold"
            disabled={(step === 1 && !service) || (step === 3 && !time)}
            onClick={next}
          >
            Continuar <ArrowRight />
          </button>
        ) : (
          <button className="btn gold" disabled={loading || !validName || !validPhone}>
            {loading ? 'Salvando...' : 'Confirmar agendamento'} <Check />
          </button>
        )}
      </div>
    </form>
  );
}
