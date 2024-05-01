import fetch from 'node-fetch';

// URL of your Cloudflare Worker
const workerUrl = 'https://worker-aged-night-839d.i-f9f.workers.dev';

// Function to perform a search query using the worker
async function searchQuery(query) {
    try {
        const response = await fetch(workerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'search', query: query })
        });
        const data = await response.json();
        console.log('Search Results:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error performing search:', error);
    }
}

// Example search query
const query = "JavaScript";
searchQuery(query);