import { useCallback, useRef, useState } from 'react'

const PULL_TRIGGER = 72
const PULL_MAX = 120

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
}

export function usePullToRefresh({ onRefresh }: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const pullStartYRef = useRef<number | null>(null)

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length !== 1 || window.scrollY > 0 || isRefreshing) return
      pullStartYRef.current = e.touches[0].clientY
      setIsPulling(true)
    },
    [isRefreshing],
  )

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const startY = pullStartYRef.current
    if (startY === null) return
    const delta = e.touches[0].clientY - startY
    if (delta <= 0) {
      setPullDistance(0)
      return
    }
    e.preventDefault()
    setPullDistance(Math.min(PULL_MAX, delta * 0.45))
  }, [])

  const runRefresh = useCallback(async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing, onRefresh])

  const releasePull = useCallback(() => {
    if (pullStartYRef.current === null) return
    const shouldRefresh = pullDistance >= PULL_TRIGGER
    pullStartYRef.current = null
    setIsPulling(false)
    setPullDistance(0)
    if (shouldRefresh) void runRefresh()
  }, [pullDistance, runRefresh])

  const pullIndicatorVisible = isPulling || isRefreshing
  const pullIndicatorOffset = isRefreshing ? 10 : Math.min(pullDistance - 62, 10)
  const isReady = pullDistance >= PULL_TRIGGER

  return {
    pullDistance,
    isPulling,
    isRefreshing,
    pullIndicatorVisible,
    pullIndicatorOffset,
    isReady,
    handleTouchStart,
    handleTouchMove,
    releasePull,
    runRefresh,
    PULL_TRIGGER,
  }
}
