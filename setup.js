import inquirer from 'inquirer';

const questions = [
  {
    type: 'input',
    name: 'username',
    message: 'What is your name?',
  },
  {
    type: 'confirm',
    name: 'confirm',
    message: 'Are you sure?',
  }
];

if (!process.env.SKIP_PROMPT) {
  inquirer.prompt(questions).then(answers => {
    console.log(`Hello, ${answers.username}!`);
  });
} else {
  console.log("Prompt skipped due to SKIP_PROMPT being set.");
}

// import inquirer from 'inquirer';
// console.log('Setting up gemini4docs...');

// inquirer.prompt([
//     {
//         type: 'confirm',
//         name: 'continue',
//         message: 'Do you want to configure the package now?',
//         default: true
//     }
// ]).then(answers => {
//     if (answers.continue) {
//         console.log('Yo, glad you are here! Send me a hi message at i@m13v.com or Discord: matthew.ddy or https://t.me/matthew_ddi');
//         console.log('Basic command to get started is g4d')
//         // Additional setup or configuration tasks here
//     }
// });