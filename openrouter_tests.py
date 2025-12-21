from openai import OpenAI

import os
from dotenv import load_dotenv
load_dotenv()

API_KEY = os.getenv("SECRET_KEY")

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=API_KEY,
)

# First API call with reasoning
response = client.chat.completions.create(
  model="allenai/olmo-3.1-32b-think:free",
  messages=[
          {
            "role": "user",
            "content": "How many r's are in the word 'strawberry'?"
          }
        ]
)

total_tokens = response.usage.total_tokens
model_tokens = response.usage.completion_tokens

# Extract the assistant message with reasoning_details
response = response.choices[0].message

# Preserve the assistant message with reasoning_details
messages = [
  {"role": "user", "content": "How many r's are in the word 'strawberry'?"},
  {
    "role": "assistant",
    "content": response.content,
    "reasoning_details": response.reasoning_details  # Pass back unmodified
  },
  {"role": "user", "content": "This seems like an easy question but can be often misinterpreted! Are you sure of your answer?"}
]

# Second API call - model continues reasoning from where it left off
# response2 = client.chat.completions.create(
#   model="allenai/olmo-3.1-32b-think:free",
#   messages=messages
# )


print(f"FIRST RESPONSE:\n\n\n{response.content}\n\n\n")
print(f"TOTAL TOKENS: {total_tokens}, MODEL TOKENS: {model_tokens}")
# print(f"FIRST REASONING:\n\n\n{response.reasoning_details}\n\n\n")
# print(f"SECOND RESPONSE:\n\n\n{response2.choices[0].message.content}\n\n\n")
# print(f"SECOND REASONING:\n\n\n{response2.choices[0].message.reasoning_details}\n\n\n")