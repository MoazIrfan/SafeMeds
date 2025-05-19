import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';


export async function GET() {
    const files = fs.readdirSync(path.join(process.cwd(), 'documents'));
    return NextResponse.json(files);
}