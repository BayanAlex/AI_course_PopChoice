import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {
  ErrorCodes,
  GetRecommendationPayload,
  MatchResult,
  PollAnswer,
  RecommendationResponse,
  RetrievedDoc,
  RetrieveToolWithState,
} from './interfaces.ts';
import { handleCors, initSupabaseAndAI, jsonResponse } from '../shared/functions.ts';
import { z } from 'npm:zod@4.1.12';
import { tool } from '@langchain/core/tools';
import { SystemMessage } from '@langchain/core/messages';
import { systemPromptText } from './system-prompt.ts';
import { createAgent } from 'langchain';
import { ChatOpenAI } from 'npm:@langchain/openai@1.1.0';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { blobToBase64 } from './utils.ts';
import { baseImageUrl, llmTemperature, movieSearchUrl } from './constants.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  const initResult = initSupabaseAndAI(req);
  if (initResult.error) {
    console.error('Initialization failed:', initResult.error);
    return jsonResponse(
      {
        error: 'Internal error',
      },
      503
    );
  }

  try {
    const { vectorStore, llmModel } = initResult;

    // Parse request body
    const data = (await req.json()) as GetRecommendationPayload;
    const query = createQuery(data);

    // Initialize agent with freshness constraint
    const { agent, retrieveTool } = initAgent(
      vectorStore!,
      llmModel,
      data.pollAnswers,
      data.usedRecommendations
    );

    const recommendation = (await getRecommendation(
      agent,
      query,
      retrieveTool
    )) as RecommendationResponse;
    recommendation.poster = await getPoster(recommendation.title, recommendation.releaseYear);
    console.log('Recommendation:', recommendation);

    return jsonResponse<RecommendationResponse>(recommendation);
  } catch (error) {
    if (error instanceof Error) {
      const baseErrorMessage =
        'No movies found matching your preferences. Please try different criteria.';
      if (error.message === ErrorCodes.NO_MOVIES_FOUND) {
        console.error('No movies found in database for the given criteria');
        return jsonResponse(
          {
            error: baseErrorMessage,
          },
          404
        );
      }

      if (error.message === ErrorCodes.RETRIEVE_TOOL_NOT_CALLED) {
        console.error('Agent bypassed the retrieve tool - this should never happen!');
        return jsonResponse(
          {
            error: 'Internal error. Please try again.',
          },
          500
        );
      }
    }

    // Re-throw other errors
    console.error('Unexpected error:', error);
    return jsonResponse(
      {
        error: 'Internal error. Please try again.',
      },
      500
    );
  }
});

// Functions

async function getPoster(title: string, releaseYear?: string) {
  const tmdbApiKey = Deno.env.get('TMDB_API_KEY')!;
  const tmdbApiToken = Deno.env.get('TMDB_API_TOKEN')!;

  const url = new URL(movieSearchUrl);
  url.searchParams.append('api_key', tmdbApiKey);
  url.searchParams.append('query', title);
  if (releaseYear && releaseYear !== 'null') {
    url.searchParams.append('year', releaseYear);
  }

  let poster: string | null = null;
  try {
    const searchRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tmdbApiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const searchData = await searchRes.json();
    console.log('TMDB Search data:', searchData);

    if (!searchData?.results?.length) {
      return null;
    }

    // Find the best matching movie
    const normalizedTitle = title.toLowerCase().trim();
    const results = searchData.results as Array<{
      title: string;
      poster_path: string | null;
      release_date?: string;
    }>;

    // First, try exact title match
    let bestMatch = results.find((movie) => movie.title.toLowerCase().trim() === normalizedTitle);

    // If no exact match, try to find one that starts with the title or contains it
    if (!bestMatch) {
      bestMatch = results.find(
        (movie) =>
          movie.title.toLowerCase().includes(normalizedTitle) ||
          normalizedTitle.includes(movie.title.toLowerCase())
      );
    }

    // Fallback to first result if no better match found
    if (!bestMatch) {
      bestMatch = results[0];
    }

    const posterPath = bestMatch?.poster_path;
    if (!posterPath) {
      return null;
    }

    console.log('Selected TMDB movie:', bestMatch.title, 'for query:', title);

    const posterUrl = `${baseImageUrl}${posterPath}`;
    console.log('Poster URL:', posterUrl);

    const posterImage = await fetch(posterUrl);
    if (!posterImage.ok) {
      return null;
    }

    const blob = await posterImage.blob();
    poster = await blobToBase64(blob);
  } catch {
    return null;
  }

  return poster;
}

function createQuery(data: GetRecommendationPayload) {
  let query = `TIME AVAILABLE: ${data.timeAvailable}\n`;
  query += `PARTICIPANTS: ${data.pollAnswers.length}\n\n`;

  const aggregateMood = (answers: PollAnswer[]) => {
    const voteCounts = answers.reduce((total: Record<string, number>, answer) => {
      answer.mood.forEach((value) => {
        total[value] = (total[value] ?? 0) + 1;
      });
      return total;
    }, {});

    return Object.entries(voteCounts)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  query += `MOOD VOTES: ${aggregateMood(data.pollAnswers)}\n\n`;

  query += `PREFERENCES:\n`;
  for (let i = 0; i < data.pollAnswers.length; i++) {
    query += `Person ${i + 1}: Movie="${
      data.pollAnswers[i].favoriteMovie
    }", Character="${data.pollAnswers[i].favoritePerson}"\n`;
  }

  console.log('User query:', query);

  return query;
}

async function getRecommendation(
  agent: ReturnType<typeof createAgent>,
  query: string,
  retrieveTool: RetrieveToolWithState
) {
  console.log('Invoking agent with query...');
  const result = await agent.invoke({
    messages: [
      {
        role: 'user',
        content: query,
      },
    ],
  });
  console.log('Agent invocation complete');

  // Check if the retrieve tool was actually called
  const retrievedTitles = retrieveTool.lastRetrievedTitles;
  const retrievalFailed = retrieveTool.retrievalFailed;

  console.log('Retrieve tool called:', retrievedTitles !== undefined);
  if (retrievalFailed) {
    console.warn('Retrieve tool failed!');
  } else {
    console.log('Retrieve tool returned:', retrievedTitles);
  }

  // CRITICAL: Ensure the retrieve tool was actually invoked
  if (retrievedTitles === undefined) {
    console.error('CRITICAL ERROR: Agent did NOT call the retrieve tool!');
    console.error('This means the AI generated a recommendation without searching the database.');
    throw new Error('RETRIEVE_TOOL_NOT_CALLED');
  }

  // Check if retrieval failed (no documents found)
  if (retrievalFailed) {
    throw new Error('NO_MOVIES_FOUND');
  }

  const recommendation = result.structuredResponse;
  console.log('Recommended title:', recommendation.title);

  // Check if the recommended title matches any of the retrieved titles (case-insensitive, trim whitespace)
  const normalizedRecommendedTitle = recommendation.title.trim().toLowerCase();
  const isValid = retrievedTitles.some(
    (title: string) => title.trim().toLowerCase() === normalizedRecommendedTitle
  );

  if (!isValid) {
    console.warn(
      `WARNING: AI recommended "${recommendation.title}" which is NOT in the retrieved list!`
    );
    console.warn('Retrieved titles were:', retrievedTitles);
  }

  return recommendation;
}

function initAgent(
  vectorStore: SupabaseVectorStore,
  llmModel: string,
  pollAnswers: PollAnswer[],
  usedRecommendations: string[] = []
) {
  const determineFreshnessPreference = (answers: PollAnswer[]): 'new' | 'classic' | 'any' => {
    const counts = { new: 0, classic: 0 };

    answers.forEach((answer) => {
      answer.freshness.forEach((value) => {
        if (value === 'new') counts.new++;
        if (value === 'classic') counts.classic++;
      });
    });

    if (counts.new > counts.classic) return 'new';
    if (counts.classic > counts.new) return 'classic';
    return 'any';
  };

  const freshnessPreference = determineFreshnessPreference(pollAnswers);

  const retrieveSchema = z.object({
    query: z
      .string()
      .describe(
        'Search query with 8-12 keywords expanded from moods, favorite movies, and characters (no names, no "new"/"classic")'
      ),
    timeLimitMinutes: z
      .number()
      .nullable()
      .describe('Parsed time limit in minutes from TIME AVAILABLE field (e.g., "2 hours" → 120)'),
  });

  const responseFormat = z.object({
    title: z.string().describe('Exact movie title from retrieved list'),
    description: z
      .string()
      .describe('2-3 sentence pitch explaining why this movie fits the group preferences'),
    releaseYear: z.string().describe('Movie release year'),
    timeLimitMinutes: z
      .string()
      .describe('Parsed time limit in minutes, or "null" if not specified'),
    movieDurationMinutes: z
      .string()
      .describe('Duration of recommended movie in minutes, or "null" if unknown'),
  });

  const retrieve = tool(
    async ({ query, timeLimitMinutes }) => {
      console.log('=== RETRIEVE TOOL CALLED ===');
      console.log('>>> Search query:', query);

      // First, get embeddings for the query
      const embeddings = vectorStore.embeddings;
      const queryEmbedding = await embeddings.embedQuery(query);

      // Calculate year filters based on freshness preference
      const nowYear = new Date().getFullYear();
      const freshnessWindowYears = 10;

      let minYear: number | null = null;
      let maxYear: number | null = null;

      if (freshnessPreference === 'new') {
        // Only movies released in the last 10 years
        minYear = nowYear - freshnessWindowYears;
      } else if (freshnessPreference === 'classic') {
        // Only movies released more than 10 years ago
        maxYear = nowYear - freshnessWindowYears - 1;
      }
      // If 'any', both minYear and maxYear remain null (no filter)

      console.log('Database filters:', {
        max_duration: timeLimitMinutes,
        min_year: minYear,
        max_year: maxYear,
        excluded_titles: usedRecommendations,
      });

      const supabaseClient = vectorStore.client;

      const { data: matches, error } = await supabaseClient.rpc('match_documents_with_filters', {
        query_embedding: queryEmbedding,
        match_count: 20,
        max_duration: timeLimitMinutes,
        min_year: minYear,
        max_year: maxYear,
        excluded_titles: usedRecommendations.length > 0 ? usedRecommendations : null,
      });

      if (error) {
        console.error('Error calling match_documents_with_filters:', error);
        (retrieve as unknown as RetrieveToolWithState).lastRetrievedTitles = [];
        (retrieve as unknown as RetrieveToolWithState).retrievalFailed = true;
        return `ERROR: Failed to retrieve movies from database: ${error.message}`;
      }

      if (!matches || matches.length === 0) {
        console.log('No movies found matching the metadata filter');
        (retrieve as unknown as RetrieveToolWithState).lastRetrievedTitles = [];
        (retrieve as unknown as RetrieveToolWithState).retrievalFailed = true;
        return `ERROR: No movies found matching your time and freshness preferences. Try adjusting your preferences.`;
      }

      console.log('Retrieved documents count (after metadata filtering):', matches.length);

      // Convert matches to documents format
      const retrievedDocs: RetrievedDoc[] = matches.map((match: MatchResult) => ({
        pageContent: match.content,
        metadata: match.metadata,
      }));

      const movieTitles: string[] = retrievedDocs
        .map((doc) => {
          const lines = doc.pageContent.split('\n');
          const nameLine = lines.find((line) => line.startsWith('Name:'));
          return nameLine ? nameLine.replace('Name:', '').trim() : null;
        })
        .filter((title): title is string => title !== null);

      console.log('Extracted movie titles:', movieTitles);

      // Store success state
      (retrieve as unknown as RetrieveToolWithState).retrievalFailed = false;

      let textContent = `=== AVAILABLE MOVIES ===\n`;
      textContent += movieTitles.map((title, idx) => `${idx + 1}. ${title}`).join('\n');
      textContent += `\n\n=== MOVIE DETAILS ===\n`;
      textContent += retrievedDocs.map((doc) => doc.pageContent).join('\n\n---\n\n');

      // Store the titles for validation
      (retrieve as unknown as RetrieveToolWithState).lastRetrievedTitles = movieTitles;

      console.log('=== RETRIEVE TOOL COMPLETE ===');

      return textContent;
    },
    {
      name: 'retrieve',
      description:
        'Retrieve movies from the database. Pass timeLimitMinutes (parsed from TIME AVAILABLE) to filter by duration. You MUST recommend ONLY from the movies returned by this tool.',
      schema: retrieveSchema,
      responseFormat: 'content',
    }
  );

  const tools = [retrieve];
  const systemPrompt = new SystemMessage(systemPromptText);

  const model = new ChatOpenAI({
    model: llmModel,
    temperature: llmTemperature,
    modelKwargs: {
      parallel_tool_calls: false,
    },
  });

  const agent = createAgent({
    model,
    tools,
    systemPrompt,
    responseFormat,
  });

  return { agent, retrieveTool: retrieve };
}
