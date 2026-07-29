import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const notification = await prisma.notification.create({
      data: {
        userId: body.userId,
        type: body.type || 'INFO',
        title: body.title,
        message: body.message,
        link: body.link || '',
      },
    });
    return NextResponse.json(notification);
  } catch (err: any) {
    console.error('Failed to create notification:', err);
    return NextResponse.json({ error: 'Failed to create notification', details: err?.message || String(err) }, { status: 500 });
  }
}
