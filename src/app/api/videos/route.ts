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
    const limit = parseInt(searchParams.get('limit') || '20');
    const label = searchParams.get('label');
    const s = searchParams.get('s');

    const skip = (page - 1) * limit;

    const where: any = {};

    if (label) {
      where.labels = {
        contains: label,
        mode: "insensitive",
      };
    }

    if (s) {
      where.title = {
        contains: s,
        mode: 'insensitive',
      };
    }

    // Tambah parsing sort dari query
    const sort = searchParams.get('sort'); // bisa 'title_asc', 'title_desc', 'created_asc', 'created_desc'

    let orderBy: any = { createdAt: 'desc' }; // default

    if (sort) {
      switch (sort) {
        case 'title_asc':
          orderBy = { title: 'asc' };
          break;
        case 'title_desc':
          orderBy = { title: 'desc' };
          break;
        case 'created_asc':
          orderBy = { createdAt: 'asc' };
          break;
        case 'created_desc':
          orderBy = { createdAt: 'desc' };
          break;
      }
    }

    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      db.video.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      videos: videos.map(v => ({
        ...v,
        labels: v.labels ? v.labels.split(",").map(l => l.trim()) : [],
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
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
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
        labels:
          Array.isArray(labels)
            ? labels.join(",")
            : typeof labels === "string"
            ? labels
            : "",
      },
    });

    return NextResponse.json({
      ...video,
      labels: video.labels
        ? video.labels.split(",").map(l => l.trim())
        : [],
    });
  } catch (error) {
    console.error('Error creating video:', error);
    return NextResponse.json(
      { error: 'Failed to create video' },
      { status: 500 }
    );
  }
}
