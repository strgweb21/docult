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

    // 🔥 ambil data lama
    const existing = await db.video.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // 🔥 merge data (INI KUNCI UTAMA)
    const updated = await db.video.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        embedLink: body.embedLink ?? existing.embedLink,
        thumbnailLink: body.thumbnailLink ?? existing.thumbnailLink,
        downloadLink:
          body.downloadLink !== undefined
            ? body.downloadLink
            : existing.downloadLink,

        labels:
          body.labels !== undefined
            ? Array.isArray(body.labels)
              ? body.labels.join(",")
              : body.labels
            : existing.labels,
      },
    });

    return NextResponse.json({
      ...updated,
      labels: updated.labels
        ? updated.labels.split(",").map(l => l.trim())
        : [],
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
