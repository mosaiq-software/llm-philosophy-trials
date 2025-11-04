# LLM Philosophy Trials

Have you ever wondered how various Large Language Models (LLMs) perform when tasked with different philosophical scenarios? Similarly, LLMs are great at following directions from users---what happens when you give a model management over another model? What if a model given free reign without any direction? These are some of the questions that this project hopes to answer!

Our goal is to uncover the decision-making process of LLMs within the context of philosophy and ethics; this area has seen some study, but little effort has been made to facilitate this information to the general public. The 'black box' problem obfuscates much of the processing done between input and output, and as easy as it may be to accept responses from a model, it is of utmost importance to understand how the response was generated. The lack of explainability in AI will hurt consumers in the long run, and due to this fact, we chose to publish our experiments on a website so that they can be seen by the largest number of people possible.

## Tech Stack

The frontend and chat interfaces will be made with plain `HTML`/`CSS`/`JS` in the beginning, and eventually move to a frontend framework (such as `React`, `Svelte`, etc) once more progress on the project is made. The backend will be built either in Python (`Flask`) or JavaScript/TypeScript (`Express`), this will also be finalized once we have a better idea of what our API usage will look like to interact with the models. This API will be provided through [OpenRouter](https://openrouter.ai), which offers a unified interface to communicate with LLMs from various providers, such as OpenAI, Anthropic, Google, etc. Any additional frameworks, libraries, and tools that are used on a per experiment basis will be listed in the experiment's entry below.

## The Trials

Each trial/experiment can be found below, accompanied by a brief description of the experiment's goals, methodologies, findings, and technologies used:

| Trial Name | Description |
| -------- | ------------ |
| Recycled Synthetic Data as Input | An LLM will be asked an initial complex science question, and its response will be saved. A new instance of the model will be queried with the same question, but the previous response will be attached as a source. This experiment aims to show how small hallucinations can snowball and be easily perpetuated. |