import blessed from 'blessed';

// Create a screen object.
const screen = blessed.screen({
  smartCSR: true,
  mouse: true // Enable mouse support
});

// Enable mouse events for the screen
screen.enableMouse();

// Create a box with content that can be selected
const box = blessed.box({
  top: 'center',
  left: 'center',
  width: '50%',
  height: '50%',
  content: 'Hello {bold}world{/bold}!',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: '#f0f0f0'
    },
    hover: {
      bg: 'green'
    }
  },
  mouse: true
});

// Append our box to the screen.
screen.append(box);

// Focus our element.
box.focus();

// Function to simulate text selection
function simulateTextSelection(box) {
  let selecting = false;
  let selectionStart = null;
  let selectionEnd = null;

  box.on('mousedown', (data) => {
    selecting = true;
    selectionStart = { x: data.x, y: data.y };
    selectionEnd = { ...selectionStart };
    updateSelectionDisplay();
  });

  box.on('mousemove', (data) => {
    if (selecting) {
      selectionEnd = { x: data.x, y: data.y };
      updateSelectionDisplay();
    }
  });

  box.on('mouseup', () => {
    selecting = false;
  });

  function updateSelectionDisplay() {
    // Logic to highlight text from selectionStart to selectionEnd
    // This is complex as it involves manipulating the content string based on coordinates
  }
}

simulateTextSelection(box);

// Render the screen.
screen.render();

screen.key(['escape'], (ch, key) => {
    return process.exit(0);
  });