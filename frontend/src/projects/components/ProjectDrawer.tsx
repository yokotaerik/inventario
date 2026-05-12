import { Package } from 'lucide-react'
import Drawer from '../../shared/components/Drawer'
import ProjectForm from './ProjectForm'
import AnyDeskTable from './AnyDeskTable'
import { useProjectStore, type Project } from '../store/useProjectStore'
import { useStockStore } from '../../stock/store/useStockStore'

const statusLabelMap = {
  active: 'Ativo',
  inactive: 'Inativo',
  completed: 'Concluído',
} as const

interface ProjectDrawerProps {
  project: Project | null
  onClose: () => void
}

export default function ProjectDrawer({ project, onClose }: ProjectDrawerProps) {
  const { deleteProject } = useProjectStore()

  const { stockItems } = useStockStore()
  const projectItems = project ? stockItems.filter(i => i.project_id === project.id) : []



  const handleDeleteProject = async () => {
    if (!project) return
    if (!window.confirm(`Excluir o projeto "${project.name}"?`)) return
    const success = await deleteProject(project.id)
    if (success) onClose()
  }



  return (
    <Drawer open={Boolean(project)} onClose={onClose} title={project?.name ?? ''} width="520px">
      {project && (
        <div className="item-drawer-content">
          {/* Meta */}
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Código</span>
            <code className="drawer-meta-code">{project.code}</code>
          </div>
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Status</span>
            <span className={`badge badge-project-${project.status}`}>
              {statusLabelMap[project.status]}
            </span>
          </div>
          {project.description && (
            <div className="drawer-meta-row">
              <span className="drawer-meta-label">Descrição</span>
              <span className="drawer-meta-value">{project.description}</span>
            </div>
          )}
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Estoque alocado</span>
            <span className="drawer-meta-value">
              <Package size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
              {project.stock_count}
            </span>
          </div>

          <hr className="drawer-divider" />

          {/* Edit form */}
          <div className="drawer-section">
            <h3 className="drawer-section-title">Editar Projeto</h3>
            <ProjectForm
              mode="edit"
              project={project}
              onSuccess={onClose}
              onCancel={onClose}
            />
          </div>

          <hr className="drawer-divider" />

          {/* Items allocated */}
          <div className="drawer-section">
            <h3 className="drawer-section-title">
              <Package size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
              Estoque do Projeto ({projectItems.length})
            </h3>
            {projectItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12 }}>
                {projectItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', padding: '6px 10px', backgroundColor: 'var(--bg-elevated)', borderRadius: 6, gap: 8 }}>
                    <Package size={14} className="text-muted" />
                    <span style={{ flex: 1 }}>{item.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Qtd: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state" style={{ padding: '8px 0', fontSize: '0.85rem' }}>
                Nenhum item alocado para este projeto.
              </p>
            )}
          </div>

          {/* AnyDesk */}
          <hr className="drawer-divider" />
          <AnyDeskTable projectId={project.id} />

          {/* Danger zone */}
          <hr className="drawer-divider" />
          <div className="drawer-section">
            <button type="button" className="btn btn-danger btn-sm" onClick={handleDeleteProject}>
              Excluir projeto
            </button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
