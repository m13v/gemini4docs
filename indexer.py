from selenium import webdriver
from selenium.webdriver.common.by import By
import json
import os
from urllib.parse import urlparse
import re  # Import regular expressions for sanitizing the filename
import sys  # Import sys to handle command line arguments
from selenium.common.exceptions import StaleElementReferenceException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

# def get_body_text(driver):
#     """
#     Gets the text content of the page body, excluding the header.
#     """
#     remove_header_script = """
#     var header = document.querySelector('nav.md-header__inner');
#     if (header) {
#         header.parentNode.removeChild(header);
#     }
#     return document.body.innerText;
#     """

#     # Attempt to wait for the header to be present before removing it
#     try:
#         WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "//nav[@class='md-header__inner']")))
#         body_text = driver.execute_script(remove_header_script)
#     except TimeoutException:
#         print("Header not found or took too long to load. Skipping header removal.")
#         body_text = driver.execute_script("return document.body.innerText")

#     return body_text

def save_todo_links(todo_links, filename, total_words, total_links):
    sanitized_filename = re.sub(r'\W+', '_', filename) + '.json'
    with open(sanitized_filename, 'w', encoding='utf-8') as file:
        json.dump({"total_words": total_words, "total_links": total_links, "links": todo_links}, file, ensure_ascii=False, indent=4)
    return sanitized_filename  # Return the path of the saved file

def index_link(driver, url, all_links, done_links_count):
    driver.get(url)
    all_text = driver.execute_script("return document.documentElement.innerText")
    # all_text = get_body_text(driver)
    words = all_text.split()
    word_count = len(words)
    attempt = 0
    max_attempts = 3

    while attempt < max_attempts:
        try:
            links_elements = driver.find_elements(By.TAG_NAME, 'a')
            for link in links_elements:
                href = link.get_attribute('href')
                if href and href.startswith(url):
                    if href not in all_links:
                        all_links.add(href)
                        # Update the counter on the same line with the total number of unique links
                        sys.stdout.write(f"{done_links_count} / {len(all_links)} links processed")
                        sys.stdout.flush()
            break  # Exit loop if successful
        except StaleElementReferenceException:
            attempt += 1
            if attempt == max_attempts:
                print("\nFailed to retrieve links after several attempts.")
    
    if len(all_text) < 100:
        status = 'Seems like it failed'
    else:
        status = 'Looks good'
    return all_links, all_text, status, word_count

def main():
    options = webdriver.ChromeOptions()
    options.add_argument('--headless=new')
    driver = webdriver.Chrome(options=options)
    base_url = sys.argv[1] if len(sys.argv) > 1 else "https://docs.llamaindex.ai/en/stable/"
    todo_links = {base_url: {"status": "not_indexed", "word_count": 0}}
    all_links = set()  # Set to store all unique links found
    total_words = 0
    done_links_count = 0  # Initialize counter for 'Looks good' links

    try:
        while any(link for link, status in todo_links.items() if status["status"] == "not_indexed"):
            for url, info in list(todo_links.items()):
                if info["status"] == "not_indexed":
                    # print(f"Indexing: {url}")
                    all_links, content, status, word_count = index_link(driver, url, all_links, done_links_count)
                    total_words += word_count
                    if status == 'Looks good':
                        done_links_count += 1  # Increment count for good links
                        print(f"{done_links_count} / {len(all_links)} links processed")
                    if status == 'Seems like it failed':
                        print(f"Failed to index {url}. Exiting...")
                        print(f"Content: {content}")
                        return  # Exit the function early
                    for link in all_links:
                        if link not in todo_links:
                            todo_links[link] = {"status": "not_indexed", "word_count": 0}                    
                    todo_links[url] = {"status": status, "content": content, "word_count": word_count}
                    filename = save_todo_links(todo_links, base_url, total_words, len(all_links))  # Save progress, using base_url as part of the filename
        print(f"\nIndexing complete. Total links: {len(all_links)}, Total words: {total_words}")
        print(f"File name: {filename}")  # Print the path of the saved JSON file
    finally:
        driver.quit()

if __name__ == "__main__":
    main()