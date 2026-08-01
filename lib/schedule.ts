export type ScheduleRange = {start_datetime: string; end_datetime: string};

export const fallbackHours = (weekday: number) => weekday === 0
  ? null
  : weekday === 1
    ? {start: '14:00', end: '20:00'}
    : {start: '09:00', end: '20:00'};

export const clockMinutes = (value: string) => {
  const [hour, minute] = value.slice(0, 5).split(':').map(Number);
  return hour * 60 + minute;
};

export const clockLabel = (value: number) => (
  `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
);

export const brazilDateTime = (date: string, time: string) => (
  new Date(`${date}T${time}:00-03:00`)
);

export const rangesOverlap = (
  start: Date,
  end: Date,
  ranges: ScheduleRange[],
) => ranges.some((range) => (
  start < new Date(range.end_datetime) && end > new Date(range.start_datetime)
));
