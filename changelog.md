# V0.1 - 11/11/25 - Skeleton FastAPI, OpenRouter API communication

- Skeleton template for FastAPI applications added (`app.py`, `templates/index.html`)
- OpenRouter API communication script added
    - NOTE: If running the application locally, running this script with your API key before the main application is a good idea to catch any problems with communicating with OpenRouter

# V0.2 - 11/17-19/25 - Model Schema

- Model structure (User, RateLimiting, Chat, ChatMessage, Highlight) built in `models.py`
- Pydantic schema added in `schema.py`, will likely edit once routes are completed
- Ground truth dictionary added for differentiating which LLM was used per chat (stored as an Integer in `model_id`), translates the id to a string usable by the OpenRouter API (ie. `"minimax/minimax-m2:free"`)

# V0.3 - 11/23/25 - Routes + Model Schema Updates

- Routes added
    - Routes are not modularized yet, separate into auth, template, and API. Additionally, separate the helper functions
    - Routes are not complete, existing ones (for instance, the template routes) still require work
    - Additionally, the routes (as of now) only cover main application features, helper routes (such as filtering based on starred status) will be added in the future
    - An outline of the routes is available at `docs/routes_outline.md`
- Model schema updated
    - `EmailVerificationToken` and `ChatStar` models added
        - ChatStar fixes the global `starred` column
    - Pydantic schemas `schemas.py` overhauled to match routes
- `or_models_list` contains a hard-coded list of all available models usable in the application
    - Syntax: `1 : { "api_name" : "minimax/minimax-m2:free", "pretty_name" : "Minimax M2"}`
- `/docs` directory added
    - Contains `example_schema.js`, which shows the structure of the `chats` array that will be present in the frontend, which holds all ongoing chats' JSON objects
    - `project_description.md` contains an AI-generated summary of the project purpose & design decisions; this is intended to be a more technical version of the primary `README.md` for developers

# V0.4 - 12/4/25 - Auth Routes + Email Verification Working Successfully

- Sam's PR merged into main branch
    - Email verification working successfully
    - Add email values to `.env`
- Auth routes tested & working successfully (`/auth/signup`, `/auth/token`, `/auth/verify`)
    - `/auth/token` now saves the JWT access token in a cookie
- `bcrypt` version pushed back to `4.0.1` to fix compatibility issues with `passlib`
    - Possibly switch to another cryptography library in the future (`argon2`, etc)