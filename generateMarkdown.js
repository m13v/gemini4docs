import fs from 'fs';
import path from 'path';

// Function to generate Markdown content from JSON
function generateMarkdown(json) {
    let markdownContent = "# MongoDB Documentation Links\n\n";
    for (const key in json.links) {
        if (json.links.hasOwnProperty(key)) {
            const link = json.links[key];
            markdownContent += `## [${key}](${key})\n`;
            markdownContent += `**Status:** ${link.status}\n\n`;
            // Check if content exists and is not undefined
            if (link.content) {
                // Split content by new lines and add Markdown formatting
                const contentLines = link.content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                contentLines.forEach(line => {
                    markdownContent += `- ${line}\n`;
                });
            } else {
                markdownContent += `No content available.\n`;
            }
            markdownContent += '\n';
        }
    }
    return markdownContent;
}

// Read the JSON file from a given path
const filename = process.argv[2];
if (!filename) {
    console.error('Please provide a filename as an argument.');
    process.exit(1);
}

fs.readFile(filename, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading the file:', err);
        return;
    }

    const json = JSON.parse(data);
    const markdownContent = generateMarkdown(json);

    // Construct new filename with ".md" extension
    const newFilename = path.join(path.dirname(filename), path.basename(filename, '.json') + '.md');

    // Write the Markdown content to a new file
    fs.writeFile(newFilename, markdownContent, (err) => {
        if (err) {
            console.error('Error writing the Markdown file:', err);
        } else {
            console.log(`Markdown file has been saved as ${newFilename}.`);
        }
    });
});