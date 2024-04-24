const inquirer = require('inquirer');

console.log('Setting up [Your Package Name]...');

inquirer.prompt([
    {
        type: 'confirm',
        name: 'continue',
        message: 'Do you want to configure the package now?',
        default: true
    }
]).then(answers => {
    if (answers.continue) {
        console.log('Yo, glad you are here! Send me a hi message at i@m13v.com or Discord: matthew.ddy or https://t.me/matthew_ddi');
        console.log('Basic command to get started is g4d')
        // Additional setup or configuration tasks here
    }
});