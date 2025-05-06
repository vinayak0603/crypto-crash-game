import { useState } from 'react'
import CrashGame from './components/CrashGame';


function App() {
  const [count, setCount] = useState(0)

  return (
<>
<CrashGame />
</>
  )
}

export default App
