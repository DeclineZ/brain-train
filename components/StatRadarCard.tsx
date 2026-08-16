"use client";

import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface StatRadarCardProps {
    data: {
        subject: string;
        A: number;
        fullMark: number;
    }[] | null;
}

// Custom tick renderer for Radar Chart to handle Thai multi-line labels and prevent edge clipping
function CustomPolarAngleTick(props: any) {
    const { x, y, cx, cy, payload } = props;
    const value: string = payload.value;

    // Determine horizontal alignment based on position relative to center
    const isLeft = x < cx - 15;
    const isRight = x > cx + 15;

    let textAnchor: "start" | "end" | "middle" = "middle";
    if (isLeft) textAnchor = "end";
    else if (isRight) textAnchor = "start";

    // Split long Thai text nicely to prevent wide overflow
    let lines = [value];
    if (value === "ภาษาและการนึกคำ") {
        lines = ["ภาษาและ", "การนึกคำ"];
    } else if (value.length > 10 && value.includes("และ")) {
        const parts = value.split("และ");
        lines = [parts[0] + "และ", parts.slice(1).join("และ")];
    }

    return (
        <text
            x={x}
            y={y}
            textAnchor={textAnchor}
            fill="var(--color-brown-800)"
            fontSize={13.5}
            fontWeight="bold"
            className="select-none font-sans"
        >
            {lines.map((line, idx) => (
                <tspan
                    key={idx}
                    x={x}
                    dy={idx === 0 ? (lines.length > 1 ? -6 : 4) : 16}
                >
                    {line}
                </tspan>
            ))}
        </text>
    );
}

export default function StatRadarCard({ data }: StatRadarCardProps) {
    const defaultData = useMemo(() => [
        { subject: 'การวางแผน', A: 0, fullMark: 100 },
        { subject: 'ความเร็ว', A: 0, fullMark: 100 },
        { subject: 'ความจำ', A: 0, fullMark: 100 },
        { subject: 'สมาธิ', A: 0, fullMark: 100 },
        { subject: 'การมองเห็น', A: 0, fullMark: 100 },
        { subject: 'ภาษาและการนึกคำ', A: 0, fullMark: 100 },
    ], []);

    const chartData = data && data.length > 0 ? data : defaultData;

    // Check if there are any non-zero stats
    const hasData = chartData.some(d => d.A > 0);

    return (
        <div className="relative flex flex-col flex-1 h-full min-h-[360px] w-full">
            {/* Brown Backboard / Frame */}
            <div className="bg-brown-light rounded-3xl pb-2 pt-1 px-1 shadow-[0_8px_0_var(--shadow-card-color)] relative z-0 w-full flex-1 flex flex-col mx-auto">
                {/* Inner Clean Board */}
                <div className="bg-cream rounded-[20px] p-5 relative z-10 flex-1 flex flex-col justify-between">

                    {/* Header Section */}
                    <div className="mb-1 pb-3 border-b-2 border-line border-gray-medium shrink-0">
                        <h2 className="text-xl font-bold text-brown-800 flex items-center gap-2">
                            ทักษะสมองวันนี้
                        </h2>
                        <p className="text-sm text-brown-light mt-0.5">
                            สถิติที่ได้จากการเล่นเกมในวันนี้
                        </p>
                    </div>

                    {/* Chart Area */}
                    <div className="relative flex-1 min-h-[260px] w-full flex items-center justify-center">
                        {!hasData && (
                            <div className="absolute inset-0 flex items-center justify-center z-20 bg-cream/70 rounded-xl">
                                <p className="text-brown-light font-medium text-center px-4">
                                    ยังไม่มีข้อมูลสถิติของวันนี้<br />
                                    <span className="text-sm">เล่นเกมเพื่อฝึกทักษะสมองกันเถอะ</span>
                                </p>
                            </div>
                        )}
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart
                                cx="50%"
                                cy="50%"
                                outerRadius="62%"
                                data={chartData}
                                margin={{ top: 18, right: 38, bottom: 18, left: 38 }}
                            >
                                <PolarGrid stroke="var(--color-gray-medium)" strokeDasharray="3 3" />
                                <PolarAngleAxis
                                    dataKey="subject"
                                    tick={(props) => <CustomPolarAngleTick {...props} />}
                                />
                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                <Radar
                                    name="สถิติ"
                                    dataKey="A"
                                    stroke="var(--color-orange-action)"
                                    fill="var(--color-yellow-highlight)"
                                    fillOpacity={0.6}
                                    strokeWidth={3}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
