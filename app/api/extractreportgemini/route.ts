import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
});

const prompt = `Attached is an image of a doctor's prescription.
Carefully analyze the handwritten text and extract only the medicine names and their usage instructions.

Do not include any patient details, dates, diagnoses, or other unrelated notes.

Present the extracted data in plain text with clear line breaks — no bullet points, asterisks, or markdown formatting.

Use a natural structure. For oral medicines, include:
Form and Name (e.g., Tab. Augmentin 625 mg)  
Dosage (e.g., 1-0-1 "twice a day")  
Duration (e.g., 5 days)  
Timing (e.g., after meals)

For non-oral medicines (e.g., gels, ointments, sprays, eye drops), include the name and usage frequency, and duration.

If any information is unclear or inferred, mark it as (uncertain).

Keep the formatting consistent and human-readable, like this:

Tab. Augmentin 625 mg  
Dosage: 1-0-1 (twice a day)  
Duration: 5 days  
Timing: After meals

Cap. Pan D 40 mg  
Dosage: 1-0-0 (once a day)  
Duration: 5 days  
Timing: Before meals

Inj. Neurobion  
Dosage: Once a week  
Duration: 1 month  
Timing: After meals
`;

export async function POST(req: Request, res: Response) {
    const { base64 } = await req.json();
    const filePart = fileToGenerativePart(base64)

    console.log(filePart);
    const generatedContent = await model.generateContent([prompt, filePart]);

    console.log(generatedContent);
    const textResponse = generatedContent.response.candidates![0].content.parts[0].text;
    return new Response(textResponse, { status: 200 })
}

function fileToGenerativePart(imageData: string) {
    return {
        inlineData: {
            data: imageData.split(",")[1],
            mimeType: imageData.substring(
                imageData.indexOf(":") + 1,
                imageData.lastIndexOf(";")
            ),
        },
    }
}