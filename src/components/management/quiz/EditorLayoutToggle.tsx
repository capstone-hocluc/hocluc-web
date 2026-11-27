import Button from '../../console/button'
import { Maximize2, Minimize2 } from '../../console/icons'
import { useEditorLayout } from './editor-layout'

/** Switches every editor between the AI assistant's whole-window frame and a card inside the console. */
export default function EditorLayoutToggle() {
  const [layout, setLayout] = useEditorLayout()
  const workspace = layout === 'workspace'
  const label = workspace ? 'Thu về trong console' : 'Mở toàn màn hình'
  return (
    <Button appearance="ghost" aria-label={label} title={label} onClick={() => setLayout(workspace ? 'console' : 'workspace')}>
      {workspace ? <Minimize2 size={15} aria-hidden /> : <Maximize2 size={15} aria-hidden />}
    </Button>
  )
}
