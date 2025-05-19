import { updateVectorDB } from "@/utils";
import { Pinecone } from "@pinecone-database/pinecone";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { NextResponse } from "next/server";
import path from "path";

// Handle POST requests
export async function POST(req: Request) {
  const body = await req.json();
  const { indexname, namespace } = body;

  const loader = new DirectoryLoader("./documents", {
    ".pdf": (path: string) => new PDFLoader(path, { splitPages: false}),
    ".txt": (path: string) => new TextLoader(path),
  });

  const docs = await loader.load();
  const client = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  // Collect logs to return
  const logs: any[] = [];

  await updateVectorDB(
    client,
    indexname,
    namespace,
    docs,
    (filename, totalChunks, chunksUpserted, isComplete) => {
      logs.push({ filename, totalChunks, chunksUpserted, isComplete });
    }
  );

  return NextResponse.json({ status: "complete", logs });
}
