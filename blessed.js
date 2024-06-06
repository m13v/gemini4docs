import blessed from 'blessed';

const screen = blessed.screen({
  smartCSR: true,
  mouse: false,  // Enable mouse events
});

screen.title = 'Gemini4Docs';
// screen.enableMouse();

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
    ch: ' ',  // The character to use for the scrollbar.
    track: {
      bg: 'grey',  // Background color of the track
    },
    style: {
      inverse: true  // Inverse the colors for the scrollbar
    },
  },
  // mouse: true,  // Enable mouse support
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
  height: '68%',
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
  // mouse: true,  // Enable mouse support
  keys: true,  // Enable keyboard support for scrolling
  vi: true,  // Enable vi-like keys for scrolling
  style: {
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
  content: '(Press escape twice to exit) (Use mouse or arrow buttons "up" and "down" to scroll):',
  tags: true,
  style: {
    border: {
      fg: 'black'
    },
    scrollbar: {
      bg: 'white'
    },
    bg: 'black'  // Set background color to black
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

let currentFocusedElement;

inputBox.on('focus', () => {
  currentFocusedElement = inputBox;
});

chatBox.on('focus', () => {
  currentFocusedElement = chatBox;
});

logBox.on('focus', () => {
  currentFocusedElement = logBox;
});
// Allow input handling
let isInputActive = false; // Flag to control the input activity

function getUserInput(prompt) {
  if (isInputActive) {
    // Clear existing input listener and reset the input box
    inputBox.removeListener('submit');
  }

  isInputActive = true; // Set the flag when input starts

  return new Promise((resolve) => {
    inputBox.setLabel(` ${prompt} `);

    if (currentFocusedElement !== inputBox) {
      inputBox.focus(); // Only focus if it's not already focused
    }

    inputBox.once('submit', (data) => {
      inputBox.clearValue();
      inputBox.setLabel(''); // Clear the label

      chatBox.setContent(`${chatBox.getContent()}\nYou: ${data}\n`);
      chatBox.setScrollPerc(100); // Auto-scroll to the bottom

      screen.render(); // Refresh the screen to show changes

      isInputActive = false; // Reset the flag when input is submitted
      resolve(data.trim());
    });

    screen.render(); // Ensure the screen is updated to show the input box focused
  });
}

inputBox.key(['down'], () => {
  // Refocus the logBox every time the down key is pressed
  if (screen.focused !== chatBox) {
    chatBox.focus();
  }
  chatBox.scroll(1);
  screen.render();
});

// Similarly, you can ensure focus for other keys and elements
inputBox.key(['up'], () => {
  if (screen.focused !== chatBox) {
    chatBox.focus();
  }
  chatBox.scroll(-1);
  screen.render();
});


screen.key(['tab'], () => {
  // Toggle focus between logBox and chatBox
  if (screen.focused === logBox) {
    chatBox.focus();
  } else {
    logBox.focus();
  }
  screen.render();
});
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