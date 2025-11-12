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
  model="minimax/minimax-m2:free",
  messages=[
          {
            "role": "user",
            "content": "How many r's are in the word 'strawberry'?"
          }
        ],
  extra_body={"reasoning": {"enabled": True}}
)

print(response.choices[0].message.content)
print("------------------------------------")

# Extract the assistant message with reasoning_details
response = response.choices[0].message

print(response.reasoning_details)
print("------------------------------------")

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
response2 = client.chat.completions.create(
  model="minimax/minimax-m2:free",
  messages=messages,
  extra_body={"reasoning": {"enabled": True}}
)

print(response2.choices[0].message.content)