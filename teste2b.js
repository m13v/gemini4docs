import { CodeInterpreter } from '@e2b/code-interpreter'                                                                                                            
                                                                                                                                                                        
const sandbox = await CodeInterpreter.create()                                                                                                                            
    
const execOptions = {
    onStdout: (stdout) => {
        // Ensure stdout is treated as a string
        stdout = stdout.toString();

        // Function to remove ANSI escape codes
        const stripAnsi = (str) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

        // Strip ANSI codes for clarity
        const cleanOutput = stripAnsi(stdout);

        // Extract relevant information
        const match = cleanOutput.match(/(\d+\.\d+)\/(\d+\.\d+) MB.*?(\d+\.\d+) MB\/s.*?eta (\d+:\d{2}:\d{2})/);
        if (match) {
            console.log(`Downloaded: ${match[1]} MB of ${match[2]} MB at ${match[3]} MB/s, ETA: ${match[4]}`);
        } else {
            console.log(cleanOutput); // Log original cleaned output if no match
        }
    },
    onStderr: (stderr) => console.log("[stderr]", stderr)
};
// Install required library (e.g., pandas)                                                                                                                                
const install = await sandbox.notebook.execCell(`
%pip install llama_index
%pip install llama-index-multi-modal-llms-anthropic
`, execOptions)     

console.log('install=',install)
console.log("proceeding to 2nd execution");
                                                                                                                                                                        

const execOptions2 = {
    onStdout: (stdout) => console.log("[stdout]", stdout),
    onStderr: (stderr) => console.log("[stderr]", stderr)
};

// Execute Python script that uses pandas                                                                                                                                 
const execution = await sandbox.notebook.execCell(`                                                                                                                       
from llama_index.core import SimpleDirectoryReader
from llama_index.multi_modal_llms.anthropic import AnthropicMultiModal

!wget 'https://raw.githubusercontent.com/run-llama/llama_index/main/docs/docs/examples/data/images/prometheus_paper_card.png' -O 'prometheus_paper_card.png'
from PIL import Image
import matplotlib.pyplot as plt

img = Image.open("prometheus_paper_card.png")
plt.imshow(img)
                                                                                                                                                                                                                                                         
image_documents = SimpleDirectoryReader(
    input_files=["prometheus_paper_card.png"]
).load_data()

# Initiated Anthropic MultiModal class
anthropic_mm_llm = AnthropicMultiModal(
    model="claude-3-haiku-20240307", max_tokens=300
)
`, execOptions2);                                                                                                                                                                        
                                                                                                                                                                        
// console.log('install=', install, 'execution=', execution, 'execution.test=',execution.test)                                                                                                                                               
console.log('execution=',execution)                                                                                                                                               
                                                                                                                                                                        
await sandbox.close()
// import { Sandbox } from 'e2b'

// // 2. Get your Sandbox session
// const sandbox = await Sandbox.create()

// sandbox.process.start(''
// )
// // 3. Close the sandbox once done
// await sandbox.close()

// # Install required libraries                                                                                                                                                                                                                             
// # (already done in the context, but included for completeness)                                                                                                                                                                                           
// %pip install llama-index-readers-file pymupdf                                                                                                                                                                                                            
// %pip install llama-index-vector-stores-postgres                                                                                                                                                                                                          
// %pip install llama-index-embeddings-huggingface                                                                                                                                                                                                          
// %pip install llama-cpp-python psycopg2-binary pgvector asyncpg "sqlalchemy[asyncio]" greenlet    

// # Import libraries                                                                                                                                                                                                                                       
// from llama_index import download_loader, GPTSimpleVectorIndex, LLMPredictor, PromptHelper                                                                                                                                                                
// from llama_cpp import Llama                                                                                                                                                                                                                              
                                                                                                                                                                                                                                                         
// # Download Llama 2 model                                                                                                                                                                                                                                 
// # (replace with your desired model)                                                                                                                                                                                                                      
// model_path = Llama.download_model("decapoda-research/llama-7b-hf")                                                                                                                                                                                       
                                                                                                                                                                                                                                                         
// # Load LLM                                                                                                                                                                                                                                               
// llm_predictor = LLMPredictor(llm=Llama(model_path, n_ctx=512))                                                                                                                                                                                           
                                                                                                                                                                                                                                                         
// # Define prompt helper                                                                                                                                                                                                                                   
// # (adjust parameters as needed)                                                                                                                                                                                                                          
// prompt_helper = PromptHelper(max_input_size=256, num_output=256, max_chunk_overlap=20)                                                                                                                                                                   
                                                                                                                                                                                                                                                         
// # Load data (replace with your data source)                                                                                                                                                                                                              
// PyMuPDFReader = download_loader("PyMuPDFReader")                                                                                                                                                                                                         
// loader = PyMuPDFReader()                                                                                                                                                                                                                                 
// documents = loader.load_data(file_path="./data/llama2.pdf")                                                                                                                                                                                              
                                                                                                                                                                                                                                                         
// # Create RAG index                                                                                                                                                                                                                                       
// index = GPTSimpleVectorIndex(documents, llm_predictor=llm_predictor, prompt_helper=prompt_helper)                                                                                                                                                        
                                                                                                                                                                                                                                                         
// # Query the RAG                                                                                                                                                                                                                                          
// query_engine = index.as_query_engine()                                                                                                                                                                                                                   
// response = query_engine.query("How does Llama 2 perform compared to other open-source models?")                                                                                                                                                          
// print(response)   