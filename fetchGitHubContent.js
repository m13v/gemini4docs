import fetch from 'node-fetch';
import url from 'url';

async function fetchGitHubContent(githubUrl) {
  // Parse the GitHub URL
  const parsedUrl = url.parse(githubUrl);
  const pathSegments = parsedUrl.pathname.split('/').filter(segment => segment !== '');

  // Extract the necessary components from the URL
  const owner = pathSegments[0];
  const repo = pathSegments[1];
  const branch = pathSegments[3] || 'main'; // Default to 'main' branch if not specified
  const path = pathSegments.slice(4).join('/');

  // Construct the GitHub API URL
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

  // Make the API request
  const response = await fetch(apiUrl);
  const data = await response.json();

  // Check if the 'content' property exists
  if (data.content) {
    // Decode the base64-encoded content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return content;
  } else {
    throw new Error('Content not found in the API response');
  }
}
export { fetchGitHubContent };
