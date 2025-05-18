import { queryPineconeVectorStore } from "@/utils";
import { Pinecone } from "@pinecone-database/pinecone";
// import { Message, OpenAIStream, StreamData, StreamingTextResponse } from "ai";
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, Message, StreamData, streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 60;
// export const runtime = 'edge';

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY ?? "",
});

const google = createGoogleGenerativeAI({
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: process.env.GEMINI_API_KEY
});

// gemini-1.5-pro-latest
// gemini-1.5-pro-exp-0801
const model = google('models/gemini-1.5-pro-latest', {
    safetySettings: [
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ],
});

export async function POST(req: Request, res: Response) {
    const reqBody = await req.json();
    console.log(reqBody);

    const messages: Message[] = reqBody.messages;
    const userQuestion = `${messages[messages.length - 1].content}`;

    const reportData: string = reqBody.data.reportData;
    const query = `Represent this for retrieving relevant medical information:
    The patient's prescription includes the following medicines and dosages:
    \n${reportData}

    The user has the following question about the prescription:
    \n${userQuestion}`;

    const retrievals = await queryPineconeVectorStore(pinecone, 'medic', "ns1", query);

    const finalPrompt = `Below is a summary of medicines extracted from a patient's prescription, along with a user query. Additional generic clinical insights are also provided, which may assist in responding accurately.

    Carefully review the prescription and respond to the user query based only on medically relevant information.

    Your response must focus on the following aspects for each medicine:
    - Purpose or use of the medicine (brief and in bullet points)
    - Common side effects (in bullet points)
    - Important precautions or warnings (e.g., food interactions, age restrictions, allergy risks, timing considerations)
    - General guidance for patients if relevant

    **Important:** Do NOT include any clinical findings unless they are clearly relevant to the medicines listed. Ignore any unrelated findings entirely. Avoid hallucination and stick to facts that are supported by the prescription or relevant findings.

    \n\n**Prescription Summary:** \n${reportData}.
    \n**end of Prescription Summary** 

    \n\n**User Query:**\n${userQuestion}?
    \n**end of user query** 

    \n\n**Generic Clinical findings:**
    \n\n${retrievals}. 
    \n\n**end of generic clinical findings** 

    \n\nProvide a clear, structured, and medically accurate explanation. Use plain text and avoid Markdown formatting such as asterisks or bullet symbols.
    \n\n**Answer:**
    `;

    const data = new StreamData();
    data.append({
        retrievals: retrievals
    });

    const result = await streamText({
        model: model,
        prompt: finalPrompt,
        onFinish() {
            data.close();
        }
    });

    return result.toDataStreamResponse({ data });
}

