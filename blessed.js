import blessed from 'blessed';

const screen = blessed.screen({
  smartCSR: true,
  mouse: true,  // Enable mouse events
});

screen.title = 'Gemini4Docs';

const logBox = blessed.box({
  top: 'top',
  left: 'left',
  width: '100%',
  height: '15%',
  content: 'Logs will appear here',
  tags: true,
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    ch: ' ',
    inverse: true
  },
  mouse: true,  // Enable mouse support
  keys: true,  // Enable keyboard support for scrolling
  vi: true,  // Enable vi-like keys for scrolling
  border: {
    type: 'line'
  },
  style: {
    border: {
      fg: 'black'
    },
    scrollbar: {
      bg: 'white'
    }
  }
});

const chatBox = blessed.box({
  top: '15%',
  left: 'left',
  width: '100%',
  height: '70%',
  content: '',
  tags: true,
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    ch: ' ',  // The character to use for the scrollbar.
    track: {
      bg: 'grey',  // Background color of the track
    },
    style: {
      inverse: true  // Inverse the colors for the scrollbar
    },
  },
  mouse: true,  // Enable mouse support
  keys: true,  // Enable keyboard support for scrolling
  vi: true,  // Enable vi-like keys for scrolling
  border: {
    type: 'line'
  },
  style: {
    border: {
      fg: 'black'
    },
    scrollbar: {
      bg: 'white'
    }
  }
});

const inputTitle = blessed.box({
  top: '85%',
  left: 'left',
  width: '100%',
  height: '5%',
  content: '(Press escape twice to exit) (Use mouse to scroll):',
  tags: true,
  style: {
    border: {
      fg: 'black'
    },
    scrollbar: {
      bg: 'white'
    }
  }
});
// Create an input box
const inputBox = blessed.textbox({
  bottom: 0,
  height: '15%',
  width: '100%',
  inputOnFocus: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    border: {
      fg: '#f0f0f0'
    }
  }
});


// Append boxes to the screen.
screen.append(logBox);
screen.append(chatBox);
screen.append(inputTitle);
screen.append(inputBox);


// Allow input handling
function getUserInput(prompt) {
  return new Promise((resolve) => {
      // Display prompt in chatBox or directly in inputBox as placeholder
      // inputBox.setValue('');
      inputBox.setLabel(` ${prompt} `);
      inputBox.focus();

      // Event listener for submitting the input
      inputBox.once('submit', (data) => {
          // Clear the input box after submission
          inputBox.clearValue();
          inputBox.setLabel('');  // Clear the label

          // Append new user input to existing content in chatBox
          chatBox.setContent(`${chatBox.getContent()}\nYou: ${data}\n`);
          chatBox.setScrollPerc(100);  // Auto-scroll to the bottom

          // Refresh the screen to show changes
          screen.render();

          // Resolve the promise with the input data
          resolve(data.trim());
      });

      screen.render();  // Ensure the screen is updated to show the input box focused
  });
}

// Exiting the application
screen.key(['escape'], (ch, key) => {
  return process.exit(0);
});

inputBox.focus();

screen.render();

// Render the screen.
function displayLogMessage(message) {
  logBox.setContent(`${logBox.getContent()}\n${message}`);
  logBox.setScrollPerc(100);  // Auto-scroll to the bottom
  screen.render();
}

// Function to display messages in the chatBox
function displayChatMessage(message) {
  chatBox.setContent(`${chatBox.getContent()}\n${message}`);
  chatBox.setScrollPerc(100);  // Auto-scroll to the bottom
  screen.render();
}

function reprintChatMessage(message) {
  chatBox.setContent(message);
  chatBox.setScrollPerc(100);  // Auto-scroll to the bottom
  screen.render();
}

// Export the functions
export { getUserInput, displayLogMessage, displayChatMessage, reprintChatMessage, screen, logBox, chatBox, inputBox };