"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useMemo } from "react";

interface PriceDistributionChartProps {
  prices: number[];
  min: number;
  max: number;
  avg: number;
}

// Generate normal distribution curve data points
function generateDistributionData(
  prices: number[],
  min: number,
  max: number,
  bins: number = 30
): { price: number; density: number; count: number }[] {
  if (prices.length === 0) return [];

  const range = max - min;
  const binWidth = range / bins;

  // Create histogram bins
  const histogram = new Array(bins).fill(0);
  prices.forEach((price) => {
    const binIndex = Math.min(
      Math.floor((price - min) / binWidth),
      bins - 1
    );
    histogram[binIndex]++;
  });

  // Find max count for normalization
  const maxCount = Math.max(...histogram);

  // Generate smooth curve data with gaussian smoothing
  const data: { price: number; density: number; count: number }[] = [];

  for (let i = 0; i < bins; i++) {
    const price = min + (i + 0.5) * binWidth;

    // Apply gaussian smoothing
    let smoothedCount = 0;
    let weightSum = 0;
    for (let j = 0; j < bins; j++) {
      const distance = Math.abs(i - j);
      const weight = Math.exp(-distance * distance / 8); // Gaussian kernel
      smoothedCount += histogram[j] * weight;
      weightSum += weight;
    }
    smoothedCount /= weightSum;

    data.push({
      price,
      density: maxCount > 0 ? (smoothedCount / maxCount) * 100 : 0,
      count: histogram[i],
    });
  }

  return data;
}

function formatCompactCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
}

export default function PriceDistributionChart({
  prices,
  min,
  max,
  avg,
}: PriceDistributionChartProps) {
  const data = useMemo(
    () => generateDistributionData(prices, min, max),
    [prices, min, max]
  );

  if (data.length === 0) return null;

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 8, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5A9A6B" stopOpacity={0.8} />
              <stop offset="50%" stopColor="#3B7A57" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#6B7280" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="priceGradientFill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5A9A6B" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#3B7A57" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#6B7280" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="price"
            type="number"
            domain={[min, max]}
            tickFormatter={formatCompactCurrency}
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            axisLine={{ stroke: "#E5E7EB" }}
            tickLine={{ stroke: "#E5E7EB" }}
            ticks={[min, avg, max]}
          />

          <YAxis hide domain={[0, 110]} />

          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-[#E5E7EB] text-xs">
                    <p className="font-medium text-[#17270C]">
                      {formatCompactCurrency(data.price)}
                    </p>
                    <p className="text-[#6B7280]">
                      {data.count} provider{data.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />

          {/* Average reference line */}
          <ReferenceLine
            x={avg}
            stroke="#17270C"
            strokeWidth={2}
            strokeDasharray="4 3"
            label={{
              value: "Avg",
              position: "top",
              fill: "#17270C",
              fontSize: 10,
              fontWeight: 500,
            }}
          />

          <Area
            type="monotone"
            dataKey="density"
            stroke="url(#priceGradient)"
            strokeWidth={2}
            fill="url(#priceGradientFill)"
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
