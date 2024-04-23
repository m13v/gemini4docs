from selenium import webdriver
from selenium.webdriver.common.by import By
import json
import os
from urllib.parse import urlparse

def save_todo_links(todo_links, file_path='todo_links.json'):
    with open(file_path, 'w', encoding='utf-8') as file:
        json.dump(todo_links, file, ensure_ascii=False, indent=4)

def load_todo_links(file_path='todo_links.json'):
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    else:
        return {}

def crawl_link(driver, url):
    driver.get(url)
    all_text = driver.execute_script("return document.documentElement.innerText")
    links_elements = driver.find_elements(By.TAG_NAME, 'a')
    links = set(link.get_attribute('href') for link in links_elements if link.get_attribute('href') and 'selenium.dev' in urlparse(link.get_attribute('href')).netloc)
    return links, all_text

def main():
    options = webdriver.ChromeOptions()
    options.add_argument('--headless=new')
    driver = webdriver.Chrome(options=options)

    todo_links = load_todo_links()
    if not todo_links:  # If starting fresh, add the root URL
        todo_links = {"https://www.selenium.dev/documentation/": {"status": "not_crawled"}}

    try:
        while any(link for link, status in todo_links.items() if status["status"] == "not_crawled"):
            for url, info in list(todo_links.items()):  # Use list to copy dict items for safe iteration
                if info["status"] == "not_crawled":
                    print(f"Crawling: {url}")
                    new_links, content = crawl_link(driver, url)
                    for link in new_links:
                        if link not in todo_links:
                            todo_links[link] = {"status": "not_crawled"}
                    todo_links[url] = {"status": "done", "content": content}
                    save_todo_links(todo_links)  # Save progress
    finally:
        driver.quit()

if __name__ == "__main__":
    main()