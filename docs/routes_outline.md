### 1. Authentication & User Management (Auth)

These routes handle creating accounts, logging in, and verifying users. They are the foundation for securing user data like saved chats.

* **`POST /auth/signup`**
    * **Purpose:** To register a new user.
    * **Request Body:** JSON object containing `email` and `password`.
    * **Action:**
        1.  Validates the email and password.
        2.  Hashes the password.
        3.  Creates a new user in the database (e.g., in the `User` table), marking them as **unverified**.
        4.  Generates a unique email verification token.
        5.  Sends a verification email (using your email system) to the user's address with a link like `.../auth/verify/{token}`.
    * **Response:** Open "input code received in email" input page (either as a separate HTML document or opening a hidden input field on the login page).

* **`POST /auth/token` (Login)**
    * **Purpose:** To authenticate a user and provide them with a JWT (JSON Web Token). This is the standard FastAPI OAuth2 form route.
    * **Request Body:** A form-data request (not JSON) with `username` (your user's email) and `password`.
    * **Action:**
        1.  Verifies the user's email and password against the database.
        2.  Checks if the user's account is verified.
        3.  If successful, generates a JWT **access token**.
    * **Response:** JSON object with the access token (e.g., `{"access_token": "...", "token_type": "bearer"}`).

* **`POST /auth/verify/{token}`**
    * **Purpose:** To verify a new user's email address when they input the code in the received email.
    * **Request Body:** The code entered into the input box on the verify page.
    * **Action:** Check validity of the input code (does it match the one sent in the email, has it expired, etc)
    * **Response:** Redirects the user to a "Verification Successful" static page or to the login page.
    * **Note:** If a user tries logging in with a registered but not verified account (ie. they previously created an account, had the verification email sent, but they had closed the page before entering the emailed code, they go back to the login screen), they will not be provided a JWT, and instead be redirected to the verification page where they can ask for another verification email.

---

### 2. Page & Asset Rendering (Frontend)

Since you're using a plain HTML/CSS/JS frontend, FastAPI is responsible for serving the main HTML files and all your static assets.

* **`GET /` (Root/Main App)**
    * **Purpose:** To serve the main chat application page (`index.html`).
    * **Auth:** Requires login. If the user is not logged in (no valid JWT), this route should **redirect** them to the `/examples` page.
    * **Response:** The `index.html` file (from the database to be rendered through Jinja2: hard-coded models list (stored in `models_list` dictionary, store in a JS object after receiving in the frontend), current `User`.)

* **`GET /examples`**
    * **Purpose:** To serve the "Examples" page.
    * **Auth:** **Public.** This is the default page for logged-out users.
    * **Response:** The `examples.html` file (from the database to be rendered through Jinja2: every chat with the `is_public` flag set to true).

* **`GET /saved-chats`**
    * **Purpose:** To serve the "Saved Chats" page.
    * **Auth:** Requires login. Should redirect to `/examples` if not logged in.
    * **Response:** The `saved_chats.html` file (from the database to be rendered through Jija2: every chat owned by the current `User` or `starred` set to true).

* **`GET /static/{file_path:path}`**
    * **Purpose:** To serve all your static assets (CSS, JavaScript files, images, etc.).
    * **Note:** This is typically configured once in FastAPI by "mounting" a `StaticFiles` directory.
    * **Response:** The requested file (e.g., `style.css`, `app.js`).

---

### 3. Core Chat & Model Interaction (API)

This is the protected API endpoint your frontend JavaScript will call to run the experiment.

* **`POST /api/v1/chat/submit`**
    * **Purpose:** This is the main endpoint for sending a prompt to a model via OpenRouter.
    * **Auth:** Requires login.
    * **Request Body:** JSON object:
        * `model_id`: The OpenRouter model to use.
        * `prompt`: The user's new prompt text.
        * `sources_list`: An array of strings (previous responses the user checked as sources).
    * **Action:**
        1.  Performs **rate limiting** (checks the user's chat count against their limit).
        2.  Combines the `prompt` and `sources` into a single, coherent prompt for the model.
        3.  Makes an API call to OpenRouter with the combined prompt.
        4.  Receives the response from OpenRouter.
        5.  Updates **rate limiting** with tokens used stats from the model response and increments `num_messages`
    * **Response:** A JSON object with the model's response (e.g., `{"model_id": 1, "response_text": "This is the model's answer..."}`).

---

### 4. Data Management (Chats & Examples API)

These routes handle saving, loading, and publishing chat histories.

* **`POST /api/v1/chats/save?publish=status`**
    * **Purpose:** To save a user's current chat history to the database, possibly making it public (depending on the query parameter).
    * **Auth:** Requires login.
    * **Request Body:** A large JSON object containing the entire chat history, including the structured highlights and comments.
        * `title`: "My Chat Title"
        * `anonymous`: False (on requests with query parameter `publish` set to false, `anonymous` is always set to false, when `publish` is set to true, `anonymous` is set to true or false based on what was provided in the request)
        * `history`: `{ "model_id": 4, "pretty_name": "Model B", messages: [...]}`
            * `history` is pulled from the global chats array in the frontend (ie. if the first chat is to be saved, this will be the object obtained from `chats[0]`), meaning that it follows the same structure.
    * **Action:** Saves this data to the `chats` table, linking it to the user.
    * **Response:** A success message with the new chat ID (e.g., `{"success": true, "chat_id": 123}`).

* **`PUT /api/v1/chats/publish-from-saved`**
    * **Purpose:** To "publish" a user's chat that is already saved in the database to the public "Examples" page.
    * **Auth:** Requires login.
    * **Request Body:** JSON object:
        * `chat_id`: The ID of the private chat to be published.
        * `new_title`: The updated title of the post.
        * `anonymous`: Whether to publish it as the name saved under `pseudonym` in the `User` table or anonymously.
    * **Action:**
        1.  Verifies the user owns the `chat_id`.
        2.  Flips the `is_public` flag to true, sets `anonymous` to the specified value, etc.
    * **Response:** A success message (e.g., `{"success": true, "public_chat_id": 123}`).

* **`GET /api/v1/chats/saved/{slug}`**
    * **Purpose:** To load the *full* history of one specific saved chat (public or private).
    * **Action:** Fetches the chat from the `chats` table. **Crucially, it must verify that the requested `chat_id` is either public or belongs to the logged-in user.**
    * **Response:** The full JSON object of the chat history (the same data sent in the request body of the above POST request `/api/v1/chats/save`).