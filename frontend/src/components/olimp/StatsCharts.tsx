import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ChartDatum {
  label: string;
  value: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: { value?: number; payload?: ChartDatum }[];
  formatValue: (value: number) => string;
}

function ChartTooltip({ active, payload, formatValue }: TooltipProps) {
  const item = payload?.[0];
  if (!active || !item?.payload) return null;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip__label">{item.payload.label}</span>
      <strong>{formatValue(item.value ?? 0)}</strong>
    </div>
  );
}

/**
 * Single-series bar chart (one hue, no legend — the title names the series).
 * Values are labelled directly on the bars; a visually hidden table mirrors the data.
 */
export function SolvedBarChart({
  title,
  data,
  formatValue,
  height = 200,
}: {
  title: string;
  data: ChartDatum[];
  /** Tooltip / table text for a value (default: "Solved: N") */
  formatValue?: (value: number) => string;
  height?: number;
}) {
  const { t } = useTranslation();
  const format = formatValue ?? ((count: number) => t('profile.stats.solvedCount', { count }));
  return (
    <figure className="chart">
      <figcaption className="chart__title">{title}</figcaption>
      <div className="chart__plot" aria-hidden="true">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 8, bottom: 0, left: 8 }}
            barCategoryGap="28%"
          >
            <CartesianGrid vertical={false} className="chart__grid" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={0}
              className="chart__axis"
            />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              content={<ChartTooltip formatValue={format} />}
              cursor={{ className: 'chart__cursor' }}
            />
            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              className="chart__bar"
              maxBarSize={48}
              isAnimationActive={false}
            >
              <LabelList dataKey="value" position="top" className="chart__value" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="visually-hidden">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
