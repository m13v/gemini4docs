const vscode = require('vscode');

function activate(context) {
    let disposable = vscode.commands.registerCommand('simple-extension.helloWorld', function () {
        vscode.window.showInformationMessage('Hello World from Simple Extension!');
    });
    
    let disposableOpenFile = vscode.commands.registerCommand('simple-extension.openFile', function () {
        const predefinedFilePath = '/Users/matthewdi/Desktop/repost_to_linkedin/test.html';
        const fileUri = vscode.Uri.file(predefinedFilePath);
        // Using Live Server Preview to open the file
        vscode.commands.executeCommand('vscode.open', fileUri);
        vscode.commands.executeCommand('extension.liveServerPreview.open', fileUri);
    });

    // // URI handler to open files with Live Server Preview from external URIs
    // vscode.window.registerUriHandler({
    //     handleUri(uri) {
    //         if (uri.path === '/openFile' && uri.scheme === 'myextension') {
    //             const filePath = uri.query;
    //             const fileUri = vscode.Uri.file(filePath);
    //             vscode.commands.executeCommand('extension.liveServerPreview.open', fileUri);
    //         }
    //     }
    // });

    context.subscriptions.push(disposable, disposableOpenFile);
// }
//     context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};