import re
import json

def is_code_snippet(text):
    # Patterns that might indicate code
    patterns = [
        r'\bdef\b|\bclass\b|\bimport\b',  # Python
        r'\bpublic\b|\bclass\b|\bstatic\b',  # Java/C#
        r'\bint\b|\breturn\b|\bvoid\b',  # C/C++
        r'[{;}]',  # Common in C, C++, Java, C#
        r'->',  # Common in C++ and Python lambdas
        r'\bif\b|\belse\b|\bfor\b|\bwhile\b',  # Common keywords in many languages
        r'console\.log\(',  # JavaScript
        r'print\(',  # Python
        r'echo\b',  # PHP
        r'pip install \S+',  # Python package installation
        r'npm install \S+',  # JavaScript package installation
        r'conda install \S+',  # Conda package installation, common in Jupyter environments
    ]
    combined_pattern = '|'.join(patterns)
    snippets = []
    
    data = json.loads(text)
    content = data['links']['https://docs.llamaindex.ai/en/stable/']['content']

    # Find all matches
    matches = list(re.finditer(combined_pattern, content))
    for i, match in enumerate(matches):
        start = match.start()
        end = match.end()
        if i == 0:
            text_before = content[:start]  # From start of content to first snippet
        else:
            text_before = content[matches[i-1].end():start]  # From end of last snippet to start of current snippet

        if i == len(matches) - 1:
            text_after = content[end:]  # From end of last snippet to end of content
        else:
            text_after = content[end:matches[i+1].start()]  # From end of current snippet to start of next snippet

        snippet = content[start:end]
        snippets.append({'snippet': snippet, 'text_before': text_before, 'text_after': text_after})

    return snippets

def load_file_content(filename):
    try:
        with open(filename, 'r') as file:
            content = file.read()
            return content
    except FileNotFoundError:
        return "The file was not found."
    except Exception as e:
        return f"An error occurred: {e}"

def extract_and_save_snippets(filename, output_filename):
    content = load_file_content(filename)
    if isinstance(content, str):
        snippets = is_code_snippet(content)
        data = {'snippets': snippets}
        with open(output_filename, 'w') as json_file:
            json.dump(data, json_file, indent=4)
    else:
        print(content)

# Usage
extract_and_save_snippets('./llamaindexEnStable', 'code_snippets.json')