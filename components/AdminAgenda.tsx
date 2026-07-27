'use client';

import {useCallback, useMemo, useState, useEffect} from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LogOut,
  MessageCircle,
  RefreshCw,
  Scissors,
  UserRound,
  X,
} from 'lucide-react';
import Brand from '@/components/Brand';

type Appointment = {
  id: string;
  start_datetime: string;
  price: number;
  status: string;
  customers: {name: string; phone: string} | null;
  barbers: {name: string} | null;
  services: {name: string; duration_minutes: number | null} | null;
};

const money = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
const whatsappNumber = (value = '') => {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
};
const todayInBrazil = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const moveDate = (value: string, amount: number) => {
  const date = new Date(`${value}T12:00:00-03:00`);
  date.setDate(date.getDate() + amount);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};
const longDate = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
}).format(new Date(`${value}T12:00:00-03:00`));

export default function AdminAgenda() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todos');
  const [selectedDate, setSelectedDate] = useState(todayInBrazil);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/admin/appointments?date=${encodeURIComponent(selectedDate)}`,
        {cache: 'no-store'},
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar a agenda.');
      setItems(data.appointments || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar a agenda.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const barbers = ['Todos', 'Vitinho OFC', 'Pablo'];
  const shown = filter === 'Todos'
    ? items
    : items.filter((appointment) => appointment.barbers?.name === filter);
  const confirmed = items.filter((appointment) => appointment.status === 'confirmado').length;
  const done = items.filter((appointment) => appointment.status === 'concluído');
  const revenue = done.reduce((total, appointment) => total + Number(appointment.price), 0);
  const expected = items
    .filter((appointment) => !['cancelado', 'não compareceu'].includes(appointment.status))
    .reduce((total, appointment) => total + Number(appointment.price), 0);
  const cancelled = items.filter((appointment) => appointment.status === 'cancelado').length;

  const barberStats = useMemo(() => (
    Array.from(new Set(items.map((appointment) => appointment.barbers?.name).filter(Boolean) as string[]))
      .map((name) => {
        const list = items.filter((appointment) => appointment.barbers?.name === name);
        const completed = list.filter((appointment) => appointment.status === 'concluído');
        return {
          name,
          count: list.length,
          completed: completed.length,
          total: completed.reduce((sum, appointment) => sum + Number(appointment.price), 0),
        };
      })
  ), [items]);

  const serviceStats = useMemo(() => (
    Array.from(new Set(items.map((appointment) => appointment.services?.name).filter(Boolean) as string[]))
      .map((name) => ({
        name,
        count: items.filter((appointment) => (
          appointment.services?.name === name
          && !['cancelado', 'não compareceu'].includes(appointment.status)
        )).length,
      }))
      .sort((left, right) => right.count - left.count)
  ), [items]);

  async function updateStatus(id: string, value: string) {
    setUpdatingId(id);
    setError('');
    try {
      const response = await fetch('/api/admin/appointments', {
        method: 'PATCH',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({id, status: value}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar.');
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Falha ao atualizar.');
    } finally {
      setUpdatingId('');
    }
  }

  async function logout() {
    await fetch('/api/logout', {method: 'POST'});
    location.href = '/login';
  }

  return (
    <main className="agendaAdmin">
      <aside>
        <Brand href="/" label="GESTÃO" />
        <nav>
          <span className="active"><CalendarDays />Agenda</span>
          <Link href="/"><Scissors />Ver site</Link>
        </nav>
        <button onClick={logout}><LogOut />Sair</button>
      </aside>

      <section>
        <header className="agendaTop">
          <div>
            <small>PAINEL ADMINISTRATIVO</small>
            <h1>Agenda da barbearia</h1>
            <p>{longDate(selectedDate)}</p>
          </div>
          <button onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'spin' : ''} />Atualizar
          </button>
        </header>

        <div className="agendaDatePicker">
          <button aria-label="Dia anterior" onClick={() => setSelectedDate(moveDate(selectedDate, -1))}>
            <ChevronLeft />
          </button>
          <label>
            Consultar data
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
          <button aria-label="Próximo dia" onClick={() => setSelectedDate(moveDate(selectedDate, 1))}>
            <ChevronRight />
          </button>
          {selectedDate !== todayInBrazil() && (
            <button className="todayButton" onClick={() => setSelectedDate(todayInBrazil())}>Hoje</button>
          )}
        </div>

        {error && <div className="adminError" role="alert"><AlertCircle />{error}</div>}

        <div className="agendaMetrics">
          <article><Clock3 /><span><small>Agendamentos</small><b>{items.length}</b></span></article>
          <article><Check /><span><small>Confirmados</small><b>{confirmed}</b></span></article>
          <article><span><small>Previsto no dia</small><b>{money(expected)}</b></span></article>
          <article className="revenueCard"><span><small>Faturado no dia</small><b>{money(revenue)}</b></span></article>
        </div>

        <div className="financeGrid">
          <article>
            <div className="financeTitle">
              <span><small>RESUMO DO DIA</small><h2>Resultado financeiro</h2></span>
              <b>{selectedDate.split('-').reverse().join('/')}</b>
            </div>
            <div className="financeRows">
              <p><span>Valor previsto</span><b>{money(expected)}</b></p>
              <p><span>Valor já faturado</span><b className="positive">{money(revenue)}</b></p>
              <p><span>Falta receber</span><b>{money(Math.max(expected - revenue, 0))}</b></p>
              <p><span>Cancelamentos</span><b className="negative">{cancelled}</b></p>
            </div>
          </article>
          <article>
            <div className="financeTitle"><span><small>EQUIPE</small><h2>Por barbeiro</h2></span></div>
            <div className="barberStats">
              {barberStats.length ? barberStats.map((barber) => (
                <div key={barber.name}>
                  <span><b>{barber.name}</b><small>{barber.completed}/{barber.count} concluídos</small></span>
                  <strong>{money(barber.total)}</strong>
                </div>
              )) : <p className="muted">Sem movimentação nesta data.</p>}
            </div>
          </article>
          <article>
            <div className="financeTitle"><span><small>SERVIÇOS</small><h2>Mais pedidos</h2></span></div>
            <div className="serviceStats">
              {serviceStats.length ? serviceStats.slice(0, 5).map((service, index) => (
                <div key={service.name}><b>0{index + 1}</b><span>{service.name}</span><strong>{service.count}</strong></div>
              )) : <p className="muted">Nenhum serviço agendado.</p>}
            </div>
          </article>
        </div>

        <div className="agendaToolbar">
          <b>Horários</b>
          <div>
            {barbers.map((barber) => (
              <button
                className={filter === barber ? 'active' : ''}
                onClick={() => setFilter(barber)}
                key={barber}
              >
                {barber}
              </button>
            ))}
          </div>
        </div>

        <div className="agendaList">
          {loading && !items.length ? (
            <div className="agendaEmpty"><RefreshCw className="spin" />Carregando agenda...</div>
          ) : !shown.length ? (
            <div className="agendaEmpty">
              <CalendarDays />
              <b>Nenhum horário nesta data</b>
              <p>Use o seletor acima para consultar os próximos dias.</p>
            </div>
          ) : shown.map((appointment) => (
            <article
              key={appointment.id}
              className={`appointment ${appointment.status.replaceAll(' ', '-')}`}
            >
              <time>
                {new Intl.DateTimeFormat('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Sao_Paulo',
                }).format(new Date(appointment.start_datetime))}
              </time>
              <div className="client">
                <b><UserRound />{appointment.customers?.name}</b>
                <a
                  href={`https://wa.me/${whatsappNumber(appointment.customers?.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle />{appointment.customers?.phone}
                </a>
              </div>
              <div>
                <b>{appointment.services?.name}</b>
                <small>{appointment.barbers?.name} · {appointment.services?.duration_minutes || 60} min</small>
              </div>
              <span className="status">{appointment.status}</span>
              <div className="agendaActions">
                <button
                  title="Confirmar"
                  disabled={updatingId === appointment.id}
                  onClick={() => updateStatus(appointment.id, 'confirmado')}
                >
                  <Check />
                </button>
                <button
                  title="Concluir"
                  disabled={updatingId === appointment.id}
                  onClick={() => updateStatus(appointment.id, 'concluído')}
                >
                  <Scissors />
                </button>
                <button
                  title="Cancelar"
                  className="danger"
                  disabled={updatingId === appointment.id}
                  onClick={() => updateStatus(appointment.id, 'cancelado')}
                >
                  <X />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
