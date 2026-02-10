import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 🔥 PENTING: MATIIN CACHE NEXT
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // ambil field minimum
    const videos = await db.video.findMany({
      select: {
        labels: true,
      },
    });

    const labelCounts = new Map<string, number>();

    videos.forEach(v => {
      const labels: string[] = v.labels ? JSON.parse(v.labels) : [];
      labels.forEach(label => {
        labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
      });
    });

    // 🔥 JUMLAH VIDEO = JUMLAH ROW
    const totalVideos = videos.length;

    return NextResponse.json({
      totalVideos,
      labels: Array.from(labelCounts.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to fetch meta' },
      { status: 500 }
    );
  }
}