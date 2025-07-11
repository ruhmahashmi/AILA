import os
from llama_index.llms.gemini import Gemini

os.environ["GOOGLE_API_KEY"] = "your_actual_google_api_key"
llm = Gemini(model="models/gemini-pro")  
resp = llm.complete("Write a poem about a magic backpack")
print(resp)
