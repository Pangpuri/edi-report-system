import { NextRequest, NextResponse } from 'next/server';

import { parseEDIFileDelphi } from '@/services/edi-parser';



export async function POST(request: NextRequest) {

  try {

    const formData = await request.formData();

    const file = formData.get('file') as File;

    

    if (!file) {

      return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 400 });

    }



    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await parseEDIFileDelphi(buffer, file.name);

    

    return NextResponse.json(result);

  } catch (error) {

    console.error('Error:', error);

    return NextResponse.json({ error: String(error) }, { status: 500 });

  }
}