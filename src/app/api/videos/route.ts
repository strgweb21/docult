import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function verifyPassword(request: NextRequest): Promise<boolean> {
  const password = request.headers.get('authorization');

  if (!ADMIN_PASSWORD) return false;

  return password === ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20'); // default load 20 per request
    const label = searchParams.get('label');
    const s = searchParams.get('s');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (label) {
      where.labels = {
        contains: label,
      };
    }

    if (s) {
      where.title = {
        contains: s,
        mode: 'insensitive',
      };
    }

    const [videos, total, allVideos] = await Promise.all([
      db.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.video.count({ where }),
      db.video.findMany({ orderBy: { createdAt: 'desc' }, take: 10000 }),
    ]);

    // extract all labels (synchronize labels walau video belum muncul)
    const allLabelsSet = new Set<string>();
    allVideos.forEach(v => {
      const lbls: string[] = v.labels ? JSON.parse(v.labels) : [];
      lbls.forEach(l => allLabelsSet.add(l));
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      videos: videos.map(v => ({
        ...v,
        labels: v.labels ? JSON.parse(v.labels) : [],
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
      },
      allLabels: Array.from(allLabelsSet).sort(),
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyPassword(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, embedLink, thumbnailLink, downloadLink, labels } = body;

    if (!title || !embedLink || !thumbnailLink) {
      return NextResponse.json(
        { error: 'Title, embed link, and thumbnail link are required' },
        { status: 400 }
      );
    }

    const video = await db.video.create({
      data: {
        title,
        embedLink,
        thumbnailLink,
        downloadLink: downloadLink || '',
        labels: labels ? JSON.stringify(labels) : '[]',
      },
    });

    return NextResponse.json({
      ...video,
      labels: video.labels ? JSON.parse(video.labels) : [],
    });
  } catch (error) {
    console.error('Error creating video:', error);
    return NextResponse.json(
      { error: 'Failed to create video' },
      { status: 500 }
    );
  }
}
