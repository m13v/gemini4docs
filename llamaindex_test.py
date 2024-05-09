from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import llamaindex

app = FastAPI()

# Initialize your LlamaIndex with the appropriate configuration
llama_index = llamaindex.LlamaIndex(model="gpt-3.5-turbo", api_key="your_openai_api_key")

class Query(BaseModel):
    question: str

@app.post("/query/")
async def create_query(query: Query):
    try:
        # Use LlamaIndex to retrieve and augment data before generating a response
        response = llama_index.rag_query(query.question)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)