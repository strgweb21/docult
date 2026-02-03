import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function verifyPassword(request: NextRequest): Promise<boolean> {
  const password = request.headers.get('authorization');
  return password === ADMIN_PASSWORD;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyPassword(request))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, embedLink, thumbnailLink, downloadLink, labels } = body;

    if (!title || !embedLink || !thumbnailLink) {
      return NextResponse.json(
        { error: 'Title, embed link, and thumbnail link are required' },
        { status: 400 }
      );
    }

    const video = await db.video.update({
      where: { id },
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
    console.error('Error updating video:', error);
    return NextResponse.json(
      { error: 'Failed to update video' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyPassword(request))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;

    await db.video.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}
