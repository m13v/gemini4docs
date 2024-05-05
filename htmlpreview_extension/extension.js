import * as vscode from 'vscode';

function activate(context) {
    let disposable = vscode.commands.registerCommand('myExtension.openWithLiveServer', function () {
      // Command implementation
      vscode.window.showInformationMessage('Open with Live Server activated!');
    });
  
    context.subscriptions.push(disposable);
  }
  
  function deactivate() {}
  
  module.exports = {
    activate,
    deactivate
  }

// export function activate(context) {
//     // Existing code...

//     // Register a URI handler
//     vscode.window.registerUriHandler({
//         handleUri(uri) {
//             if (uri.path === '/openFile' && uri.scheme === 'myextension') {
//                 const filePath = uri.query;
//                 const fileUri = vscode.Uri.file(filePath);
//                 vscode.commands.executeCommand('extension.liveServerPreview.open', fileUri);
//             }
//         }
//     });

//     // Your existing disposable registrations...
// }

// export function deactivate() {
//     // Clean up if necessary
// }