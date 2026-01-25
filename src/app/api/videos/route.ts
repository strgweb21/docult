import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const ADMIN_PASSWORD = 'jakakarsa0';

async function verifyPassword(request: NextRequest): Promise<boolean> {
  const password = request.headers.get('authorization');
  return password === ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 30; // 6 columns x 5 rows = 30 per page
    const label = searchParams.get('label');
    const skip = (page - 1) * limit;

    const where = label ? {
      labels: {
        contains: label
      }
    } : {};

    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.video.count({ where }),
    ]);

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
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyPassword(request))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
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
