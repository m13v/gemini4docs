import { CodeInterpreter } from '@e2b/code-interpreter'

const sandbox = await CodeInterpreter.create()
await sandbox.notebook.execCell('x = 1')

const execution = await sandbox.notebook.execCell('x+=1; x')
console.log(execution.text)  // outputs 2

await sandbox.close()
// import { Sandbox } from 'e2b'

// // 2. Get your Sandbox session
// const sandbox = await Sandbox.create()

// sandbox.process.start(''
// )
// // 3. Close the sandbox once done
// await sandbox.close()
