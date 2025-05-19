import { Pinecone, PineconeRecord, RecordMetadata } from "@pinecone-database/pinecone";
import { FeatureExtractionPipeline, pipeline } from "@xenova/transformers";
import { modelname, namespace, topK } from "./app/config";
import { HfInference } from '@huggingface/inference'
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { batchsize } from "./app/config";

const hf = new HfInference(process.env.HF_TOKEN)
export async function queryPineconeVectorStore(
  client: Pinecone,
  indexName: string,
  namespace: string,
  query: string
): Promise<string> {
  const apiOutput = await hf.featureExtraction({
    model: "mixedbread-ai/mxbai-embed-large-v1",
    inputs: query,
  });
  console.log(apiOutput);
  
  const queryEmbedding = Array.from(apiOutput);
  // console.log("Querying database vector store...");
  const index = client.Index(indexName);
  const queryResponse = await index.namespace(namespace).query({
    topK: 5,
    vector: queryEmbedding as any,
    includeMetadata: true,
    // includeValues: true,
    includeValues: false
  });

  console.log(queryResponse);
  

  if (queryResponse.matches.length > 0) {
    const concatenatedRetrievals = queryResponse.matches
      .map((match,index) =>`\nClinical Finding ${index+1}: \n ${match.metadata?.chunk}`)
      .join(". \n\n");
    return concatenatedRetrievals;
  } else {
    return "<nomatches>";
  }
  return "";
}



let callback: (filename: string, totalChunks: number, chunksUpserted: number, isComplete: boolean) => void;
let totalDocumentChunks: number;
let totalDocumentChunksUpseted: number;

export async function updateVectorDB(
    client: Pinecone,
    indexname: string,
    namespace: string,
    docs: Document[],
    progressCallback: (filename: string, totalChunks: number, chunksUpserted: number, isComplete: boolean) => void
) {
    callback = progressCallback;
    totalDocumentChunks = 0;
    totalDocumentChunksUpseted = 0;
    const modelname = 'mixedbread-ai/mxbai-embed-large-v1';
    const extractor = await pipeline('feature-extraction', modelname, {
        quantized: false
    });
    console.log(extractor);
    for(const doc of docs){
        await processDocument(client, indexname, namespace, doc, extractor)
    }
    if (callback !== undefined) {
        callback("filename", totalDocumentChunks, totalDocumentChunksUpseted, true)
    }
}

async function processDocument(client: Pinecone, indexname: string, namespace: string, doc: Document<Record<string, any>>, extractor: FeatureExtractionPipeline) {
    const splitter = new RecursiveCharacterTextSplitter();
    const documentChunks = await splitter.splitText(doc.pageContent);
    totalDocumentChunks = documentChunks.length;
    totalDocumentChunksUpseted = 0;
    const filename = getFilename(doc.metadata.source);
    
    console.log(documentChunks.length);
    let chunkBatchIndex = 0;
    while(documentChunks.length > 0){
        chunkBatchIndex++;
        const chunkBatch = documentChunks.splice(0,batchsize)
        await processOneBatch(client, indexname, namespace, extractor, chunkBatch, chunkBatchIndex, filename)
    }
}


function getFilename(filename: string): string {
    const docname = filename.substring(filename.lastIndexOf("/") + 1);
    return docname.substring(0, docname.lastIndexOf(".")) || docname;
  }

async function processOneBatch(client: Pinecone, indexname: string, namespace: string, extractor: FeatureExtractionPipeline, chunkBatch: string[], chunkBatchIndex: number, filename: string) {
    const output = await extractor(chunkBatch.map(str => str.replace(/\n/g, ' ')), {
        pooling: 'cls'
    });
    const embeddingsBatch = output.tolist();
    let vectorBatch: PineconeRecord<RecordMetadata>[] = [];
    for(let i=0; i <chunkBatch.length; i++){
        const chunk = chunkBatch[i];
        const embedding = embeddingsBatch[i];

        const vector: PineconeRecord<RecordMetadata> = {
            id: `${filename}-${chunkBatchIndex}-${i}`,
            values: embedding,
            metadata: {
                chunk
            }
        }
        vectorBatch.push(vector);
    }

    const index = client.Index(indexname).namespace(namespace);
    await index.upsert(vectorBatch);
    totalDocumentChunksUpseted += vectorBatch.length;
    if (callback !== undefined) {
        callback(filename, totalDocumentChunks, totalDocumentChunksUpseted, false)
    }
    vectorBatch = [];
}
