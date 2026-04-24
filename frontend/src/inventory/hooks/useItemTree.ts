import { useMemo } from 'react'
import { useItemStore, type Item } from '../store/useItemStore'

export interface ItemTreeNode extends Item {
  children: ItemTreeNode[]
}

export function useItemTree() {
  const { allItems } = useItemStore()

  const sortedAdminItems = useMemo(() => {
    return [...allItems].sort((l, r) => {
      const lg = l.parent_item_name || l.name
      const rg = r.parent_item_name || r.name
      if (lg !== rg) return lg.localeCompare(rg)
      if (l.parent_item_id === null && r.parent_item_id !== null) return -1
      if (l.parent_item_id !== null && r.parent_item_id === null) return 1
      return l.name.localeCompare(r.name)
    })
  }, [allItems])

  const adminTree = useMemo((): ItemTreeNode[] => {
    const map = new Map<number, ItemTreeNode>()
    const roots: ItemTreeNode[] = []
    for (const item of allItems) map.set(item.id, { ...item, children: [] })
    for (const item of allItems) {
      const node = map.get(item.id)
      if (!node) continue
      if (item.parent_item_id && map.has(item.parent_item_id)) {
        map.get(item.parent_item_id)?.children.push(node)
      } else {
        roots.push(node)
      }
    }
    const sort = (nodes: ItemTreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name))
      nodes.forEach((n) => sort(n.children))
    }
    sort(roots)
    return roots
  }, [allItems])

  const parentOptions = useMemo(
    () => allItems.filter((item) => item.parent_item_id === null),
    [allItems],
  )

  const categories = useMemo(
    () => Array.from(new Set(allItems.map((i) => i.category).filter(Boolean))).sort(),
    [allItems],
  )

  return { sortedAdminItems, adminTree, parentOptions, categories }
}
