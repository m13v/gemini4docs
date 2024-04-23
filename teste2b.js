import { Sandbox } from 'e2b'

// 2. Get your Sandbox session
const sandbox = await Sandbox.create()

sandbox.process.start(''
)
// 3. Close the sandbox once done
await sandbox.close()
