const SAME_YEAR = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
});

const OTHER_YEAR = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * Short, scannable date for list rows. The year appears only when it isn't the
 * current one, so "12 Aug" doesn't quietly mean a year ago.
 *
 * Formatters are built once — constructing an Intl formatter per row is
 * surprisingly expensive on a long list.
 */
export default function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const formatter =
    date.getFullYear() === new Date().getFullYear() ? SAME_YEAR : OTHER_YEAR;
  return formatter.format(date);
}
