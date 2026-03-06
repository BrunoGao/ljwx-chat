import { NextResponse } from 'next/server';

import { checkAuth } from '@/app/(backend)/middleware/auth';
import { S3 } from '@/server/modules/S3';

export const runtime = 'nodejs';
export const maxDuration = 300;

const handler = async (req: Request) => {
  try {
    const formData = await req.formData();
    const pathname = formData.get('pathname');
    const uploadFile = formData.get('file');

    if (typeof pathname !== 'string' || !pathname) {
      return NextResponse.json({ error: '缺少上传路径' }, { status: 400 });
    }

    if (!(uploadFile instanceof File)) {
      return NextResponse.json({ error: '缺少上传文件' }, { status: 400 });
    }

    const s3 = new S3();
    const buffer = Buffer.from(await uploadFile.arrayBuffer());

    await s3.uploadBuffer(pathname, buffer, uploadFile.type || undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[文件上传] 后端兜底上传失败:', error);

    return NextResponse.json({ error: '文件上传失败' }, { status: 500 });
  }
};

export const POST = async (req: Request) =>
  checkAuth(handler)(req, { params: Promise.resolve({ provider: 's3-upload' }) });
