const vscode = require('vscode');

function activate(context) {
    let disposableOpenWithLiveServer = vscode.commands.registerCommand('myExtension.openWithLiveServer', function () {
        vscode.window.showInformationMessage('Open with Live Server activated!');
    });

    let disposableOpenFile = vscode.commands.registerCommand('myExtension.openFile', function (filePath) {
        const fileUri = vscode.Uri.file(filePath);
        vscode.commands.executeCommand('extension.liveServerPreview.open', fileUri);
    });

    vscode.window.registerUriHandler({
        handleUri(uri) {
            if (uri.path === '/openFile' && uri.scheme === 'myextension') {
                const filePath = uri.query;
                const fileUri = vscode.Uri.file(filePath);
                vscode.commands.executeCommand('extension.liveServerPreview.open', fileUri);
            }
        }
    });

    context.subscriptions.push(disposableOpenWithLiveServer, disposableOpenFile);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};