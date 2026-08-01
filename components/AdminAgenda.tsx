'use client';

import {useCallback, useMemo, useState, useEffect} from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Ban,
  CalendarPlus,
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
  UserX,
  X,
} from 'lucide-react';
import Brand from '@/components/Brand';
import {barbers as barberOptions, bookableServices} from '@/lib/data';

type Appointment = {
  id: string;
  start_datetime: string;
  price: number;
  status: string;
  customers: {name: string; phone: string} | null;
  barbers: {name: string} | null;
  services: {name: string; duration_minutes: number | null} | null;
};

type BlockedTime = {
  id: string;
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
  barbers: {name: string} | null;
};

type AdminDialog = 'appointment' | 'block' | null;

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
const openingTime = (value: string) => (
  new Date(`${value}T12:00:00-03:00`).getDay() === 1 ? '14:00' : '09:00'
);
const longDate = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
}).format(new Date(`${value}T12:00:00-03:00`));
const clockTime = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
}).format(new Date(value));
const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  const local = digits.slice(2);
  const split = local.length > 8 ? 5 : 4;
  return `(${digits.slice(0, 2)}) ${local.slice(0, split)}${local.length > split ? `-${local.slice(split)}` : ''}`;
};

export default function AdminAgenda() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<BlockedTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todos');
  const [selectedDate, setSelectedDate] = useState(todayInBrazil);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [dialog, setDialog] = useState<AdminDialog>(null);
  const [saving, setSaving] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    name: '',
    phone: '',
    serviceId: bookableServices[0]?.id || '',
    barberName: barberOptions[0]?.name || '',
    date: todayInBrazil(),
    time: '09:00',
  });
  const [blockForm, setBlockForm] = useState({
    barberName: barberOptions[0]?.name || '',
    date: todayInBrazil(),
    fullDay: false,
    startTime: '12:00',
    endTime: '13:00',
    reason: '',
  });
  const appointmentDuration = bookableServices.find(
    (service) => service.id === appointmentForm.serviceId,
  )?.duration || 60;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [appointmentsResponse, blocksResponse] = await Promise.all([
        fetch(`/api/admin/appointments?date=${encodeURIComponent(selectedDate)}`, {cache: 'no-store'}),
        fetch(`/api/admin/blocks?date=${encodeURIComponent(selectedDate)}`, {cache: 'no-store'}),
      ]);
      const appointmentsData = await appointmentsResponse.json().catch(() => ({}));
      const blocksData = await blocksResponse.json().catch(() => ({}));
      if (!appointmentsResponse.ok) {
        throw new Error(appointmentsData.error || 'Não foi possível carregar a agenda.');
      }
      setItems(appointmentsData.appointments || []);
      setBlocks(blocksResponse.ok ? blocksData.blocks || [] : []);
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

  useEffect(() => {
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialog(null);
    };
    document.body.style.overflow = 'hidden';
    addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      removeEventListener('keydown', closeOnEscape);
    };
  }, [dialog]);

  const barberFilters = ['Todos', ...barberOptions.map((barber) => barber.name)];
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
    if (value === 'cancelado' && !window.confirm('Cancelar este agendamento e liberar o horário?')) {
      return;
    }
    setUpdatingId(id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/appointments', {
        method: 'PATCH',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({id, status: value}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar.');
      await load();
      setNotice('Status do agendamento atualizado.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Falha ao atualizar.');
    } finally {
      setUpdatingId('');
    }
  }

  function openAppointmentDialog() {
    setError('');
    setNotice('');
    setAppointmentForm((current) => ({
      ...current,
      date: selectedDate,
      time: openingTime(selectedDate),
    }));
    setDialog('appointment');
  }

  function closeDialog() {
    setDialog(null);
    requestAnimationFrame(() => window.scrollTo({left: 0, behavior: 'auto'}));
  }

  function openBlockDialog() {
    setError('');
    setNotice('');
    setBlockForm((current) => ({...current, date: selectedDate}));
    setDialog('block');
  }

  async function createAppointment(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/appointments', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(appointmentForm),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível criar o agendamento.');
      closeDialog();
      setSelectedDate(appointmentForm.date);
      setAppointmentForm((current) => ({...current, name: '', phone: ''}));
      await load();
      setNotice('Agendamento criado e horário reservado.');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Falha ao criar agendamento.');
    } finally {
      setSaving(false);
    }
  }

  async function createBlock(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/blocks', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(blockForm),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível bloquear o período.');
      closeDialog();
      setSelectedDate(blockForm.date);
      await load();
      setNotice('Período bloqueado na agenda.');
    } catch (blockError) {
      setError(blockError instanceof Error ? blockError.message : 'Falha ao bloquear o período.');
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(id: string) {
    if (!window.confirm('Remover este bloqueio e liberar o horário?')) return;
    setUpdatingId(id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/blocks', {
        method: 'DELETE',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({id}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível remover o bloqueio.');
      await load();
      setNotice('Bloqueio removido e horário liberado.');
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Falha ao remover bloqueio.');
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
          <div className="agendaTopActions">
            <button className="primary" onClick={openAppointmentDialog}>
              <CalendarPlus />Novo agendamento
            </button>
            <button onClick={openBlockDialog}><Ban />Bloquear horário</button>
            <button onClick={load} disabled={loading} aria-label="Atualizar agenda">
              <RefreshCw className={loading ? 'spin' : ''} />Atualizar
            </button>
          </div>
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
        {notice && <div className="adminNotice" role="status"><Check />{notice}</div>}

        {blocks.length > 0 && (
          <div className="blockedPanel">
            <div>
              <small>INDISPONIBILIDADES</small>
              <b>Períodos bloqueados</b>
            </div>
            <div className="blockedList">
              {blocks.map((block) => {
                const duration = new Date(block.end_datetime).getTime() - new Date(block.start_datetime).getTime();
                return (
                  <article key={block.id}>
                    <Ban />
                    <span>
                      <b>{block.barbers?.name}</b>
                      <small>
                        {duration >= 23 * 60 * 60_000
                          ? 'Dia inteiro'
                          : `${clockTime(block.start_datetime)}–${clockTime(block.end_datetime)}`}
                        {block.reason ? ` · ${block.reason}` : ''}
                      </small>
                    </span>
                    <button
                      type="button"
                      disabled={updatingId === block.id}
                      onClick={() => removeBlock(block.id)}
                      aria-label={`Remover bloqueio de ${block.barbers?.name || 'profissional'}`}
                    >
                      <X />
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        )}

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
            {barberFilters.map((barber) => (
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
                  type="button"
                  title="Confirmar"
                  disabled={updatingId === appointment.id}
                  onClick={() => updateStatus(appointment.id, 'confirmado')}
                >
                  <Check />
                </button>
                <button
                  type="button"
                  title="Concluir"
                  disabled={updatingId === appointment.id}
                  onClick={() => updateStatus(appointment.id, 'concluído')}
                >
                  <Scissors />
                </button>
                <button
                  type="button"
                  title="Não compareceu"
                  disabled={updatingId === appointment.id}
                  onClick={() => updateStatus(appointment.id, 'não compareceu')}
                >
                  <UserX />
                </button>
                <button
                  type="button"
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

      {dialog === 'appointment' && (
        <div className="adminDialogBackdrop" role="presentation">
          <div className="adminDialog" role="dialog" aria-modal="true" aria-labelledby="appointment-dialog-title">
            <button className="dialogClose" type="button" onClick={closeDialog} aria-label="Fechar">
              <X />
            </button>
            <small>NOVO ATENDIMENTO</small>
            <h2 id="appointment-dialog-title">Adicionar à agenda</h2>
            <p>Use para clientes que marcaram pessoalmente ou pelo WhatsApp.</p>
            {error && <div className="adminError" role="alert"><AlertCircle />{error}</div>}
            <form onSubmit={createAppointment}>
              <div className="adminFormGrid">
                <label className="wide">
                  Nome do cliente
                  <input
                    required
                    minLength={3}
                    autoFocus
                    value={appointmentForm.name}
                    onChange={(event) => setAppointmentForm({...appointmentForm, name: event.target.value})}
                    autoComplete="name"
                    placeholder="Nome completo"
                  />
                </label>
                <label className="wide">
                  WhatsApp
                  <input
                    required
                    value={appointmentForm.phone}
                    onChange={(event) => setAppointmentForm({...appointmentForm, phone: formatPhone(event.target.value)})}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(51) 99999-9999"
                  />
                </label>
                <label>
                  Serviço
                  <select
                    value={appointmentForm.serviceId}
                    onChange={(event) => setAppointmentForm({...appointmentForm, serviceId: event.target.value})}
                  >
                    {bookableServices.map((service) => (
                      <option value={service.id} key={service.id}>{service.name} · {money(service.price)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Profissional
                  <select
                    value={appointmentForm.barberName}
                    onChange={(event) => setAppointmentForm({...appointmentForm, barberName: event.target.value})}
                  >
                    {barberOptions.map((barber) => (
                      <option value={barber.name} key={barber.name}>{barber.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Data
                  <input
                    required
                    type="date"
                    min={todayInBrazil()}
                    value={appointmentForm.date}
                    onChange={(event) => setAppointmentForm({
                      ...appointmentForm,
                      date: event.target.value,
                      time: openingTime(event.target.value),
                    })}
                  />
                </label>
                <label>
                  Horário
                  <input
                    required
                    type="time"
                    step={appointmentDuration <= 30 ? 1800 : 3600}
                    value={appointmentForm.time}
                    onChange={(event) => setAppointmentForm({...appointmentForm, time: event.target.value})}
                  />
                </label>
              </div>
              <div className="dialogActions">
                <button type="button" onClick={closeDialog}>Cancelar</button>
                <button className="primary" disabled={saving}>{saving ? 'Salvando...' : 'Criar agendamento'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dialog === 'block' && (
        <div className="adminDialogBackdrop" role="presentation">
          <div className="adminDialog" role="dialog" aria-modal="true" aria-labelledby="block-dialog-title">
            <button className="dialogClose" type="button" onClick={closeDialog} aria-label="Fechar">
              <X />
            </button>
            <small>INDISPONIBILIDADE</small>
            <h2 id="block-dialog-title">Bloquear agenda</h2>
            <p>O período deixa de aparecer como disponível para novos clientes.</p>
            {error && <div className="adminError" role="alert"><AlertCircle />{error}</div>}
            <form onSubmit={createBlock}>
              <div className="adminFormGrid">
                <label>
                  Profissional
                  <select
                    autoFocus
                    value={blockForm.barberName}
                    onChange={(event) => setBlockForm({...blockForm, barberName: event.target.value})}
                  >
                    {barberOptions.map((barber) => (
                      <option value={barber.name} key={barber.name}>{barber.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Data
                  <input
                    required
                    type="date"
                    min={todayInBrazil()}
                    value={blockForm.date}
                    onChange={(event) => setBlockForm({...blockForm, date: event.target.value})}
                  />
                </label>
                <label className="wide checkLabel">
                  <input
                    type="checkbox"
                    checked={blockForm.fullDay}
                    onChange={(event) => setBlockForm({...blockForm, fullDay: event.target.checked})}
                  />
                  Bloquear o dia inteiro
                </label>
                {!blockForm.fullDay && (
                  <>
                    <label>
                      Início
                      <input
                        required
                        type="time"
                        step="1800"
                        value={blockForm.startTime}
                        onChange={(event) => setBlockForm({...blockForm, startTime: event.target.value})}
                      />
                    </label>
                    <label>
                      Fim
                      <input
                        required
                        type="time"
                        step="1800"
                        value={blockForm.endTime}
                        onChange={(event) => setBlockForm({...blockForm, endTime: event.target.value})}
                      />
                    </label>
                  </>
                )}
                <label className="wide">
                  Motivo (opcional)
                  <input
                    maxLength={120}
                    value={blockForm.reason}
                    onChange={(event) => setBlockForm({...blockForm, reason: event.target.value})}
                    placeholder="Ex.: almoço, compromisso ou folga"
                  />
                </label>
              </div>
              <div className="dialogActions">
                <button type="button" onClick={closeDialog}>Cancelar</button>
                <button className="primary" disabled={saving}>{saving ? 'Salvando...' : 'Bloquear período'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
