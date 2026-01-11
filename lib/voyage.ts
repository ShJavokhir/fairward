import { VoyageAIClient } from "voyageai";

let voyageClient: VoyageAIClient | null = null;

function getVoyageClient(): VoyageAIClient {
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error("VOYAGE_API_KEY environment variable is not set");
  }

  if (!voyageClient) {
    voyageClient = new VoyageAIClient({
      apiKey: process.env.VOYAGE_API_KEY,
    });
  }

  return voyageClient;
}

export default getVoyageClient;

export async function getEmbeddings(
  texts: string[],
  model: string = "voyage-3"
): Promise<number[][]> {
  const client = getVoyageClient();
  const response = await client.embed({
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
