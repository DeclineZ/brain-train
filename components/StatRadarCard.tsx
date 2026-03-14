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

export default function StatRadarCard({ data }: StatRadarCardProps) {
    const defaultData = useMemo(() => [
        { subject: 'การวางแผน', A: 0, fullMark: 100 },
        { subject: 'ความเร็ว', A: 0, fullMark: 100 },
        { subject: 'ความจำ', A: 0, fullMark: 100 },
        { subject: 'สมาธิ', A: 0, fullMark: 100 },
        { subject: 'การมองเห็น', A: 0, fullMark: 100 },
        { subject: 'อารมณ์', A: 0, fullMark: 100 },
    ], []);

    const chartData = data && data.length > 0 ? data : defaultData;

    // Check if there are any non-zero stats
    const hasData = chartData.some(d => d.A > 0);

    return (
        <div className="relative flex flex-col flex-1 h-full min-h-[350px] w-full">
            {/* Brown Backboard / Frame */}
            <div className="bg-brown-light rounded-3xl pb-2 pt-1 px-1 shadow-[0_8px_0_var(--shadow-card-color)] relative z-0 w-full flex-1 flex flex-col mx-auto">
                {/* Inner Clean Board */}
                <div className="bg-cream rounded-[20px] p-5 relative z-10 flex-1 flex flex-col">
                    
                    {/* Header Section */}
                    <div className="mb-2 pb-2 border-b-2 border-line border-gray-medium shrink-0">
                        <h2 className="text-xl font-bold text-brown-800 flex items-center gap-2">
                            พลังสมองวันนี้
                        </h2>
                        <p className="text-sm text-brown-light mt-1 mb-1">
                            สถิติที่ได้จากการเล่นเกมในวันนี้
                        </p>
                    </div>

                    {/* Chart Area */}
                    <div className="relative flex-1 min-h-[250px] w-full mt-2">
                        {!hasData && (
                            <div className="absolute inset-0 flex items-center justify-center z-20 bg-cream/70 rounded-xl">
                                <p className="text-brown-light font-medium text-center px-4">
                                    ยังไม่มีข้อมูลสถิติของวันนี้<br/>
                                    <span className="text-sm">เล่นเกมเพื่อสะสมพลังสมองกันเถอะ!</span>
                                </p>
                            </div>
                        )}
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
                                <PolarGrid stroke="var(--color-gray-medium)" />
                                <PolarAngleAxis 
                                    dataKey="subject" 
                                    tick={{ fill: 'var(--color-brown-800)', fontSize: 13, fontWeight: 'bold' }} 
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
