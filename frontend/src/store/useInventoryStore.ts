/**
 * Facade de compatibilidade — re-exporta dos stores DDD por contexto.
 * Mantido para que imports legados continuem funcionando durante
 * qualquer período de transição.
 */

// Inventory context
export { useItemStore } from '../inventory/store/useItemStore'
export type { Item, ItemStatus, StatusItem } from '../inventory/store/useItemStore'

// Workforce context
export { useEmployeeStore } from '../workforce/store/useEmployeeStore'
export type { Employee } from '../workforce/store/useEmployeeStore'

// Loans context
export { useLoanStore } from '../loans/store/useLoanStore'
export type { TransactionHistory, BatchOperationResult, ScanResponse } from '../loans/store/useLoanStore'

// Projects context
export { useProjectStore } from '../projects/store/useProjectStore'
export type { Project, ProjectLocation, ProjectStatus } from '../projects/store/useProjectStore'

// Re-export combined hook for convenience (merges state from all stores)
import { useItemStore } from '../inventory/store/useItemStore'
import { useEmployeeStore } from '../workforce/store/useEmployeeStore'
import { useLoanStore } from '../loans/store/useLoanStore'
import { useProjectStore } from '../projects/store/useProjectStore'

/**
 * Combined hook — retorna estado de todos os contextos num objeto flat.
 * Use os stores individuais quando possível.
 */
export function useInventoryStore() {
  const item = useItemStore()
  const employee = useEmployeeStore()
  const loan = useLoanStore()
  const project = useProjectStore()

  return {
    // inventory
    allItems: item.allItems,
    statusItems: item.statusItems,
    fetchAllItems: item.fetchAllItems,
    fetchStatusItems: item.fetchStatusItems,
    createItem: item.createItem,
    updateItem: item.updateItem,
    deleteItem: item.deleteItem,

    // workforce
    employees: employee.employees,
    allEmployees: employee.allEmployees,
    fetchEmployees: employee.fetchEmployees,
    fetchAllEmployees: employee.fetchAllEmployees,
    createEmployee: employee.createEmployee,
    updateEmployee: employee.updateEmployee,
    deleteEmployee: employee.deleteEmployee,

    // loans
    transactions: loan.transactions,
    currentItem: loan.currentItem,
    loading: loan.loading,
    fetchTransactions: loan.fetchTransactions,
    scanItem: loan.scanItem,
    checkout: loan.checkout,
    checkin: loan.checkin,
    checkoutContainer: loan.checkoutContainer,
    checkinContainer: loan.checkinContainer,
    clearCurrentItem: loan.clearCurrentItem,

    // projects
    projects: project.projects,
    fetchProjects: project.fetchProjects,
    createProject: project.createProject,
    updateProject: project.updateProject,
    deleteProject: project.deleteProject,
    createLocation: project.createLocation,
    updateLocation: project.updateLocation,
    deleteLocation: project.deleteLocation,

    // admin loading (from any active store)
    adminLoading: item.adminLoading || employee.adminLoading || project.loading,

    // errors
    error: item.error || employee.error || loan.error || project.error,
    authError: item.authError || employee.authError,
    clearError: () => {
      item.clearError()
      employee.clearError()
      loan.clearError()
      project.clearError()
    },

    // auth (managed by App.tsx directly now — stub here for compat)
    isAuthenticated: false,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    login: async (_username: string, _password: string) => false,
    logout: () => {},
  }
}
