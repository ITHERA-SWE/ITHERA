import type { Group } from '../../types/groups'
import { CollaborationView } from '../../components/collaboration/CollaborationView'
import { useProposalWorkspace } from '../../components/collaboration/useProposalWorkspace'
export interface ComparisonPageProps {
  onBack: () => void
  group: Group | null
  mode?: 'compare' | 'decisions'
}
function Workspace({ onBack, group, mode = 'compare' }: ComparisonPageProps) {
  const data = useProposalWorkspace(group)
  return <CollaborationView data={data} mode={mode} onBack={onBack} />
}
export function ComparisonPage(props: ComparisonPageProps) {
  return (
    <Workspace
      key={`${props.group?.id ?? 'none'}:${props.mode ?? 'compare'}`}
      {...props}
    />
  )
}
