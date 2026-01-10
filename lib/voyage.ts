import { VoyageAIClient } from "voyageai";

if (!process.env.VOYAGE_API_KEY) {
  throw new Error("VOYAGE_API_KEY environment variable is not set");
}

const voyageClient = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY,
});

export default voyageClient;

export async function getEmbeddings(
  texts: string[],
  model: string = "voyage-3"
): Promise<number[][]> {
  const response = await voyageClient.embed({
    input: texts,
    model,
  });

  return response.data?.map((item) => item.embedding ?? []) ?? [];
}

export async function getEmbedding(
  text: string,
  model: string = "voyage-3"
): Promise<number[]> {
  const embeddings = await getEmbeddings([text], model);
  return embeddings[0] ?? [];
}
