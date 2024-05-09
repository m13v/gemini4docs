# import libraries                                                                                                                                                                                                
from llama_index import download_loader, ServiceContext                                                                                                                                                           
from llama_index.embeddings.huggingface import HuggingFaceEmbedding                                                                                                                                               
                                                                                                                                                                                                                    
# define LLM and embedding model                                                                                                                                                                                  
llm = LlamaCPP(model_url="https://huggingface.co/TheBloke/Llama-2-13B-chat-GGUF/resolve/main/llama-2-13b-chat.Q4_0.gguf")  # replace with your Llama 2 model                                                      
embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en")                                                                                                                                                
                                                                                                                                                                                                                    
# load documents                                                                                                                                                                                                  
PyMuPDFReader = download_loader("PyMuPDFReader")                                                                                                                                                                  
loader = PyMuPDFReader()                                                                                                                                                                                          
documents = loader.load_data(file_path="./data/llama2.pdf")                                                                                                                                                       
                                                                                                                                                                                                                    
# define service context                                                                                                                                                                                          
service_context = ServiceContext.from_defaults(llm=llm, embed_model=embed_model)                                                                                                                                  
                                                                                                                                                                                                                    
# create vector store index                                                                                                                                                                                       
index = VectorStoreIndex.from_documents(documents, service_context=service_context)                                                                                                                               
                                                                                                                                                                                                                    
# query the index                                                                                                                                                                                                 
response = index.query("How does Llama 2 perform compared to other open-source models?")                                                                                                                          
print(response) 

# from fastapi import FastAPI, HTTPException
# from pydantic import BaseModel
# import llamaindex

# app = FastAPI()

# # Initialize your LlamaIndex with the appropriate configuration
# llama_index = llamaindex.LlamaIndex(model="gpt-3.5-turbo", api_key="your_openai_api_key")

# class Query(BaseModel):
#     question: str

# @app.post("/query/")
# async def create_query(query: Query):
#     try:
#         # Use LlamaIndex to retrieve and augment data before generating a response
#         response = llama_index.rag_query(query.question)
#         return {"response": response}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)