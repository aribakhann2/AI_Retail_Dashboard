import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from './ui/card';


// Type definition for a single weekly sales record
interface WeeklySalesData {
  year: number;
  week_number: number;
  total_sales_amount: string;
}

// Props for the SalesChart component
interface SalesChartProps {
  weeklySalesLast4Weeks?: WeeklySalesData[]; // optional for safety
}

export function SalesChart({ weeklySalesLast4Weeks = [] }: SalesChartProps) {
  // Safely transform backend data
  const transformedData = weeklySalesLast4Weeks.map((entry, index) => ({
    week: `Week ${index + 1}`,
    sales: parseFloat(entry?.total_sales_amount ?? '0'),
  }));

  const hasData = transformedData.length > 0;

  return (
    <Card className='h-full'>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Weekly Sales (Last 4 Weeks)</CardTitle>
        <p className='min-[321px]:hidden '>Use bigger screens to see sales chart</p>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] sm:h-[300px] md:h-[300px] hidden min-[321px]:block">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={transformedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week tick={{ fontSize: 10 }} " />
                <YAxis
  domain={([min, max]) => {
    const padding = (max - min) * 0.2;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }}
  tickCount={6}
  tick={(props) => {
    const { x, y, payload } = props;
    const isMobile = window.innerWidth < 640;

    return (
      <text
        x={x}
        y={y}
        dx={-10}
        dy={5}
        fontSize={isMobile ? 10 : 12}
        transform={isMobile ? `rotate(-45, ${x}, ${y})` : undefined}
        textAnchor="end"
        fill="#888"
      >
        {Math.round(payload.value)}
      </text>
    );
  }}
/>




                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#38bdf8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-muted-foreground mt-20">
              No sales data available for the last 4 weeks.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
