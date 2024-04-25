import json

# Load the JSON data from the file
with open('https_docs_llamaindex_ai_en_stable_module_guides_loading_documents_and_nodes_.json', 'r', encoding='utf-8') as file:
    docs = json.load(file)

# Print the structure of the loaded JSON to understand its format
print("Structure of loaded JSON:", json.dumps(docs, indent=4))

def filter_content(data):
    filtered_data = {}
    total_word_count = 0  # Initialize total word count
    ignore_phrases = ["Skip to content", "Initializing search", "LlamaIndex", "Home", "Starter Tools", "RAG CLI"]
    key_sections = ["Usage Pattern", "Cost Analysis", "Q&A patterns", "Structured Data"]
    seen_lines = set()  # Initialize seen lines set outside the URL loop to track duplicates globally

    for url, content_dict in data.items():
        # Ensure content_dict is a dictionary
        if not isinstance(content_dict, dict):
            print(f"Error: Expected a dictionary for URL {url}, but got {type(content_dict).__name__}")
            continue

        # Check if 'content' key exists
        if 'content' not in content_dict:
            print(f"Warning: No content found for URL {url}")
            continue  # Skip this URL and continue with the next one

        lines = content_dict['content'].split('\n')
        relevant_lines = []
        capture = False
        for line in lines:
            clean_line = line.strip()
            if any(section in clean_line for section in key_sections):
                capture = True
            if capture:
                if clean_line and not any(phrase in clean_line for phrase in ignore_phrases):
                    if clean_line not in seen_lines:
                        seen_lines.add(clean_line)
                        relevant_lines.append(clean_line)
            if clean_line == "":
                capture = False  # Reset on empty lines or detect end of section

        filtered_content = ' '.join(relevant_lines)
        filtered_data[url] = filtered_content
        total_word_count += len(filtered_content.split())  # Count words and add to total

    print(f"Total word count: {total_word_count}")  # Print total word count
    return filtered_data

# Filter the loaded documents
filtered_docs = filter_content(docs)
print(json.dumps(filtered_docs, indent=4))