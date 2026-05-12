import fs from 'fs'
import path from 'path'
import ClientCommunicationStandard from './ClientCommunicationStandard'

export default function Page() {
  const docPath = path.join(process.cwd(), 'DOCUMENTATIONS', 'CLIENTSCOMMUNICATION.MD')
  let docText = ''

  try {
    docText = fs.readFileSync(docPath, 'utf-8')
  } catch {
    docText = 'Documentation not found.'
  }

  return <ClientCommunicationStandard docText={docText} />
}
