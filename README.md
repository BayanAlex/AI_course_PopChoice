# 🍿 PopChoice

**PopChoice** is an intelligent web application for personalized movie recommendations that uses artificial intelligence and RAG (Retrieval-Augmented Generation) technology.

## 🌐 [**Live Demo →**](https://popchoice-rag.netlify.app)

## 📖 About the Project

PopChoice helps users find the perfect movie based on their preferences, mood, and available time. Instead of traditional search or browsing endless lists, the app guides users through an interactive poll and uses an AI agent to generate personalized recommendations.

### How it Works:

1. **Interactive Poll**: User answers questions about:
   - Mood (funny, serious, scary, inspiring)
   - Favorite movies or characters
   - Preference for something new or classic
   - Available time for watching

2. **AI Analysis**: User responses are processed by an OpenAI-powered AI agent

3. **Intelligent Recommendation**: The system uses RAG to find the best movie from a database of IMDb Top 250 films

4. **Unique Recommendations**: Each subsequent recommendation is guaranteed to be new (no repeats)

## 🎯 Key Features

- ✨ Personalized recommendations based on user preferences
- 🤖 AI agent for intelligent response analysis
- 🎬 Database of 250 best IMDb movies
- ⏱️ Filtering by available time
- 🎭 Precise genre-to-mood matching
- 🔄 Unique recommendations without repetition
- 🎨 Movie posters from The Movie Database (TMDb)

## 🛠️ Technologies

### Frontend

- **Framework**: [Angular 20](https://angular.io/) — modern framework for building web applications
- **Programming Language**: [TypeScript 5.8](https://www.typescriptlang.org/)
- **Styles**: SCSS + [Bootstrap 5.3](https://getbootstrap.com/)
- **Routing**: Angular Router with guards for route protection
- **HTTP Client**: RxJS for reactive programming
- **API Client**: [@supabase/supabase-js](https://supabase.com/docs/reference/javascript/introduction)
- **Build Tool**: Angular CLI with esbuild
- **Linting**: ESLint + Prettier
- **Deployment**: Netlify

#### Frontend Architecture:

```
src/app/
├── pages/           # Application pages
│   ├── start-page/  # Home page
│   ├── poll-page/   # Poll page
│   └── movie-page/  # Recommendation page
├── services/        # Services
│   ├── poll-state.service.ts      # Poll state management
│   ├── rag.service.ts              # AI backend integration
│   └── supabase.service.ts         # Supabase client
├── guards/          # Route guards
├── models/          # TypeScript models and interfaces
└── app.config.ts    # Application configuration
```

### Backend

- **Platform**: [Supabase](https://supabase.com/) — Backend-as-a-Service with open-source database
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [pgvector](https://github.com/pgvector/pgvector) extension
- **Edge Functions**: [Deno](https://deno.land/) — modern runtime for JavaScript/TypeScript
- **Vector Store**: Supabase Vector Store for storing embeddings

#### Backend Functions:

1. **create-embeddings** (`/backend/supabase/functions/create-embeddings/`)
   - Loads movie data from file
   - Splits text into chunks using RecursiveCharacterTextSplitter
   - Creates vector embeddings via OpenAI API
   - Stores embeddings in PostgreSQL with pgvector

2. **get-recommendation** (`/backend/supabase/functions/get-recommendation/`)
   - Receives user responses from the poll
   - Uses AI agent for analysis and search
   - Returns personalized movie recommendation
   - Fetches movie poster from TMDb API

### AI Libraries:

- **[@langchain/openai](https://js.langchain.com/docs/integrations/chat/openai)**: Integration with OpenAI GPT models
- **[@langchain/core](https://js.langchain.com/docs/introduction/)**: Core LangChain tools
- **[@langchain/community](https://js.langchain.com/docs/integrations/vectorstores/)**: Integration with vector stores
- **[OpenAI API](https://platform.openai.com/docs/overview)**: For creating embeddings and chat completions

## 🤖 The Role of Artificial Intelligence

### 1. **OpenAI GPT Model**

The project uses the **ChatGPT** model (via LangChain) for:
- Analyzing user responses
- Generating search queries based on mood and preferences
- Selecting the most relevant movie
- Creating personalized recommendation descriptions

**Temperature**: Configured for a balance between creativity and accuracy

### 2. **AI Agent (LangChain Agent)**

The AI agent is an autonomous system that:

- **Receives a task**: Find the best movie based on user responses
- **Makes decisions**: Which tool to use and how to formulate the query
- **Uses tools**: Has access to a special `retrieve` tool for searching movies
- **Analyzes results**: Selects the best option from retrieved movies
- **Generates response**: Creates a structured recommendation with description

The agent's **System Prompt** includes:
- Rules for parsing time (supports different languages and formats)
- Logic for matching genres with user mood
- Rules for creating search queries
- Response format

### 3. **RAG (Retrieval-Augmented Generation)**

RAG is a pattern that combines information retrieval with AI-generated responses:

#### How RAG Works in PopChoice:

**Stage 1: Data Preparation (Indexing)**
```
IMDb Top 250 Movies 
    ↓
Text descriptions with metadata (genre, year, duration, rating)
    ↓
RecursiveCharacterTextSplitter (splitting into chunks)
    ↓
OpenAI Embeddings API (converting text to vectors)
    ↓
PostgreSQL + pgvector (storing vectors)
```

**Stage 2: Search (Retrieval)**
```
User query
    ↓
AI agent creates optimized search query (8-12 keywords)
    ↓
Converting query to embedding vector
    ↓
Vector similarity search (cosine similarity) in database
    ↓
Filtering by:
  - Duration (if time specified)
  - Freshness (new vs classic)
  - Excluding already recommended
    ↓
Top relevant movies
```

**Stage 3: Generation**
```
Relevant movies from DB
    ↓
AI agent analyzes mood and genre match
    ↓
GPT generates personalized description
    ↓
Structured recommendation for user
```

#### RAG Advantages:

- ✅ **Accuracy**: AI recommends only real movies from the database
- ✅ **Up-to-date**: Easy to update movie database without retraining the model
- ✅ **Speed**: Vector search works very fast even on large datasets
- ✅ **Context-aware**: AI considers metadata (genre, year, duration, rating)
- ✅ **Transparency**: Can track why exactly this movie was chosen

### 4. **Vector Embeddings**

**Embeddings** are numerical representations of text in the form of high-dimensional vectors (1536 dimensions for OpenAI):

- Texts with similar meaning have similar vectors
- Allow finding semantic similarity (not just keywords)
- For example: "funny comedy" and "hilarious laugh" will be close in vector space

**pgvector** PostgreSQL extension:
- Stores vectors directly in the database
- HNSW index for fast approximate nearest neighbor search
- Supports various metrics (cosine similarity, L2 distance)

## 📁 Project Structure

```
PopChoice/
├── frontend/                 # Angular application
│   ├── src/
│   │   ├── app/             # Components, services, guards
│   │   └── environments/    # Environment configuration
│   └── public/
│       └── _redirects       # Netlify configuration for SPA
│
├── backend/
│   └── supabase/
│       ├── functions/       # Edge Functions on Deno
│       │   ├── create-embeddings/  # Vector creation
│       │   ├── get-recommendation/ # AI recommendations
│       │   └── shared/            # Shared utilities
│       ├── sql/
│       │   └── init.sql     # DB schema with pgvector
│       └── config.toml      # Supabase configuration
│
└── movies_data/
    ├── imdb_top250.txt      # IMDb movies database
    └── imbd_list.py         # Data collection script
```

## 🚀 Installation and Setup

### Requirements

- Node.js 18+
- Deno 1.37+
- Supabase CLI
- OpenAI API Key
- TMDb API Key

### Frontend

```bash
cd frontend
npm install
npm start
```

The app will be available at: `http://localhost:4200`

### Backend

1. Install Supabase CLI:
```bash
brew install supabase/tap/supabase
```

2. Start local Supabase:
```bash
cd backend/supabase
supabase start
```

3. Configure environment variables:
```bash
# In Supabase Dashboard → Edge Functions → Secrets
OPENAI_API_KEY=your_openai_key
TMDB_API_KEY=your_tmdb_key
```

4. Deploy functions:
```bash
supabase functions deploy create-embeddings
supabase functions deploy get-recommendation
```

5. Initialize database:
```bash
# Create embeddings for movies
curl -X POST https://your-project.supabase.co/functions/v1/create-embeddings
```

## 🌐 Deployment

### Frontend (Netlify)

The project is deployed on Netlify with automatic routing for SPA thanks to the `_redirects` file.

### Backend (Supabase)

Backend is automatically hosted on Supabase Edge Functions.

## 📝 License

Private project - Part of **AI Engineer Path** course on Scrimba

## 👨‍💻 Author

### Oleksandr Shyhyda

---

**Made with ❤️ and 🍿**

